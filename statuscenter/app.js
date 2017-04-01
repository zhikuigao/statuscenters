const join = require('path').join;
const error = require('./middlewares/error.js');
const koa = require('koa');
const app = module.exports = koa();
const parse = require('co-body');
const fs = require('fs');
const path = require('path');
const logger = require('koa-logger');
const cors = require('koa-cors');
var conn = require('./libs/db.js');
const config = require('./config');
const auth = require('./middlewares/auth.js');
const createZnode = require('./libs/znode');
app.context.success = function() {
    var res = this.res;
    res.setHeader('Content-Type', 'text/plain; charset=utf8');
    res.statusCode = 200;
    res.end();
};

app.context.successResponse = function(data) {
    var res = this.res;
    res.setHeader('Content-Type', 'text/plain; charset=utf8');
    res.statusCode = 200;
    let response = {};
    response.code = 0;
    response.error = null;
    response.result= data;
    this.body = response;
};

app.context.errorResponse = function(code, error, msg) {
    let ret = {code: code, error: error};
    // msg 用来调试
    msg && (ret.msg = msg);
    this.body = ret;
};

app.controllers = {};
let basepath = path.join(__dirname, './controllers');
fs.readdirSync(basepath).forEach(function(modulename) {
    // 循环 controllers 下所有的目录
    var moduleDirPath = path.join(basepath, modulename);
    fs.readdirSync(moduleDirPath).forEach(function(ctrlname) {
        if (path.extname(ctrlname) != '.js') return;
        var modulepath = modulename + '/' + path.basename(ctrlname, '.js');
        app.controllers[modulepath] = require(path.join(basepath, modulepath + '.js'));
    });
});

app.use(cors());
// 错误处理
app.use(error());
app.use(logger());
app.use(require('./middlewares/upload.js'));
// app.use(require('./middlewares/formidable-upload.js'));

// body-parser
app.use(function*(next) {
    // 只处理 request content-type: application/x-www-form-urlencoded, application/json 类型的数据
    if ('POST' != this.method || !this.is('json', 'urlencoded')) return yield next;
    // 将解析出来的数据，放到 this.request.body 中
    let body = yield parse(this, { limit: '5kb' });
    this.request.body = body;
    yield next;
});

// 验证权限，且路由， 生产环境中使用
    app.use(auth);

if (!module.parent) {
    app.listen(config.port).on('listening', () => {
        console.log(`listening on port: ${config.port}......`);
        // 连接到zookeeper 服务器，并注册节点
        let zkClient = createZnode(config.zkNodeName, config.port);
        zkClient.connect();
    });
}

module.exports = app;
