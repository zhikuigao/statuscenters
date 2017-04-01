const amqp = require('amqplib/callback_api');
var conn = require('./libs/db.js');
const config = require('./config.js');
const logger = require('./libs/logger.js');
const UserOperation = require('./models/journal/userOperation');
var args = process.argv.slice(2);

if (args.length == 0) {
  logger.error('[rabbitmq]:process.exit iis 0');
  process.exit(1);
}


amqp.connect(config.rabbitMqAddress, function(err, conn) {
  conn.createChannel(function(err, ch) {
    var ex = args[0];
    console.log("arg0"+args[0]);
    console.log("arg1"+args[1]);
    console.log("arg2"+args[2]);
    ch.assertExchange(ex, args[1], {durable: true});
    ch.assertQueue('', {exclusive: true}, function(err, q) {
      console.log(' [*] Waiting for logs. To exit press CTRL+C');
      //args.forEach(function(severity) {
      ch.bindQueue(q.queue, ex, args[2]);
      //});
      ch.consume(q.queue, function(msg) {
        try {
          console.log(" [x] %s: '%s'", msg.fields.routingKey, msg.content.toString());
          // console.log(msg.content.toString());
          // console.log("data:"+msg.content.toString())
          var data = JSON.parse(msg.content.toString());
          console.log("data:"+data);
          UserOperation.create(data,function(err,result){
            if(err) return   logger.error(err);
          });
        }catch(er){
          logger.error(er);
        }
      }, {noAck: true});
    });
  });
});
