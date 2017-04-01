var amqp = require('amqplib/callback_api');
var config = require('./config.js');

amqp.connect(config.rabbitMqAddress, function(err, conn) {
  conn.createChannel(function(err, ch) {
    var ex = 'service';
    var args = process.argv.slice(2);
    var msg = args.slice(1).join(' ') || 'Hello World!';
    var severity = (args.length > 0) ? args[0] : 'info';
    ch.assertExchange(ex, 'direct', {durable: true});
    var createq = ch.assertQueue(severity, {durable: true}, function(err, q) {
       var bindret = ch.bindQueue(severity, ex, severity);
      });
    console.log("********createq:%s",createq);
    var ret = ch.publish(ex, severity, new Buffer(msg),{persistent: true});
  });

  setTimeout(function() { conn.close(); process.exit(0) }, 500);
});
