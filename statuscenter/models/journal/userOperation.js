/**
 * Created by Administrator on 2017/2/15 0015.
 */
const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    autoIncrement = require('mongoose-auto-increment');

var userOperationSchema = new Schema({
    recorder:String,
    user_id: String,
    app_id: String,
    module_id: String,
    tool_id:String,
    profile_id:String,
    time:String,
    action:String,
    parameter:String
},{versionKey: false});

userOperationSchema.plugin(autoIncrement.plugin,'journal.userOperation');
module.exports = mongoose.model('journal.userOperation',userOperationSchema);


