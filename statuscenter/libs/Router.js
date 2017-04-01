const util = require('util'),
    regInteger = /^\d+$/,
    regDecimal = /^[-+]?\d*\.?\d*$/,
    regEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

// action format: {method : 'get/post/all', code: 'read',  name: '查询', handler: function, isAutority: true/false }
let Router = function() {
    this.actions = [];
};

let Action = function(code, method, name, handler, isAuth, validation) {
    this.code = code;
    this.method = method;
    this.name = name;
    this.handler = handler;
    this.isAuth = isAuth;
    this.validation = validation;
};

Action.prototype.validate = function(query, body) {
    let that = this,
        validation = that.validation,
        queryerrors, bodyerrors;

    if (!that.validation) return;

    let examine = function(rules, params) {
        let errs = {};
        for (let key in rules) {
            let rule = rules[key];

            if (rule.isRequired && params[key] === undefined) {
                errs[key] = rule.msg || '必填';
            }

            if (rule.isInteger && params[key] && !regInteger.test(params[key])) {
                errs[key] = rule.msg || '必填为数字';
            }

            if (rule.isIn && params[key] && rule.isIn.indexOf(params[key]) == -1) {
                errs[key] = rule.msg || util.format('值必须在 %s 之间', rule.isIn.join(','));
            }

            if (rule.isDecimal && params[key] && !regDecimal.test(params[key])) {
                errs[key] = rule.msg || '数字无效';
            }

            if (rule.isEmail && params[key] && !regEmail.test(params[key])) {
                errs[key] = rule.msg || '邮件无效';
            }

            if (rule.isArray && params[key] && !Array.isArray(params[key])) {
                errs[key] = rule.msg || '数组无效';
            }
        }

        return Object.keys(errs).length ? errs : undefined;
    };

    validation.query && (queryerrors = examine(validation.query, query)); // {skip: must number} or undefined
    validation.body && (bodyerrors = examine(validation.body, body)); // {name: required } or undefined

    return (!queryerrors && !bodyerrors) ? undefined : Object.assign({}, queryerrors, bodyerrors);
};

Router.prototype.action = function(method, args) {
    let code = args[0],
        name, handler, isAuthority, validation;

    // two letiable
    // 1. code handler
    if (args.length == 2) {
        name = commonAction[code];
        handler = args[1];
        isAuthority = true;
    } else if (args.length == 3) {
        if (typeof(args[1]) == 'function' && typeof(args[2]) == 'boolean') {
            // code, handler, isAuthority
            name = commonAction[code];
            handler = args[1];
            isAuthority = args[2];
        } else if (typeof(args[1]) == 'string' && typeof(args[2]) == 'function') {
            // code, name, handler
            name = args[1];
            handler = args[2];
            isAuthority = true;
        } else {
            // code, handler, validation
            name = commonAction[code];
            handler = args[1];
            validation = args[2];
        }
    } else if (args.length == 4) {
        // code handler isAuthority validation
        if (typeof(args[1]) == 'function' && typeof(args[2]) == 'boolean' && typeof(args[3]) == 'object') {
            handler = args[1];
            isAuthority = args[2];
            validation = args[3];
        } else if (typeof(args[1]) == 'string' && typeof(args[2]) == 'funciton' && typeof(args[3]) == 'object') {
            // code name handler validation
            name = args[1];
            handler = args[2];
            validation = args[3];
        } else {
            // code name handler isAuthority
            name = args[1];
            handler = args[2];
            isAuthority = args[3];
        }
    } else {
        // code name handler isAuthority validation
        name = args[1];
        handler = args[2];
        isAuthority = args[3];
        validation = args[4];
    }

    // this.actions.push({code: code, method: method, name: name, handler: handler, isAuthority: isAuthority});
    this.actions.push(new Action(code, method, name, handler, isAuthority, validation));
};

Router.prototype.post = function() {
    this.action('post', arguments);
};

Router.prototype.get = function() {
    this.action('get', arguments);
};

Router.prototype.all = function() {
    this.action('all', arguments);
};

let commonAction = {
    create: '新增',
    update: '编辑',
    read: '查询',
    destroy: '删除'
};

module.exports = function() {
    return new Router();
};
