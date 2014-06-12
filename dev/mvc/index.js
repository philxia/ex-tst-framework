/**
 * Module dependencies.
 */

var express = require('../..');
var logger = require('morgan');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

var fs = require('fs');
var fsextra = require('fs.extra');
var path = require('path');

var tstMgr_ns = require('./testManager').testManager;
var db = require('./db');

var app = module.exports = express();

// settings

// set our default template engine to "jade"
// which prevents the need for extensions
app.set('view engine', 'jade');

// set views for error and 404 pages
app.set('views', __dirname + '/views');

// define a custom res.message() method
// which stores messages in the session
app.response.message = function(msg) {
    // reference `req.session` via the `this.req` reference
    var sess = this.req.session;
    // simply add the msg to an array for later
    sess.messages = sess.messages || [];
    sess.messages.push(msg);
    return this;
};

// log
if (!module.parent) app.use(logger('dev'));

// serve static files
app.use(express.static(__dirname + '/public'));

// session support
app.use(cookieParser('some secret here'));
app.use(session());

// parse request bodies (req.body)
app.use(bodyParser());

// override methods (put, delete)
app.use(methodOverride());

// expose the "messages" local variable when views are rendered
app.use(function(req, res, next) {
    var msgs = req.session.messages || [];

    // expose "messages" local variable
    res.locals.messages = msgs;

    // expose "hasMessages"
    res.locals.hasMessages = !! msgs.length;

    /* This is equivalent:
   res.locals({
     messages: msgs,
     hasMessages: !! msgs.length
   });
  */

    next();
    // empty or "flush" the messages so they
    // don't build up
    req.session.messages = [];
});

// load controllers
require('./lib/boot')(app, {
    verbose: !module.parent
});

// assume "not found" in the error msgs
// is a 404. this is somewhat silly, but
// valid, you can do whatever you like, set
// properties, use instanceof etc.
app.use(function(err, req, res, next) {
    // treat as 404
    if (~err.message.indexOf('not found')) return next();

    // log it
    console.error(err.stack);

    // error page
    res.status(500).render('5xx');
});

// assume 404 since no middleware responded
app.use(function(req, res, next) {
    res.status(404).render('404', {
        url: req.originalUrl
    });
});

tstMgr_ns.Manager.setApplication(app);

if (!module.parent) {
    var server = require('http').createServer(app),
        io = require('socket.io').listen(server);

    server.listen(3000);

    app.get('/', function(req, res) {
        res.sendfile(__dirname + '/index.html');
    });

    var socket_server = require('./socket');

    io.sockets.on('connection', function(socket) {
        socket.on('disconnect', function() {
            if ( !! socket_server.socket_connections[socket.id])
                delete socket_server.socket_connections[socket.id]

        });
        socket.on(tstMgr_ns.Action_MonitorTest, function(argument) {
            console.log(argument);
            try {
                var tstObj = tstMgr_ns.Manager.getCurrentTesting();
                for (var hh = 0; hh < tstObj.consoleLog.length; hh++) {
                    var msg = tstObj.consoleLog[hh];
                    sendMessagesToSingleConnection(socket, msg['err'], msg['stdout']);
                }
            } catch (err) {
                console.log(err);
            }
        });
        socket.on(tstMgr_ns.Action_BrowseResult, function(argument) {
            console.log(argument);
            var argStrings = argument.split(' ');
            if (argStrings.length != 2)
                throw 'The argument from client is invalid - ' + argument + '.';
            var fargStrings = argStrings[0].split('_');
            if (fargStrings.length != 3)
                throw 'The argument from client is invalid - ' + argument + '.';
            var action = fargStrings[0]
            var envId = fargStrings[1];;
            var packId = parseInt(fargStrings[2]);


            var env = db.envs[envId];
            var envName = env.name;
            var pack = env.packages[env.packages.length - packId - 1];
            if (pack.id !== packId)
                throw 'The pack is not we are looking for.';

            // try to load the result.
            var packFileName = pack.name.substr(0, pack.name.length - '.zip'.length);
            var resultFileName = pack.smokeStatus + '.txt';
            var resultFilePath = path.join(tstMgr_ns.ResultsFolder, envName, packFileName, resultFileName);
            if (!fs.existsSync(resultFilePath))
                return;

            try {
                var resultString = fs.readFileSync(resultFilePath, "utf8");
                var resultObject = JSON.parse(resultString);
                if (!Array.isArray(resultObject))
                    throw 'The result is invalid.';

                // var conns = socket_server.socket_connections;
                // var countOfConns = Object.keys(conns).length;
                for (var ii = 0; ii < resultObject.length; ii++) {
                    var msg = resultObject[ii];
                    sendMessagesToSingleConnection(socket, msg['err'], msg['stdout']);
                }
                socket.needUpdate_information = false;

            } catch (err) {
                console.log(err);
            }
        });
        socket.on(tstMgr_ns.Action_RunTest, function(argument) {
            console.log(argument);
            var argStrings = argument.split(' ');
            if (argStrings.length != 2)
                throw 'The argument from client is invalid - ' + argument + '.';
            var fargStrings = argStrings[0].split('_');
            if (fargStrings.length != 3)
                throw 'The argument from client is invalid - ' + argument + '.';
            var action = fargStrings[0]
            var envId = fargStrings[1];;
            var packId = parseInt(fargStrings[2]);


            var env = db.envs[envId];
            var envName = env.name;
            var pack = env.packages[env.packages.length - packId - 1];
            if (pack.id !== packId)
                throw 'The pack is not we are looking for.';

            var socket_server = require('./socket');
            tstMgr_ns.messages.length = 0; //clean the msgs.


            var exec_ns = require('./execTest').runTest;
            var testingObject = new exec_ns.Testing(pack, envName, env.path);
            testingObject.envId = envId;
            testingObject.packId = packId;
            tstMgr_ns.Manager.setCurrentTesting(testingObject);
            testingObject.doCheck(function(err, stdout, stderr) {
                console.log(stdout);

                if ( !! socket_server && !! socket_server.socket_connections) {
                    var conns = socket_server.socket_connections;
                    var countOfConns = Object.keys(conns).length;
                    // caches the messages if the connections were not setup.
                    if (countOfConns < 1) {
                        tstMgr_ns.messages.push({
                            'err': err,
                            'stdout': stdout
                        });
                    } else {
                        // send out the cached messages if the connection are setup.
                        if (tstMgr_ns.messages.length > 0) {
                            for (var jj = 0; jj < tstMgr_ns.messages.length; jj++) {
                                var msg = tstMgr_ns.messages[jj];
                                sendMessagesToConnections(conns, msg['err'], msg['stdout']);
                            }
                            tstMgr_ns.messages.length = 0; //clean the messages.
                        }

                        // caches the messages in the server side.
                        testingObject.consoleLog.push({
                            'err': err,
                            'stdout': stdout
                        });
                        sendMessagesToConnections(conns, err, stdout);
                    }

                }
            });
        });

        socket.on(tstMgr_ns.Action_GenerateBenchmarks, function(argument) {
            console.log(argument);
            runTest(argument, true);
        })
        socket_server.socket_connections[socket.id] = socket;
    });

    doLoopCheckPackagesAndRunTest();

    // mockup testing.
    // setTimeout(function() {
    //     console.log('start the testing.');
    //     runTest("runTest_0_106 RevitExtractor_x64_CL410964_20140610_0353.zip");

    // }, 20000);
}

function runTest(argument, genBenchmarks) {
    console.log(argument);
    var argStrings = argument.split(' ');
    if (argStrings.length != 2)
        throw 'The argument from client is invalid - ' + argument + '.';
    var fargStrings = argStrings[0].split('_');
    if (fargStrings.length != 3)
        throw 'The argument from client is invalid - ' + argument + '.';
    var action = fargStrings[0]
    var envId = fargStrings[1];;
    var packId = parseInt(fargStrings[2]);


    var env = db.envs[envId];
    var envName = env.name;
    var pack = env.packages[env.packages.length - packId - 1];
    if (pack.id !== packId)
        throw 'The pack is not we are looking for.';

    var socket_server = require('./socket');
    tstMgr_ns.messages.length = 0; //clean the msgs.


    var exec_ns = require('./execTest').runTest;
    var testingObject = new exec_ns.Testing(pack, envName, env.path);
    testingObject.envId = envId;
    testingObject.packId = packId;
    testingObject.genBenchmarks = !!genBenchmarks;
    //
    if(testingObject.genBenchmarks){
        // setup the directories for this benchmarks.
        var benchmarksPath = path.join(tstMgr_ns.BenchmarksFolder, envName, 
            pack.name.substr(0, pack.name.lastIndexOf('.')));
        if(!fs.existsSync(benchmarksPath))
            fsextra.mkdirRecursiveSync(benchmarksPath);
    }

    tstMgr_ns.Manager.setCurrentTesting(testingObject);
    testingObject.doCheck(function(err, stdout, stderr) {
        console.log(stdout);

        if ( !! socket_server && !! socket_server.socket_connections) {
            var conns = socket_server.socket_connections;
            var countOfConns = Object.keys(conns).length;
            // caches the messages if the connections were not setup.
            if (countOfConns < 1) {
                tstMgr_ns.messages.push({
                    'err': err,
                    'stdout': stdout
                });
            } else {
                // send out the cached messages if the connection are setup.
                if (tstMgr_ns.messages.length > 0) {
                    for (var jj = 0; jj < tstMgr_ns.messages.length; jj++) {
                        var msg = tstMgr_ns.messages[jj];
                        sendMessagesToConnections(conns, msg['err'], msg['stdout']);
                    }
                    tstMgr_ns.messages.length = 0; //clean the messages.
                }

                // caches the messages in the server side.
                testingObject.consoleLog.push({
                    'err': err,
                    'stdout': stdout
                });
                sendMessagesToConnections(conns, err, stdout);
            }

        }
    });
}

function doLoopCheckPackagesAndRunTest() {
    // this will make sure the next timeout call will set the this 
    // pointer to ExecutionSequence instead of window object.
    var self = this;
    var callee = arguments.callee;
    setTimeout(function() {
        callee.call(self);
    }, tstMgr_ns.Timeout_PackagesMonitor);

    if (!tstMgr_ns.Manager.isRunningTesting()) {
        // 1. check the latest package of dev.
        for (var ii = 0; ii < db.envs.length; ii++) {
            var lastestpack = tstMgr_ns.getLatestPackage(db.envs[ii]);
            if ( !! lastestpack) {
                var packId = tstMgr_ns.Action_RunTest + '_' +
                    db.envs[ii].id + '_' + lastestpack.id + ' ' + lastestpack.name;
                runTest(packId);
            }
        }
    }
}

function sendMessagesToSingleConnection(socket, err, stdout) {
    if (err === "INFO")
        socket.emit('test_information_info', stdout);
    else if (err === "SUCCESS")
        socket.emit('test_information_success', stdout);
    else if (err === "ERROR")
        socket.emit('test_information_error', stdout);
    else if (err === "UPDATE")
        socket.emit('test_information_update', stdout);
}

function sendMessagesToConnections(conns, err, stdout) {
    // body...
    for (var id in conns) {
        var socket = conns[id];
        if (socket.needUpdate_information === undefined || socket.needUpdate_information)
            sendMessagesToSingleConnection(socket, err, stdout);
    }
}