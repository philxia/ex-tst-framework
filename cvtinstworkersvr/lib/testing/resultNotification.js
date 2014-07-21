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
    var req = http.request(opts, function(res) {
        if(res.statusCode == 200){
            var body='';
            res.setEncoding('utf8');
            res.on('data', function(d) {
                console.log(d);
            })
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
        var testcaseNameWithoutExtension = this.testcase.name;
        testcaseNameWithoutExtension = testcaseNameWithoutExtension.substr(0, testcaseNameWithoutExtension.lastIndexOf('.'));
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
        // clean up the status.
        this.context.currentRunningTestCaseIndex = -1;
        this.context.status = "completed";
        this.context.testcaseCount = 0;
        this.context.failures = 0;
        this.context.success = 0;
        delete this.context.cases;

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

        // update the paga.
        if ( !! tstMgr_ns.Manager)
            tstMgr_ns.Manager.resetCurrentTesting();
    }
}