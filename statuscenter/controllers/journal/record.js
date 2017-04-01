/**
 * Created by Administrator on 2017/2/15 0015.
 */
/**
 * @controller - 公告资源
 */
const router = require('../../libs/Router.js')(),
        Record = require('../../models/journal/record');
        commonError = require('../../libs/error.js');


/**
 * @action create - 添加日志
 * @author 高志奎
 * @method post
 * @param{String} service 网元名称
 * @param{String} source  来源
 * @param{String} request 请求
 * @param{String} response 返回
 * @param{String} userID 用户ID
 * @param{number} type 类型（0用户操作；1用户基础数据）
 */
   router.post('create',function*(ctx){
      let prarms = ctx.request.body;
      let data = {
         uri : prarms.uri,
         requestQuery : prarms.requestQuery,
         requestBody : prarms.requestBody,
         response : prarms.response,
         userId : prarms.userId,
         appId : prarms._id,
         moduleId : prarms.moduleId,
         requestMethod : prarms.requestMethod,
         createTime : new Date(prarms.createTime)
      };
      let result = yield  Record.create(data);
      this.successResponse(result) ;
   },{
      body:{
         uri: {isRequired: true},
         requestQuery: {isRequired: true},
         requestBody: {isRequired: true},
         response: {isRequired: true},
         userId: {isRequired: true},
         _id: {isRequired: true},
         moduleId: {isRequired: true},
         createTime: {isRequired: true},
         requestMethod: {isRequired: true}
      }
   });


/**
 * @action update -更新日志
 * @author 高志奎
 * @method post
 * @param{string} id 日志ID
 * @param{string} response

    router.post('update',function*(ctx){
        let params =ctx.request.body,
            id = params.id,
            response = params.response;
        let result = yield Record.update({_id: id}, {$set:{response:response}}).exec();
        this.successResponse(result) ;
    });
*/

module.exports = router.actions;