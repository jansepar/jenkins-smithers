var http       = require('http')
  , https      = require('https')
  , jenkinsapi = require('jenkins-api')
  , path       = require('path')
  , fs         = require('fs')
  , _          = require('underscore');

var serverHandler = function(request, response, opts, jenkins) {

    var re = new RegExp(opts.config.token);
    var validToken = re.test(request.url);
    
    if(!validToken) {
        response.statusCode = 404;
        response.end("Invalid token/Token not found");
        return;
    }



}

var appSourceDir = __dirname;

var serve = exports.createServer = function(opts) {
    
    var fileContent = fs.readFileSync(opts.configFile, 'utf8');
    opts.config = JSON.parse(fileContent);

    var jenkins = jenkinsapi.init(opts.config.hudsonurl);

    var httpServer = http.createServer(function(request, response) {
                    serverHandler(request, response, opts, jenkins);
                }).listen(opts.port)
                /*
      , httpsServer = https.createServer({
                    key: fs.readFileSync(appSourceDir + '/' + 'vendor/certs/server.key', 'utf8'),
                    cert: fs.readFileSync(appSourceDir + '/' + 'vendor/certs/server.crt', 'utf8'),
                }, function(request, response) {
                    serverHandler(request, response, opts, jenkins);
                }).listen(opts.sslPort);
                */

    console.log('smithers @ 0.0.0.0:' + opts.port + ' (SSL: ' + opts.sslPort + ')');

    //return [httpServer, httpsServer];
    return [httpServer];

}


if (!module.parent) {
    serve({port: 8880, sslPort: 8843, configFile: path.join(appSourceDir , "config.json")});
}
