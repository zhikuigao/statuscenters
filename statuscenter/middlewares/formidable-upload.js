/*
    formidable上传
 */
const formidable = require('formidable'),
    fs = require('fs'),
    path = require('path'),
    uuid = require('node-uuid'),
    config = require('../config.js'),
    Attachment = require('../models/sys/attachment.js');

let uploadPath = config.uploadPath || path.join(__dirname, config.filesUrl);
!fs.existsSync(uploadPath) && fs.mkdirSync(uploadPath);

//formidable thunk callback(err,success)
let formParse = function(opts, ctx) {
    return function(done) {
        let form = opts instanceof formidable.IncomingForm ? opts : new formidable.IncomingForm(opts);
        form.parse(ctx.req, function(err, fields, files) {
            if (err) return done(err);
            done(null, { fields: fields, files: files });
        });
    };
};

module.exports = function*(next) {
    if (('POST' == this.method) && (this.url == '/api/public/attachment/upload')) return yield next;
    if (!this.request.is('multipart/*')) return yield next;

    let ctx = this;
    var urlReg = /api\/(\w*)\/(\w*)\/(\w*)/;
    let match = urlReg.exec(this.path),
        module = match[1], // sys
        controller = match[2],
        action = match[3]; //read
    ctx.request.module = module;
    ctx.request.controller = controller;
    ctx.request.action = action;

    let modulePath = path.join(uploadPath, module);

    !fs.existsSync(modulePath) && fs.mkdirSync(modulePath);

    //进度保存文件
    let form = new formidable.IncomingForm();
    //写入附加信息
    form.on('fileBegin', function(name, file) {
        let serverName = file.serverName = uuid.v1();
        let now = new Date();
        let currMonth = now.toISOString().substr(0, 7);

        // 保存到文件系统
        let moduleMonthPath = path.join(uploadPath, module, currMonth);
        file.path = path.join(moduleMonthPath, serverName);

        // 保存到文件系统
        !fs.existsSync(moduleMonthPath) && fs.mkdirSync(moduleMonthPath); //文件夹不存在
    });
    //保存 返回格式:{ fields: fields, files: files }
    let params = yield formParse(form, ctx);

    let files = {};
    for (let f in params.files) {
        let pf = params.files[f];

        // 保存到数据库
        let entity = new Attachment({
            moduleName: module,
            originalName: pf.name,
            serverName: pf.serverName,
            length: pf.size, //文件大小错误
            mimeType: pf.type,
            uploaderId: '',
            uploaderName: '',
            uploadTime: pf.lastModifiedDate
        });
        yield entity.save();

        files[f] = {
            originalName: pf.name,
            size: pf.size,
            mimeType: pf.type,
            serverPath: pf.serverName,
            id: entity._id
        };
    }

    ctx.request.body = params.fields;
    ctx.request.files = files;
    yield next;
};
