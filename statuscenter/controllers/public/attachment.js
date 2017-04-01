/**
 * @controller - 附件管理
 */

var router = require('../../libs/Router.js')();
var busboyParser = require('co-busboy');
var commonError = require('../../libs/error.js');
var config = require('../../config.js');
var uuid = require('node-uuid');
var Attachment = require('../../models/sys/attachment.js');
var fs = require('fs-extra');
var path = require('path');
var dateFormat = require('dateformat');
const urlencode = require('urlencode');
const ResumeDownload = require('koa-resume-download').Download;
const downloadType = require('../../libs/enum.js').downloadType,
    gm = require('co-gm'),
    ffmpeg = require('fluent-ffmpeg');

// 如果没有指定文件上传路径，则把文件存放在系统根目录下的 uploads 文件夹
var uploadPath = config.uploadPath || path.join(__dirname, '../../../uploads');
!fs.existsSync(uploadPath) && fs.mkdirSync(uploadPath);
var tmpDir = path.join(uploadPath, 'tmp');
!fs.existsSync(tmpDir) && fs.mkdirSync(tmpDir);

/**
 * @action download - 文件下载
 * @author 陈睿
 * @method get
 * @param {int} id - 要下载的附件 id
 * @param {int} [type] - 类型（0源文件，1缩略文件，默认0）
 * @param {int} [width] - 缩略图宽度 默认300
 * @param {int} [height] - 缩略图高度 默认300
 * @return {stream} - 返回的文件流
 */
router.get('download', function*(ctx, req, next) {
    const MAX_WIDTH = 300,
        MAX_HEIGHT = 300,
        THUMBNAIL_PATH = '_thumbnail',
        DEFAULT_MIMETYPE = 'image/jpeg';

    let query = ctx.query;
    let id = query.id;
    let type = ~~query.type;
    let thumbnailWidth = query.width ? ~~query.width : MAX_WIDTH; //缩略长度
    let thumbnailHeight = query.height ? ~~query.height : MAX_HEIGHT; //缩略长度
    //缩略文件
    let thumbnailExt = `${THUMBNAIL_PATH}_${thumbnailWidth}x${thumbnailHeight}.png`;//避免背景丢失

    // 验证参数必须为数字
    if (!/^\d+$/.test(id)) throw new commonError.ParameterError();
    let dbAttachment = yield Attachment.findOne({ _id: ~~id });
    if (!dbAttachment) throw new commonError.FileNoFindError();

    let month = dbAttachment.uploadTime.toISOString().substr(0, 7);
    let dirPath = path.join(uploadPath, dbAttachment.moduleName, month); //文件夹地址
    let filePath = path.join(dirPath, dbAttachment.serverName); //源文件路径

    //返回流方法
    let returnResource = function*(ctx, filePath, name, mimeType) {
        let opts = {
            headers: {
                'Content-disposition': 'attachment; filename=' + urlencode(name),
                'Content-type': mimeType
            }
        };

        let download = new ResumeDownload(ctx, opts);
        yield download.start(filePath);
    };

    //图片大小计算 width height为源size
    let overwriteSize = function(width, height, maxWidth, maxHeight) {
        let size = {
            width: 0,
            height: 0
        };

        let widthScale = (width / maxWidth);
        let heightScale = (height / maxHeight);

        if (widthScale == heightScale) { //缩放比例相同
            size.width = maxWidth / widthScale;
            size.height = maxHeight / widthScale;

        } else if (widthScale > heightScale) { //
            size.width = maxWidth;
            size.height = height / widthScale;

        } else {
            size.width = width / heightScale;
            size.height = maxHeight;
        }
        // console.log(size);
        return size;
    };

    //重写图片 只缩小不放大
    let overwriteImage = function*(oldPath, newPath, maxWidth, maxHeight) {
        //生成缩略图
        let readStream = fs.createReadStream(oldPath);
        let gmStream = gm(readStream);

        let size = yield gmStream.size({ bufferStream: true });

        if (maxWidth < size.width || maxHeight < size.height) { //高或宽超出限定值 重绘
            //最后生成图片的宽高
            let overwrite = overwriteSize(size.width, size.height, maxWidth, maxHeight);
            //生成图片
            gmStream.resize(overwrite.width, overwrite.height);
            yield gmStream.write(newPath);
        } else {
            fs.copySync(oldPath, newPath);
        }
    };

    if (fs.existsSync(filePath)) {
        let fileMimeType = dbAttachment.mimeType;
        if (type == downloadType.source) { //源文件
            //直接返回源文件流
            yield returnResource(ctx, filePath, dbAttachment.originalName, fileMimeType);

        } else if (type == downloadType.thumbnail) { //图片或视频
            //缩略文件名称
            let thumbnailFileName = dbAttachment.serverName + thumbnailExt;
            //缩略文件文件夹
            let thumbnailDirPath = path.join(dirPath, 'thumbnail');
            if (!fs.existsSync(thumbnailDirPath)) {
                fs.mkdirSync(thumbnailDirPath);
            }

            //缩略文件路径
            let thumbnailFilePath = path.join(thumbnailDirPath, thumbnailFileName);

            if (new RegExp("image/*").test(fileMimeType)) { //图片 mimeType image/*
                //缩略图不存在
                if (!fs.existsSync(thumbnailFilePath)) {
                    yield overwriteImage(filePath, thumbnailFilePath, thumbnailWidth, thumbnailHeight);
                }
                //返回缩略图流
                yield returnResource(ctx, thumbnailFilePath, dbAttachment.originalName, fileMimeType);

            } else if (new RegExp("video/*").test(fileMimeType)) { //视频  mimeType video/*  
                //缩略图不存在
                if (!fs.existsSync(thumbnailFilePath)) {
                    //视频原图
                    let videoName = `${dbAttachment.serverName}.png`;
                    let thumbnailVideoPath = path.join(thumbnailDirPath, videoName);
                    //视频原图不存在
                    if (!fs.existsSync(thumbnailVideoPath)) {
                        console.log('thumbnailVideoPath not exist', thumbnailVideoPath);
                        //模拟同步ffmpeg方法
                        let doFfmpeg = function(done) {
                            ffmpeg(filePath)
                                .on('end', function() {
                                    done(null, null);
                                })
                                .screenshots({
                                    timestamps: ['00:01'],
                                    filename: videoName,
                                    folder: thumbnailDirPath
                                });
                        };
                        yield doFfmpeg; //生成视频缩略图
                    }
                    yield overwriteImage(thumbnailVideoPath, thumbnailFilePath, thumbnailWidth, thumbnailHeight);
                }
                //返回缩略图流
                yield returnResource(ctx, thumbnailFilePath, thumbnailFileName, DEFAULT_MIMETYPE);

            } else {
               // throw new commonError.ParameterError(null, null, '仅支持图片和视频的缩略图');
                throw new commonError.FileNoFindError('Thumbnail images and videos only',516002);
            }
        }
    }
});



/**
 * @action upload - 图片/小视频上传
 * @author 陈志国
 * @method post
 * @param {string} [module] - 文件所述模块, 默认：module=socialFiles
 * @param {file[]} files - 上传的文件，多个
 * @return {string} - 以逗号分割的附件ID, 例如：1,2,3
 */
router.post('upload', function*(ctx, req, res) {

    if (!this.request.is('multipart/*')) throw new commonError.ContentTypeNotCorrect();
    let textParam = {},
        streams = [],
        parts = busboyParser(this),
        user = ctx.state.user,
        files = [],
        part, ids = [];
    while (part = yield parts) {
        if (part.length) {
            // arrays are busboy fields 
            textParam[part[0]] = part[1];
        } else {
            // otherwise, it's a stream
            // 先将文件存储为 临时文件
            let filetmpPath = path.join(tmpDir, uuid.v1());
            files.push({
                tmpPath: filetmpPath,
                mimeType: part.mimeType,
                size: part._readableState.length,
                originalName: part.filename
            });

            part.pipe(fs.createWriteStream(filetmpPath));
        }
    }

    textParam.module = textParam.module || 'socialFiles';
    if (!textParam.module) {
        // 删除临时文件，并抛出错误
        files.forEach((f) => {
            fs.unlinkSync(f.tmpPath);
        });
        //this.errorResponse(516004,'文件上传必须指定模块','文件上传必须指定模块');
        throw new commonError.FileNoFindError('File upload must specify module',516004);
    }
    for (let i = 0; i < files.length; i++) {
        let file = files[i],
            now = new Date(),
            currMonth = now.toISOString().substr(0, 7);
        let entity = new Attachment({
            moduleName: textParam.module,
            originalName: file.originalName,
            serverName: uuid.v1(),
            length: file.size,
            mimeType: file.mimeType,
            uploaderId: user.id,
            uploaderName: user.name,
            uploadTime: now
        });

        let dbEntity = yield entity.save();
        ids.push(entity._id); // 将id返回给前端

        let modulePath = path.join(uploadPath, textParam.module);
        let moduleMonthPath = path.join(modulePath, currMonth);
        let newFilePath = path.join(moduleMonthPath, entity.serverName);

        // 判断上述两个目录是否存在
        !fs.existsSync(modulePath) && fs.mkdirSync(modulePath);
        !fs.existsSync(moduleMonthPath) && fs.mkdirSync(moduleMonthPath);

        // 将文件移动到正式目录
        fs.renameSync(file.tmpPath, newFilePath);
    }

    this.body = ids.join(',');

});

module.exports = router.actions;
