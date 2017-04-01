const config = require('../config.js'),
      mongoose = require('mongoose'),
      Schema = mongoose.Schema,
      autoIncrement = require('mongoose-auto-increment');

// 由于 mongoose save, findOne.exec() 返回的是他们自己的 mpromise 对象，
// 这个对象在4.0+ 版本已经不赞成使用，所以这里使用ES6自带的promise
mongoose.Promise = global.Promise;

var connection = mongoose.connect(config.dburl);
autoIncrement.initialize(connection);

module.exports = connection;
