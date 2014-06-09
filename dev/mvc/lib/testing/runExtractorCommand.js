var fs = require('fs');
var path = require('path');

var checkPoint_ns = require('./checkPoint').checkPoint;
var checkPoint_bubbleValidator = require('./bubbleValidator');
var tstMgr = require('../../testManager').testManager;

var checker = exports.runExtractorCommand = {}; // new namespace.


checker.RunExtractorCommand = function(context, testcase) {
    this.context = context;
    this.testcase = testcase;
    this.isExecuted = false;
    this.isDone = false;
    this.checkPoint = new checkPoint_ns.CheckPoint(checkPoint_ns.ExtractionCheck);
    this.testcase.checkPoints.push(this.checkPoint);
}



// This checker do the following:
// 1. generate the bubble for the give test case.
checker.RunExtractorCommand.prototype.checks = function(callback) {
    var scope = this;
    if (!scope.isExecuted) {
        scope.context.executingCmd = true;
        scope.isExecuted = true;

        var updateObj = {
            testcase: {
                current: this.testcase.index,
                count: this.context.testcaseCount
            }
        };
        callback('UPDATE', JSON.stringify(updateObj));

        var args = new Array(scope.testcase.args.length + 1); // append the "/test" option.
        for (var ii = 0; ii < args.length; ii++) {
            var arg = scope.testcase.args[ii];
            if (ii == 0) {
                arg = path.join(tstMgr.OutputFolder, scope.context.envName, scope.context.packNameWithoutExtension, arg);
            } else if (ii == 1) {
                arg = path.join(tstMgr.ModelsFolder, arg);
            }
            args[ii] = arg;
        }
        args.push("/test");
        var cmd = scope.context.packExePath;
        var util = require('util'),
            spawn = require('child_process').spawn,
            exec = spawn(cmd, args);

        exec.stdout.on('data', function(data) {
            var buff = new Buffer(data);
            var info = buff.toString('utf8');
            console.log('stdout: ' + info);
            callback('INFO', info);
        });

        exec.stderr.on('data', function(data) {
            var buff = new Buffer(data);
            var info = buff.toString('utf8');
            console.log('stdout: ' + info);
            callback('ERROR', info);
        });

        exec.on('exit', function(code) {
            scope.isDone = true;
            scope.returnCode = code;
            console.log('child process exited with code ' + code);
            scope.checkPoint.setStatus(checkPoint_ns.SUCCESS);
            callback('SUCCESS', scope.testcase.prefix + 'Finished the extraction for the give revit model - ' +
                scope.testcase.name + '.');

            // pushes the follow up check points only if the extraction is success.
            scope.context.checkPoints.splice(
                scope.context.currentCheckPointIndex + 1, // inserts the new check points to the next position.
                0, // no removing.
                new checkPoint_bubbleValidator.bubbleValidator.BubbleValidator(scope.context, scope.testcase)
            );
        });
    }

    // go next checker if this test is done.
    if (scope.isDone) {
        scope.context.executingCmd = false;
        if (scope.returnCode != 0)
            scope.checkPoint.postCallback(callback, 'ERROR', 'Failed to extract the revit model.');
    }
}