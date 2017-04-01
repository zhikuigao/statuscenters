//var cacheUser = require('../libs/cache-user.js');
var commonError = require('../libs/error.js');
//var User = require('../models/sys/user.js');
var util = require('util');
var extend = util._extend;
const crypto = require('crypto');
var config = require('../config.js');

//var retrieveUserCtrlRights = function *(ctx, modulepath){
//    // 获取用户token
//    var token  = ctx.cookies.get('token') || ctx.headers['token'];
//
//    // 用户没有上传token
//    if(!token) throw new commonError.TokenMissing();
//    // 解密token 得到用户账号
//    var decipher = crypto.createDecipher('rc4', config.tokenSecretKey);
//    token = decipher.update(token, 'hex', 'utf8');
//    token += decipher.final('utf8');
//
//    var account = token;
//    var userKey = 'user-' + account; // user-codisan, 用户在redis中的key
//
//    // 检查该用户是否登录
//    var isLogin = yield* cacheUser.isLogin(userKey); // 0/1
//    var keys = ['id', 'account', 'name'];
//
//    var userCtrlRights;       // 该用户，对应请求的模块，的权限：read,update,destroy...
//
//    // 提取用户相关信息
//    if(isLogin){
//        // 从redis中 取出用户信息，存放到 ctx.state.user 中, keys: (id, name, deptId, orgId)
//        var vals = yield* cacheUser.props(userKey, keys);
//
//        keys.forEach(function(k, i){
//            ctx.state.user[k] = vals[i];
//        });
//
//        // 取出该模块对应的权限, sys/user: read,create,update
//        userCtrlRights = yield* cacheUser.prop(userKey, modulepath);
//    }else{
//        // 从数据库获取用户信息，存放到redis，和 ctx.state.user 中
//        //var dbUser = yield User.findOne({account: account}).exec();
//        ctx.state.user.id = dbUser._id;
//        ctx.state.user.account = dbUser.account;
//        ctx.state.user.name = dbUser.name;
//        // 从数据库获取该用户的模块权限
//        var right = yield* User.rights(account);
//
//        // 将用户信息，和模块权限，一并存储到 redis 中
//        var userInfo = Object.assign({}, ctx.state.user, right);
//        yield* cacheUser.hmset(userKey, userInfo);
//        // 取出该模块对应的权限
//        userCtrlRights = right[modulepath];
//    }
//
//    return userCtrlRights;
//};

module.exports = function*(next) {
    var controllers = this.app.controllers;
    // 所有的服务器端请求，都已 /api 开始, 后面接上 module + controller + action
    // Eg: /api/sys/user/read
    var ctx = this;
    ctx.state.user = {}; // 存放用户信息

    var urlreg = /\/(\w*\/\w*)\/(\w*)/;

    // 如果请求不合法则抛出异常
    if (!urlreg.test(ctx.path)) throw new commonError.RequestUrlNotMatch();

    var match = urlreg.exec(ctx.path), // ["api/sys/user/read", "sys/user", "read"]
        modulepath = match[1], // sys/user
        action = match[2], // read
        method = ctx.method.toLowerCase(); // get,post

    // 提取访问的模块，如果模块不存在，则抛出异常
    if (!controllers[modulepath]) throw new commonError.ControllerNotFound();

    // 提取要访问的Action, 如果 Action 不存在，则抛出异常
    var actions = controllers[modulepath];
    var serverAction = actions.find(a => a.code == action && a.method == method);
    if (!serverAction) throw new commonError.ActionNotFound();

    var err = serverAction.validate(ctx.query, ctx.request.body);
    if (err) {
        throw new commonError.ParameterError(null, null, err);
    }

    // 如果是common 模块下的请求，不做任何验证
    if (modulepath == 'public/common') {
        // handle...
        // 如果上述一切都OK，则开始执行
        return yield * serverAction.handler.call(this, ctx, ctx.request, ctx.response);
    } else {
        // 取出该模块对应的权限
        //var userCtrlRights = yield* retrieveUserCtrlRights(ctx, modulepath);

        // 如果请求的是 public 模块则不进行权限验证, 测试期间取消权限验证
        /* if(!modulepath.startsWith('public') && (!userCtrlRights || userCtrlRights.indexOf(action) == -1)){
            throw new commonError.PermissionDelied();
        } */
        return yield * serverAction.handler.call(this, ctx, ctx.request, ctx.response);
    }
};
