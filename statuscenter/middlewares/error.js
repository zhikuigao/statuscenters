module.exports = error;


function error(opts){
    const env = process.env.NODE_ENV || 'development';
    
    return function *error(next){
        try{
            yield next;
        }catch(err){
            this.status = err.status || 500;
            this.res.statusMessage = err.name || 'server error';
            console.log(err.stack);
            this.errorResponse(err.code,err.name);
        }
    };
};
