let generateError = function(name, code, message){
    var c = function(customMsg, customCode){
        let temp = Error.call(this);
        temp.name = this.name = name;
        this.code = customCode || code;
        this.message = customMsg || message;
        this.stack = temp.stack;
    };

    c.prototype = Object.create(Error.prototype, {
        constructor: {
            value: c,
            writable: true,
            configurable: true
        }
    });

    return c;
};

module.exports = {
    PermissionDelied: generateError('PermissionDelied', 516010, '权限不足'),
    ServerError: generateError('ServerError', 516011, '服务器异常'),
    TokenMissing: generateError('TokenMissing', 516012, '服务器异常'),
    ControllerNotFound: generateError('ControllerNotFound', 516013, '未找到控制器'),
    ActionNotFound: generateError('ActionNotFound', 516014, '为找到对应的Action'),
    RequestUrlNotMatch: generateError('RequestUrlNotMatch', 516015, '请求的URL不合法'),
    ContentTypeNotCorrect: generateError('ContentTypeNotCorrect', 516003, '请求的 content-type 类型不合法'),
    ParameterError: generateError('ParameterError', 516000),
    FileNoFindError: generateError('FileNoFindError', 516001),
    InterfaceError: generateError()
};
