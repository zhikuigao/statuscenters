const mongoose = require('mongoose'),
      Schema = mongoose.Schema,
      autoIncrement = require('mongoose-auto-increment');

var attachmentSchema = new Schema({
    originalName: String,
    moduleName: String,
    serverName: String,
    length: Number,
    uploaderId: Number,
    uploaderName: String,
    uploadTime: Date,
    mimeType:String
}, { versionKey: false });

attachmentSchema.plugin(autoIncrement.plugin, 'sys.attachment');
module.exports = mongoose.model('sys.attachment', attachmentSchema);
