var fs = require('fs');
var http = require('http');
var fsextra = require('fs.extra');
var path = require('path');
var rimraf = require('rimraf');

var checkPoint_ns = require('./checkPoint').checkPoint;
var tstMgr_ns = require('../../testManager').testManager;
var db = require('../../db');

var checker = exports.resultNotification = {};


checker.ResultNotification = function(context, testcase) {
	this.testcase = testcase;
	this.context = context;
}


checker.ResultNotification.prototype.safeDelete = function(folder) {
	var scope = this;
	if(scope.isSafeToDel){
		rimraf(folder, function() {
			console.log('The package output at ' + folder + ' has been removed successfully.');
		});        
	}
	else{
		setTimeout(function () {
		   scope.safeDelete(folder);
		}, 10000);        
	}
}

function updatestats (jobId, success, fail, count) {
	var stats = (success === count)? 'complete': 'failed';
	// update the status according the result.
	// send the sign to queue to active the job.
	var opts = {
		hostname: tstMgr_ns.Manager.getHostIP(),
		port: 3001,
		path: '/job/' + jobId + '/state/' + stats,
		method: 'PUT',
	};
	var req = http.request(opts, function(res) {
		if(res.statusCode == 200){
			console.log('update the job -' + jobId + '- state to ' + stats + '.');
		}

	});
	req.end();
}

checker.ResultNotification.prototype.updateJobData = function(success, fail, count) {
	var data = {
		'success':success,
		'fail':fail,
		'count':count
	};
	data = JSON.stringify(data);  
	var opts = {
		hostname: tstMgr_ns.Manager.getHostIP(),
		auth: 'foo:bar',
		port: 3001,
		path: '/job/' + this.context.jobId,
		method: 'POST',
		headers:{
			'Content-Type': 'application/json',
			'Content-Length': data.length
		}
	};
	var jobId = this.context.jobId;
	var req = http.request(opts, function(res) {
		if(res.statusCode == 200){
			var body='';
			res.setEncoding('utf8');
			res.on('data', function(d) {
				console.log(d);
			})

			if(success+fail === count) // need to update the status
			{
				updatestats(jobId, success, fail, count);
			}
		}
	});
	req.write(data + '\n');
	req.end();
}


checker.ResultNotification.prototype.checks = function(callback) {
	var checkPntCount = this.testcase.checkPoints.length;
	if (checkPntCount < 1)
		throw 'No check points for the given testcase - ' + this.testcase.name;

	var successCount = 0;
	for (var ii = 0; ii < this.testcase.checkPoints.length; ii++) {
		var checkPnt = this.testcase.checkPoints[ii];
		if (checkPnt.getStatus() === checkPoint_ns.SUCCESS)
			successCount++;
	}

	// always create the result folder.
	var testcaseNameWithoutExtension = this.testcase.name;
	testcaseNameWithoutExtension = 
		testcaseNameWithoutExtension.substr(0, testcaseNameWithoutExtension.lastIndexOf('.'));
	var resultPathForThisCase = path.join(tstMgr_ns.ResultsFolder,
		this.context.envName,
		this.context.packNameWithoutExtension,
		this.testcase.path,
		testcaseNameWithoutExtension);
	if(!fs.existsSync(resultPathForThisCase))
		fsextra.mkdirpSync(resultPathForThisCase);

	if (successCount === checkPntCount) {
		this.testcase.status = checkPoint_ns.SUCCESS;
		callback('SUCCESS', this.testcase.prefix + 'All check points are passed!');
		this.context.successCount ++;
	} else {
		this.context.failureCount ++;
		this.testcase.status = checkPoint_ns.FAILURE;
		callback('ERROR', this.testcase.prefix +
			successCount + ' check points passed and ' +
			(checkPntCount - successCount) + ' check points failed.');

		// copy the output to results folder.
		var outputPathForThisCase = path.join(tstMgr_ns.OutputFolder,
			this.context.envName,
			this.context.packNameWithoutExtension,
			this.testcase.path,
			testcaseNameWithoutExtension);
		if (fs.existsSync(outputPathForThisCase)) {
			var resultPathForThisCase = path.join(tstMgr_ns.ResultsFolder,
				this.context.envName,
				this.context.packNameWithoutExtension,
				this.testcase.path,
				testcaseNameWithoutExtension);
			var scope = this;
			scope.isSafeToDel = false;
			fsextra.copyRecursive(outputPathForThisCase, resultPathForThisCase, function() {
				console.log('Copy the result from ' + outputPathForThisCase + ' to ' + resultPathForThisCase);

				// remove this output.
				fsextra.removeSync(outputPathForThisCase);
				scope.isSafeToDel = true;
			});
		}
	}

	var updateObj = {
		jobresult: {
			failures: this.context.failureCount,
			success: this.context.successCount,
			count: this.context.testcaseCount,
			id: this.context.packNameWithoutExtension
		}
	};
	callback('UPDATE', JSON.stringify(updateObj));

	this.updateJobData(this.context.successCount, this.context.failureCount, 
		this.context.testcaseCount);

	// extract the performance data from the log for this test.
	var logfiles = fs.readdirSync(tstMgr_ns.LogFolder);
	if(Array.isArray(logfiles) && logfiles.length > 0)
	{

		String.prototype.trim = function() {
			return this.replace(/(^\s*)|(\s*$)/g, "");
		}

		var TAG = "PerfEvent{";
		var TAG_2DS = "'Export DWFx For Views.";


		// RevitExtractor_Client.log.2014-09-13
		var clientLogs = new Array();
		logfiles.forEach(function(v, i, arr) {
			if(v.indexOf('RevitExtractor_Client.log.') === 0)
				clientLogs.push(v);
		});
		clientLogs.sort();
		var logcontent = new Array();
		clientLogs.forEach(function (v, i, arr) {
			logcontent.push(fs.readFileSync(path.join(tstMgr_ns.LogFolder,v), 'utf8'));
		});
		var content = logcontent.join('\n');

		// parse the log.
		var lines = content.split('\n');
		var lineCount = lines.length;
		var perfObjs = new Array();
		for(var ii=0; ii<lineCount; ii++)
		{
			var line = lines[ii];
			if(!line.trim())
				continue;

			// find the perf tag
			var index = line.indexOf(TAG);
			if(index < 0)
				continue;

			line = line.substr(index+TAG.length);
			var vars = line.split(',');
			var perfObject = {};
			vars.forEach(function(value, index, arr) {
				var pairs = value.split('=');
				if(!(Array.isArray(pairs) && pairs.length === 2))
					return;
				//m_runId='', m_cntr='Export SVF For 3D Views', m_eventId='33afee0b-c8eb-4364-96ec-fb0202bd5a33', 
				// m_parentId='06a0fe4e-83d2-4ddb-a5f2-75dd546c5365', m_elapsedTime=330523, m_startTime=1410535269781, 
				// m_endTime=1410535600304, m_version='v1', m_status='completed', m_ip='10.148.204.157', options={}

				var pk = pairs[0].trim();
				var pv = pairs[1].trim();
				// console.log("=== " + pk + " " + pv);
				switch(pk)
				{
					case 'm_cntr':
						{
							var nameString = pv;
							if(pv === "'Export SVF For 3D Views'")
								nameString = "3dsvf";
							else if(pv === "'Resolve the link files'")
								nameString = "opendoc-relinks";
							else if(pv === "'Open RVT file'")
								nameString = "opendoc";
							else if(pv === "'Export property database'")
								nameString = "database";
							else if(pv === "'Close RVT file'")
								nameString = "closedoc";
							else if(pv === "'Export PNG for Views'")
								nameString = "thumbnail";
							else if(pv === "'RVT Conversion'")
								nameString = "totaltime";

							//m_cntr='Export DWFx For Views. Sheets: 593, other 2D Views: 0 '
							if(pv.indexOf(TAG_2DS)==0)
							{
								var cc = pv.substr(TAG_2DS.length).split(',');
								var ccs = cc[0].split(':');
								if(ccs[0].trim() == "Sheets")
									perfObject.count = parseInt(ccs[1]);
								nameString = "2ddwfx";
							}

							perfObject.name = nameString;
						}
						break;
					case 'm_elapsedTime':
						{
							//in Milliseconds
							perfObject.time = parseInt(pv)/1000;// to second.
						}
					default:
						break;
				}
			});

			console.log(JSON.stringify(perfObject));
			perfObjs.push(perfObject);
		}// end of read log content.

		this.testcase.pref = perfObjs;

		var csvContent = new Array();
		perfObjs.forEach(function(v, i, arr) {
			if(v.name === "totaltime")
				return;
			else
				csvContent.push(v.name+"-end, "+v.time );
		});
		csvContent = csvContent.join('\n');
		// write the perf result to csv file.
		fs.writeFileSync(
			path.join(resultPathForThisCase,'cvnperf.csv'), csvContent);

		// clean the logs.
		rimraf.sync(tstMgr_ns.LogFolder);
	}

	// all the case are tested.
	if (this.testcase.index === this.context.testcaseCount) {
		var ttSuccess = 0;
		for (var jj = 0; jj < this.context.testcaseCount; jj++) {
			var tc = this.context.cases[jj];
			if (tc.status === checkPoint_ns.SUCCESS)
				ttSuccess++;
		}
		var failuresCount = (this.context.testcaseCount - ttSuccess);

		var btnId = tstMgr_ns.Action_BrowseResult + '_' + this.context.envId + '_' + this.context.packId +
			' ' + this.context.pack.name;

		//done.
		var updateObj = {
			result: {
				failures: failuresCount,
				success: ttSuccess,
				count: this.context.testcaseCount,
				buttonId: btnId
			}
		};
		callback('UPDATE', JSON.stringify(updateObj));


		// serializes the result to results folder.
		var packName = this.context.pack.name;
		var packFolderName = packName.substr(0, packName.length - '.zip'.length);
		var resultString = !(failuresCount) ? checkPoint_ns.SUCCESS : checkPoint_ns.FAILURE;
		var resultFolder = path.join(tstMgr_ns.ResultsFolder, this.context.envName, packFolderName);
		while (!fs.existsSync(resultFolder))
			fs.mkdirSync(resultFolder);

		var resultFilePathForPack = path.join(resultFolder, resultString + '.txt');
		var resultFileContent = JSON.stringify(this.context.consoleLog);
		fs.writeFileSync(resultFilePathForPack, resultFileContent);

		// update the pack information in db.
		this.context.pack.isTested = true;
		this.context.pack.smokeStatus = resultString;

		// clean the output for this package.
		var outputFolderPath = path.join(tstMgr_ns.OutputFolder, this.context.envName, packFolderName);
		//rimraf.sync(outputFolderPath);

		// loop delay 1 min the delete in case we are still in copying action.
		this.safeDelete(outputFolderPath);

		// generate the package.json.
		var packagejson = {};
		packagejson.title = this.context.packNameWithoutExtension;
		packagejson.result = updateObj.result;
		packagejson.cases = this.context.cases;
		// write the perf result to csv file.
		fs.writeFileSync(
			path.join(resultFolder,'package.json'), JSON.stringify(packagejson));


		// clean up the status.
		this.context.currentRunningTestCaseIndex = -1;
		this.context.status = "completed";
		this.context.testcaseCount = 0;
		this.context.failures = 0;
		this.context.success = 0;
		delete this.context.cases;


		// update the paga.
		if ( !! tstMgr_ns.Manager)
			tstMgr_ns.Manager.resetCurrentTesting();
	}
}