let myEnum = {
    /*
        群资源类型
     */
    resourceType: {
        /*
            工具
         */
        tool: 0,
        /*
            共享资料
         */
        papers: 1
    },
    /*
        下载资源类型
     */
    downloadResourceType: {
        /*
            工具
         */
        tool: 0,
        /*
            共享资料
         */
        papers: 1,
        /*
            应用
         */
        application: 2
    },
    /*
        资源操作类型
     */
    resourceHandleType: {
        /*
            下载
         */
        download: 0,
        /*
            删除
         */
        delete: 1
    },

    downloadType: {
        /*
            源文件
         */
        source: 0,
        /*
            缩略图
         */
        thumbnail: 1
    }
};

module.exports = myEnum;
