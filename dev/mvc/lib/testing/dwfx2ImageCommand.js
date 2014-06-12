var fs = require('fs');
var path = require('path');
var checkPoint_ns = require('./checkPoint').checkPoint;
var tstMgr_ns = require('../../testManager').testManager;
var imageChecker = require('./imagesChecker');

var checker = exports.dwfx2ImageCommand = {}; // new namespace.


checker.Dwfx2ImageCommand = function(context, testcase, dwfxFilePath) {
    this.testcase = testcase;
    this.context = context;
    this.isExecuted = false;
    this.isDone = false;
    this.dwfxFilePath = dwfxFilePath;
    this.dwfx2ImageToolPath = path.join(tstMgr_ns.ToolsFolder, "\\Dwf2Png\\Dwf2Png.exe");
    if (!fs.existsSync(this.dwfx2ImageToolPath))
        throw 'The tool does not existed at the give path - ' + this.dwfx2ImageToolPath;
    if (!fs.existsSync(this.dwfxFilePath))
        throw 'The file does not existed at the give path - ' + this.dwfxFilePath;
    this.outputImagePath = this.dwfxFilePath + '.png';
    // sample: Dwf2Png.exe .\2d.dwfx .\2d.png
    this.dwfx2ImageToolArgs = [this.dwfxFilePath, this.outputImagePath];


    this.checkPoint = new checkPoint_ns.CheckPoint(checkPoint_ns.View2DCheck_dwfx2Image);
    this.testcase.checkPoints.push(this.checkPoint);
}


// This checker do the following:
// 1. generate the image for the give svf file.

checker.Dwfx2ImageCommand.prototype.checks = function(callback) {
    var scope = this;
    if (!scope.isExecuted) {
        scope.context.executingCmd = true;
        scope.isExecuted = true;

        var util = require('util'),
            spawn = require('child_process').spawn,
            exec = spawn(scope.dwfx2ImageToolPath, scope.dwfx2ImageToolArgs);

        exec.stdout.on('data', function(data) {
            var buff = new Buffer(data);
            var info = buff.toString('utf8');
            console.log('stdout: ' + info);
            // callback('INFO', info);
        });

        exec.stderr.on('data', function(data) {
            var buff = new Buffer(data);
            var err = buff.toString('utf8');
            console.log('stderr: ' + err);
            // callback('ERROR', data);
        });

        exec.on('error', function(data) {
            var buff = new Buffer(data);
            var info = buff.toString('utf8');
            console.log('stderr: ' + info);    
            scope.isDone = true;
            scope.returnCode = -1;
        });

        exec.on('exit', function(code) {
            scope.isDone = true;
            scope.returnCode = code;
        });
    }

    // go next checker if this test is done.
    if (scope.isDone) {
        scope.context.executingCmd = false;
        if (scope.returnCode === 0) {
            scope.checkPoint.setStatus(checkPoint_ns.SUCCESS);
            // add a image compare checker to the next for benchmark.
            scope.context.checkPoints.splice(
                scope.context.currentCheckPointIndex + 1, // inserts the new check points to the next position.
                0, // no removing.
                new imageChecker.imageChecker.ImageChecker(scope.context, scope.testcase, scope.outputImagePath, 50)
            );
            callback('SUCCESS', scope.testcase.prefix + 'Generates the image for the give dwfx at ' +
                scope.outputImagePath + '.');

        } else
            scope.checkPoint.postCallback(callback, 'ERROR',
                scope.testcase.prefix +
                'Failed to generate the image for the give dwfx file - ' +
                scope.dwfxFilePath + '.');
    }
}