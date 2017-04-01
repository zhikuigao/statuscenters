
var redis = require("redis"),
    config = require('../config.js'),
    client = redis.createClient(6379, config.redisHost),
    wrapper = require('co-redis'),
    redisCo = wrapper(client),
    util = require('util');

var cacheUser = {};

/**
 * 存储用户以下信息, id, name, orgId(公司Id), deptId(部门Id), 
 * 和各模块对应的权限： sys/user: 'read, update‘;  sys/role: 'read, destroy'
*/

cacheUser.isLogin = function *(key){
    return yield redisCo.exists(key);
};

// 获取单一键值
// key 用户的hashkey: user-codisan, prop: name/orgId
cacheUser.prop = function *(key, prop){
    return yield redisCo.hget(key, prop);
};

// 获取多个键值
cacheUser.props = function *(key, props){
    return yield redisCo.hmget(key, props);
};

cacheUser.remove = function *(key){
    return yield redisCo.del(key);
};

//  client.hmset(key, userProp, (err, reply) => { cb(err, ret); });
cacheUser.hmset = function *(key, userInfo){
    return yield redisCo.hmset(key, userInfo);
};

module.exports = cacheUser;
