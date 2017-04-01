const _ = require('lodash'),
    commonError = require('../libs/error.js');

const opt = {
    pulldown: 'pulldown',
    pullUp: 'pullup'
};

let tools = {

    /**
     * 分页
     * @param {koa context}               context           [koa上下文]
     * @param {Query/Aggregate/Array}     query             [mongoose查询或结果集]
     * @param {Object}                   [sortObject]       [排序（选填）]
     * @return {Object} [description]
     * @example
     * 注意:param query中必须带有createAt字段
     * context参数集合:
     * 1.下拉 pagination:'pulldown' time:查询此时间以前的数据(历史,默认当前时间) take:取的条数
     * 2.上拉 pagination:'pullup' time:查询此时间以后的数据(最新,默认当前时间) 
     * 
     * example：yield tools.pagination(ctx, model.find({}), { createdAt: -1 });
     */
    pagination: function*(context, query, sortObject) {

        //改上\下拉刷新
        let type = context.query.pagination || opt.pulldown;

        let count = 0,
            rows = [];

        let time = context.query.time ? new Date(context.query.time) : new Date();
        let take = context.query.take ? +context.query.take : 10;

        if (type != opt.pulldown && type != opt.pullUp) throw new commonError.ParameterError(); //参数错误

        /**
         * 查询语句查询
         */
        if (query.constructor.name == 'Query') {
            count = yield query.count();
            sortObject && (query = query.sort(sortObject)); //排序

            if (type == opt.pulldown) { //下拉刷新
                query._conditions = Object.assign(query._conditions, { createdAt: { $lt: time } }); //查询时间以前
                query = query.limit(take); //提取数量

            } else if (type == opt.pullUp) { //上拉加载最新
                query._conditions = Object.assign(query._conditions, { createdAt: { $gt: time } }); //查询时间以后
            }
            rows = yield query.exec('find');
        }
        /**
         * 聚合语句分页
         */
        else if (query.constructor.name == 'Aggregate') {
            let pipelines = query._pipeline; //temp _pipeline
            sortObject && (query = query.sort(sortObject));

            if (type == opt.pulldown) { //下拉刷新
                query._pipeline.push({ $match: { createdAt: { $lt: time } } });
                rows = yield query.limit(take); //_pipeline add sort skip take

            } else if (type == opt.pullUp) { //上拉加载最新
                query._pipeline.push({ $match: { createdAt: { $gt: time } } });
                rows = yield query;
            }

            pipelines.push({ $group: { _id: null, count: { $sum: 1 } } }); //temp _pipeline add count
            query._pipeline = pipelines; //change _pipeline
            let queryCount = yield query;
            count = queryCount.length > 0 ? queryCount[0].count : 0;
        }
        /**
         * 结果分页
         */
        else if (query.constructor.name == 'Array') {
            count = query.length;
            if (sortObject) {
                let params = getDefaultSort(sortObject);
                query = _.orderBy(query, params.fileds, params.sorts);
            }

            if (type == opt.pulldown) { //下拉刷新
                query = query.filter(item => item.createdAt < time);
                rows = query.slice(0, take);

            } else if (type == opt.pullUp) { //上拉加载最新
                rows = query.filter(item => item.createdAt > time);
            }
        }

        return { count: count, rows: rows };
    },
    formatByKey: function(array) {
        let obj = {};
        array.forEach((item) => {
            let k = Object.keys(item)[0];
            if (obj[k]) {
                if (Array.isArray(obj[k])) {
                    obj[k].push(item[k]);
                } else {
                    obj[k] = [obj[k], item[k]];
                }
            } else {
                obj[k] = item[k]
            }
        });
        return obj;
    },
    dateFormat: function(data, fmt) {
        let o = {
            "M+": data.getMonth() + 1, //月份 
            "d+": data.getDate(), //日 
            "h+": data.getHours(), //小时 
            "m+": data.getMinutes(), //分 
            "s+": data.getSeconds(), //秒 
            "q+": Math.floor((data.getMonth() + 3) / 3), //季度 
            "S": data.getMilliseconds() //毫秒 
        };
        if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (data.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (var k in o)
            if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return fmt;
    }

};

module.exports = tools;

/**
 * mongoose排序参数转换js排序参数
 * @param  {[type]} mongooseSort [description]
 * @return {[type]}              [description]
 */
let getDefaultSort = function(mongooseSort) {

    let params = {
        fileds: [],
        sorts: []
    };

    for (let k in mongooseSort) {
        params.fileds.push(k);
        let order = mongooseSort[k] > 0 ? 'asc' : 'desc';
        params.sorts.push(order);
    }
    return params;
}
