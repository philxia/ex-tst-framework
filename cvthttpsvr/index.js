/**
 * Module dependencies.
 */

var express = require('..');
var logger = require('morgan');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var provides = require('./middleware/provides');
var cors = require('cors');
var passport = require('passport');

var fs = require('fs');
var fsextra = require('fs.extra');
var path = require('path');
var http = require('http');

var tstMgr_ns = require('./testManager').testManager;
var db = require('./db');
var suites = require('./lib/testSuites').suites;

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

app.use(cors());


app.get('/result/:env/:title', provides('json'), function(req, res) {
	var envid = req.params.env;
	var title = req.params.title;
	var envName = tstMgr_ns.getEnvName(parseInt(envid));

	var url = path.join(tstMgr_ns.ResultsFolder, envName, title, 'package.json');
	if(!fs.existsSync(url))
	{
		res.status(404);
		return;
	}

	fs.readFile(path.join(tstMgr_ns.ResultsFolder, envName, title, 'package.json'), function(err, data) {
		if(err)
		{
			console.log(err);
			res.status(500);
		}
		var resultObj = JSON.parse(data.toString('utf8'));
		res.send({result: resultObj});	
	});
});


app.get('/historyPerf/:evnId/:suiteId', provides('json'), function(req, res) {
	var suiteId = parseInt(req.params.suiteId);
	var envId = parseInt(req.params.evnId);
	var envName = tstMgr_ns.getEnvName(envId);

	if(suiteId < 0 || suiteId > suites.smoke.suites.length)
	{
		res.status(404);
		return;
	}

	try{
		var suite = suites.smoke.suites[suiteId];
		var sname = suite.name;
		sname = sname.substr(0, sname.length-'.rvt'.length);
		var spath = suite.path;
		var resfolder = path.join(tstMgr_ns.ResultsFolder, envName);
		var folders = fs.readdirSync(resfolder);
		var result = {};
		var count = 0;
		folders.forEach(function(v, i, arr) {
			var perfFile = path.join(resfolder, v, spath, sname, 'cvnperf.csv');
			if(!fs.existsSync(perfFile))
				return;
			var perfcont = fs.readFileSync(path.join(resfolder, v, spath, sname, 'cvnperf.csv'), 'utf8');
			if(perfcont.length < 1)
				return;
			var lines = perfcont.split('\n');
			var obj = {};
			lines.forEach(function(v1, i1, arr1) {
				var ws = v1.split(',');
				obj[ws[0].trim()] = parseFloat(ws[1].trim());
			});
			result[v] = obj;
			count ++;
		});
		result.count = count;
		result.information = suite;

		res.status(200).send(result);
	}
	catch(err)
	{
		res.status(500).send({message: err.toString('utf8')});
	}
});

// generate the baseline for the given task.
app.post('/generatebaseline', function(req, res){
	var body = req.body;
	var suiteId = body.suiteId;

	var suite = suites.smoke.suites[suiteId];

	// first remove the old baseline if have.
	var baselinePath = path.join(tstMgr_ns.BenchmarksFolder, suite.path, suite.name);
	if(fs.existsSync(baselinePath))
		fsextra.removeSync(baselinePath);

	var pack = db.envs[2].packages[0];

	// use the latest ReleasePerCL to build the baseline.
	var argument = tstMgr_ns.Action_GenerateBenchmarks + "_2_" + suiteId + ' ' + pack.name;
	createNewJob(argument, 'baseline generator', [suite]);
	res.send({ message: 'baseline job created'});
});

// create new job api with the json input {packId, envId, filename}
app.post('/create', function (req, res) {
	var job = req.body;
	var packId = job.packId;
	var filename = job.filename;
	var envId = parseInt(job.envId);

	// finished the download.
	// env id for custom is 4.
	if(envId === 4)
		packId = fs.readdirSync( path.join(tstMgr_ns.ResultsFolder, 'Custom')).length;
	

	db.envs[envId].packages.splice(0,0, {
		'name': filename,
		'smokeStatus': 'unknown',
		'isTested': false,
		'id': packId
	});
	var argument = 'runTest_'+envId + '_'+packId+' ' + filename;

	// copy the file to 
	var url = "http://localhost:8888/files/" + filename;
	var envName = tstMgr_ns.getEnvName(parseInt(envId));
	var filePath = path.join(tstMgr_ns.PackageFolder, envName, filename);
	var file = fs.createWriteStream(filePath);
	http.get(url, function(res) {
		console.log("Got response: " + res.statusCode);
		res.pipe(file);
	}).on('error', function(e) {
		console.log("Got error: " + e.message);
	});

	
	file.on("close", function(ex) {
		createNewJob(argument, 'phil.xia');
		res.send({ message: 'job created'});
	});

});

app.post('/login', 
	passport.authenticate('local', { 
		successRedirect: '/',
		failureRedirect: '/login' }));



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

	doLoopCheckPackagesAndRunTest();
}

function createNewJob (argument, owner, suites) {
	// send message to job queue and add a new job.
	var data = {
		'type': 'rvt2lmv',
		'data': {
			'title': argument,
			'owner': owner,
			'success':0,
			'fail':0,
			'count':0,
			'suites': suites
		},
		'options': {
			'priority': 'high'
		}
	};
	data = JSON.stringify(data);  
	var opts = {
		hostname: tstMgr_ns.Manager.getHostIP(),
		// auth: 'foo:bar',
		port: 3001,
		path: '/job',
		method: 'POST',
		headers:{
			'Content-Type': 'application/json',
			'Content-Length': data.length
		}
	};
	var req = http.request(opts, function(res) {
		if(res.statusCode == 200){
			var body='';
			res.setEncoding('utf8');
			res.on('data', function(d) {
				console.log(d);
				// var job = JSON.parse(d);
				// runTest(argument, job.id, true);
			})
		}

	});
	req.write(data + '\n');
	req.end();
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
		auth: 'foo:bar',
		port: 3001,
		path: '/job/' + jobId + '/state/active',
		method: 'PUT',
	};
	var req = http.request(opts, function(res) {
		if(res.statusCode == 200){
			console.log('update the job -' + jobId + '- state to active.');
		}

	});
	req.end();

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


function copyFile(source, target, cb) {
    var cbCalled = false;

    var rd = fs.createReadStream(source);
    rd.on("error", function(err) {
        done(err);
    });
    var wr = fs.createWriteStream(target);
    wr.on("error", function(err) {
        done(err);
    });
    wr.on("close", function(ex) {
        done();
    });
    rd.pipe(wr);

    function done(err) {
        if (!cbCalled) {
            cb(err);
            cbCalled = true;
        }
    }
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
			// skip the custom pack.
			if(db.envs[ii].id === 4)
				continue;
			var lastestpack = tstMgr_ns.getLatestPackage(db.envs[ii]);
			if ( !! lastestpack) {
				var packId = tstMgr_ns.Action_RunTest + '_' +
					db.envs[ii].id + '_' + lastestpack.id + ' ' + lastestpack.name;
				// runTest(packId);

				var owner = tstMgr_ns.getEnvName(ii);
				// copy the package to local.
				var serverFilePath = path.join(db.envs[ii].path, lastestpack.name);
				var filePath = path.join(tstMgr_ns.PackageFolder, owner, lastestpack.name);
				copyFile(serverFilePath, filePath, function(err) {
					if(err)
					{
						console.log(err.toString('utf8'));
					}	
					else
					{
						createNewJob(packId, owner);
					}
				});
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