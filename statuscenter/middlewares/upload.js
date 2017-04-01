const meter = require('stream-meter');
let busboyParser = require('co-busboy');
let uuid = require('node-uuid');
let path = require('path');
let fs = require('fs');
let config = require('../config.js');
let Attachment = require('../models/sys/attachment.js');
var uploadPath = config.uploadPath || path.join(__dirname, config.filesUrl);
!fs.existsSync(uploadPath) && fs.mkdirSync(uploadPath);

module.exports = function*(next) {
    if (('POST' == this.method) && (this.url == '/public/attachment/upload')) return yield next;
    if (!this.request.is('multipart/*')) return yield next;

    let ctx = this;
    var urlReg = /\/(\w*\/\w*)\/(\w*)/;
    let match = urlReg.exec(this.path),
        module = match[1], // sys
        controller = match[2],
        action = match[3]; //read
    ctx.request.module = module;
    ctx.request.controller = controller;
    ctx.request.action = action;

    //等待stream执行结束
    let wait = function*(stream) {
        let end = function(cb) {
            stream.on('end', cb);
            stream.on('finish', cb);
        };
        yield end;
    };

    let parts = busboyParser(this),
        files = {},
        part, body = {};
    while (part = yield parts) {
        if (part.length) {
            body[part[0]] = part[1];
            continue;
        }

        let originalName = part.filename,
            fieldName = part.fieldname,
            serverName = uuid.v1(),
            now = new Date(),
            currMonth = now.toISOString().substr(0, 7);

        // 保存到数据库
        let entity = new Attachment({
            moduleName: module,
            originalName: originalName,
            serverName: serverName,
            // length: part._readableState.length,//文件大小错误
            mimeType: part.mimeType,
            uploaderId: '',
            uploaderName: '',
            uploadTime: now
        });

        // 保存到文件系统
        let modulePath = path.join(uploadPath, module);
        let moduleMonthPath = path.join(modulePath, currMonth);
        let newFilePath = path.join(moduleMonthPath, serverName);

        !fs.existsSync(modulePath) && fs.mkdirSync(modulePath);
        !fs.existsSync(moduleMonthPath) && fs.mkdirSync(moduleMonthPath);

        let m = meter();
        // part.pipe(m).pipe(fs.createWriteStream(newFilePath);
        yield * wait(part.pipe(m).pipe(fs.createWriteStream(newFilePath)));

        //文件大小
        entity.length = m.bytes;
        yield entity.save();

        files[fieldName] = {
            originalName: entity.originalName,
            size: entity.length,
            mimeType: entity.mimeType,
            serverPath: newFilePath,
            id: entity._id
        };
    }

    ctx.request.body = body;
    ctx.request.files = files;
    yield next;
};
