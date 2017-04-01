var config = {
    mode: 'dev',
    filesUrl: '../../uploads',
    dburl: 'mongodb://127.0.0.1:27017/statuscenter',
    redisHost: '127.0.0.1',
    uploadPath: '',
    tokenSecretKey: '你猜猜',
    port: 10030,
    zookeeperAddress: '127.0.0.1:2181',
    zkNodeName: 'statuscenter',
    rabbitMqAddress: 'amqp://192.168.1.202'

};
module.exports = config;
