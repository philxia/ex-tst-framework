/**
 * Module dependencies.
 */

var express = require('..');
var logger = require('morgan');
// var session = require('express-session');
// var cookieParser = require('cookie-parser');
// var bodyParser = require('body-parser');
var methodOverride = require('method-override');

var fs = require('fs');
var fsextra = require('fs.extra');
var path = require('path');
var http = require('http');

var tstMgr_ns = require('./testManager').testManager;
var db = require('./db');

var app = module.exports = express();

// settings

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
// app.use(express.static(__dirname + '/public'));

// session support
// app.use(cookieParser('some secret here'));
// app.use(session());

// parse request bodies (req.body)
// app.use(bodyParser());

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


tstMgr_ns.Manager.setApplication(app);

if (!module.parent) {
	setTimeout(function () {
		// body...
		doLoopCheckQueuedJobsAndRunTest();
	}, 20000);
	
}

function runTest(argument, jobId, genBenchmarks) {
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
	testingObject.jobId = jobId;
	testingObject.envId = envId;
	testingObject.packId = packId;
	testingObject.genBenchmarks = !! genBenchmarks;
	// create the benchmarks folder in this mode.
	if (testingObject.genBenchmarks) {
		// setup the directories for this benchmarks.
		testingObject.benchmarksPath = path.join(tstMgr_ns.BenchmarksFolder, envName,
			pack.name.substr(0, pack.name.lastIndexOf('.')));
		if (!fs.existsSync(testingObject.benchmarksPath))
			fsextra.mkdirRecursiveSync(testingObject.benchmarksPath);
	}

	// send the sign to queue to active the job.
	var opts = {
		hostname: tstMgr_ns.Manager.getHostIP(),
		// auth: 'foo:bar',
		port: 3001,
		path: '/job/' + jobId + '/state/active',
		method: 'PUT',
	};
	var req = http.request(opts, function(res) {
		if(res.statusCode == 200){
			console.log('update the job -' + jobId + '- state to active.');
		}

		tstMgr_ns.Manager.setCurrentTesting(testingObject);
		testingObject.doCheck(function(err, stdout, stderr) {
			console.log(stdout);

			// caches the messages in the server side.
            testingObject.consoleLog.push({
                'err': err,
                'stdout': stdout
            });
			// write the data to job's log.
			// send message to job queue and add a new job.
			// var data = {'err': err,
			// 			'stdout': stdout};
			
			// data = JSON.stringify(data);  
			// var opts = {
			// 	hostname: tstMgr_ns.Manager.getHostIP(),
			// 	// auth: 'foo:bar',
			// 	port: 3001,
			// 	path: '/job/'+jobId + '/log',
			// 	method: 'POST',
			// 	headers:{
			// 		'Content-Type': 'application/json',
			// 		'Content-Length': data.length
			// 	}
			// };
			// var req = http.request(opts, function(res) {
			// 	if(res.statusCode == 200){
			// 		var body='';
			// 		res.setEncoding('utf8');
			// 		res.on('data', function(d) {
			// 			console.log(d);
			// 		});
			// 	}
			// });
			// req.write(data + '\n');
			// req.end();
		});

	});
	req.end();
}

function doLoopCheckQueuedJobsAndRunTest() {
	// this will make sure the next timeout call will set the this 
	// pointer to ExecutionSequence instead of window object.
	var self = this;
	var callee = arguments.callee;

	setTimeout(function() {
		callee.call(self);
	}, tstMgr_ns.Timeout_PackagesMonitor);

	if (!tstMgr_ns.Manager.isRunningTesting()) {
		// checks if the queued count is non-zero.
		http.get('http://foo:bar@localhost:3001/stats', function(res) {
		  console.log("Got response: " + res.statusCode);
		  res.setEncoding('utf8');
		  res.on('data', function(data) {
				console.log(data);
				var stats = JSON.parse(data);
				if(stats.inactiveCount > 0){   // try get the top queue.
					// start another query.
					// GET /jobs/:type/:state/:from..:to/:order?
					http.get('http://foo:bar@localhost:3001/jobs/rvt2lmv/inactive/0..0/asc', function(res) {
						console.log('Got response of /jobs/rvt2lmv/inactive/0..0/asc: ' + res.statusCode);
						res.setEncoding('utf8');
						res.on('data', function(data) {					
							console.log(data);
							var queuedJob = JSON.parse(data); // is a array with one item.
							var currentJob = queuedJob[0];
							var jobdata = currentJob.data;
							
							var argument = jobdata.title;
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
							var filename = argStrings[1];
							var url = "http://localhost:8888/files/" + filename;

							var filePath = path.join(tstMgr_ns.PackageFolder, 'Custom', filename)
							var file = fs.createWriteStream(filePath);
							http.get(url, function(res) {
								console.log("Got response: " + res.statusCode);
								res.pipe(file);
							}).on('error', function(e) {
								console.log("Got error: " + e.message);
							});

							file.on("close", function(ex) {
								var env = db.envs[envId];
								var packIndex = env.packages.length - packId - 1;
								if(packIndex < 0)
								{
									env.packages.splice(0,0, {
										'name': filename,
										'smokeStatus': 'unknown',
										'isTested': false,
										'id': packId
									});
								}
								runTest(argument, currentJob.id);
							});
						})
					})
				}
			});
		}).on('error', function(e) {
		  console.log("Got error: " + e.message);
		  // setTimeout(function() {
			 //  callee.call(self);
		  // }, tstMgr_ns.Timeout_PackagesMonitor);
		});
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
	else if(err === "HINT")
		socket.emit('test_information_hint', stdout);
}

function sendMessagesToConnections(conns, err, stdout) {
	// body...
	for (var id in conns) {
		var socket = conns[id];
		if (socket.needUpdate_information === undefined || socket.needUpdate_information)
			sendMessagesToSingleConnection(socket, err, stdout);
	}
}