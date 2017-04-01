/**
 * Created by Administrator on 2017/2/15 0015.
 */
const mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        autoIncrement = require('mongoose-auto-increment');

var recordSchema = new Schema({
    uri: String,
    requestQuery:String,
    requestBody: String,
    response: String,
    userId: String,
    appId:String,
    moduleId:String,
    createTime:Date,
    requestMethod:String
},{versionKey: false});

recordSchema.plugin(autoIncrement.plugin,'journal.record');
module.exports = mongoose.model('journal.record',recordSchema);


