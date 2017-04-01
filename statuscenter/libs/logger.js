const path = require('path');
const fs = require('fs');
const bunyan = require('bunyan');

const loggerPath = path.resolve(__dirname, '../logs');
if(!fs.existsSync(loggerPath)){
    fs.mkdirSync(loggerPath);
}

module.exports = bunyan.createLogger({
    name: 'myprofile',
    streams: [
        {
            type: 'rotating-file',
            path: path.resolve(loggerPath, 'info.log'),
            period: '1d',
            count: 10
        },
        {
            level: 'error',
            path: path.resolve(loggerPath, 'error.log')
        }
    ]
});
