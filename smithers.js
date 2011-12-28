var http       = require('http')
  , https      = require('https')
  , jenkinsapi = require('jenkins-api')
  , path       = require('path')
  , fs         = require('fs')

var serverHandler = function(request, response, opts, jenkins) {

    var re = new RegExp(opts.config.token);
    var validToken = re.test(request.url);
    
    if(!validToken) {
        response.statusCode = 404;
        response.end("Invalid token/Token not found. Your humble servant, Smithers.");
        return;
    }

    var body = "";

    request.on('data', function(chunk) {
        body += chunk;
    });

    request.on('end', function() {

        // Parse payload from body POST
        var params = unescape(body).split('&');
        var payload;
        for(param in params) {
            var pair = params[param].split('=');
            if(pair.length == 2 && pair[0]=="payload") {
                payload = JSON.parse(pair[1]);
            }
        }
        console.log(payload);
        // Check if project from Post hook exists in our config file
        if (payload.repository.name) {
            var projects = opts.config.projects;
            var projectConfig;
            for (project in projects) {
                if (projects[project].name == payload.repository.name) {
                    projectConfig = projects[project];
                    console.log(projectConfig);
                }
            }
            if(projectConfig === undefined) {
                response.statusCode = 404;
                response.end("Project not found in configuration. Your humble servant, Smithers.");
                return;
            }
        }

        // Find branch and check if that branch has a corresponding job
        var branchResult = payload.ref.match(/refs\/heads\/(\w+)/);
        var branch = (branchResult != null) ? branchResult[1] : undefined; 
        if (!branch) {
                response.statusCode = 404;
                response.end("I'm sorry, there was a problem with finding the branch. Your humble servant, Smithers.");
                return;
        }

        // Determine name of job from branch and project name
        var baseJob = projectConfig.baseJob;
        //var baseJob = "test";
        if (/master/.test(baseJob)) {
            var jobName = baseJob.replace(/master/, branch);
        } else {
            var jobName = baseJob + '-' + branch;
        }
        console.log(jobName);

        // Check if branch has a job in Jenkins
        jenkins.job_info(jobName, function(error, data) {
            // if getting the job info returns an error, the job does not exist, so we
            // will copy the job from the base job
            if(error) {
               jenkins.copy_job(baseJob
                               ,jobName
                               ,function(configFile) {
                                    // function that takes in the config file, and sets the new jobs
                                    // config file to whatever is returned here.
                                    return configFile.replace(baseJob, jobName);
                               }
                               ,function(error, data) {
                                    if(!error) {
                                        response.write("Job copied\n");
                                    } else {
                                        response.statusCode = 500;
                                        response.end("Error copying job, ", error);
                                        return;
                                    }

                                    jenkins.build(jobName, function(error, data) {
                                        if(!error) {
                                            response.end("Job built\n");
                                            return;
                                        } else {
                                            response.statusCode = 500;
                                            response.end("Error building, ", error);
                                            return;
                                        }
                                    });
                                });
            } else {
                if (projectConfig.deleted == true) {
                    jenkins.delete_job(jobName, function(error, data) {
                        if(!error) {
                            response.end("Job deleted\n");
                            return;
                        } else {
                            response.statusCode = 500;
                            response.end("Error deleting, ", error);
                            return;
                        }
                        
                    });
                } else {
                    jenkins.build(jobName, function(error, data) {
                        if(!error) {
                            response.end("Job built\n");
                            console.log("Job build");
                            return;
                        } else {
                            response.statusCode = 500;
                            response.end("Error building, ", error);
                            return;
                        }
                    });

                }

            }
        });

        response.end();

    });

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