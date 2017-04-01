const zookeeper = require('node-zookeeper-client');
const os = require('os');
const CreateMode = zookeeper.CreateMode;
const co = require('co');
const config = require('../config');
const logger = require('./logger');
const ip = require('ip');

let currentHostIp = ip.address();

let isNodeExist = function(client, path){
    return new Promise((resolve, reject)=>{
        client.exists(path, function (error, stat) {
            error ? reject(error) : resolve(stat ? true : false);
        });
    });
};

let createNode = function(client, path, nodeMode, data){
    return new Promise((resolve, reject)=>{
        client.create(path, data, nodeMode, function (error, path) {
            error ? reject(error) : resolve();
        });
    });
};

let removeNode = function(client, path){
    return new Promise((resolve, reject) => {
        client.remove(path, -1, function (error) {
            error ? reject(error) : resolve();
        });
    });
};

module.exports = function(zkNodeName, port){
    let client = zookeeper.createClient(config.zookeeperAddress);
    let paths = `/service/${zkNodeName}/servers/server-/`;
    const data = {
        mode: 'product',
        product: {
            ip: currentHostIp,
            port: port,
            path: '/'
        }
    };
    client.once('connected', function() {
        co(function*(){
            let regex = /\//g, result;
            let lastSlashIndex = paths.lastIndexOf('/');

            while( (result = regex.exec(paths)) ){
                // 忽略掉根目录
                if(result.index == 0) continue;

                let nodeMode, nodeData = new Buffer('');
                if(result.index != lastSlashIndex){
                    nodeMode = CreateMode.PERSISTENT;
                }else{
                    nodeMode = CreateMode.EPHEMERAL_SEQUENTIAL;
                    nodeData = new Buffer(JSON.stringify(data));
                }

                let nodePath = paths.substring(0, result.index);
                let isExist = yield isNodeExist(client, nodePath);

                if(!isExist){
                    yield createNode(client, nodePath, nodeMode, nodeData);
                }
            }
        }).catch(err=>{
            logger.error('zookeeper connection error: ', err);
        });
    });

    return client;
};




