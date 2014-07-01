var fs = require('fs');
var fsextra = require('fs.extra');
var path = require('path');
var checkPoint_ns = require('./checkPoint').checkPoint;
var tstMgr_ns = require('../../testManager').testManager;
var imageChecker = require('./imagesChecker');

var checker = exports.svf2ImageCommand = {}; // new namespace.


checker.Svf2ImageCommand = function(context, testcase, svfFilePath) {
    this.testcase = testcase;
    this.context = context;
    this.isExecuted = false;
    this.isDone = false;
    this.svfFilePath = svfFilePath;
    this.svf2ImageToolPath = path.join(tstMgr_ns.ToolsFolder, "\\SvfTexThumbExtractor\\svf_thumb.exe");
    if (!fs.existsSync(this.svf2ImageToolPath))
        throw 'The tool does not existed at the give path - ' + this.svf2ImageToolPath;
    if (!fs.existsSync(this.svfFilePath))
        throw 'The file does not existed at the give path - ' + this.svfFilePath;
    this.outputImagePath = this.svfFilePath + '.png01_thumb_512x512.png';
    // sample: svf_thumb.exe .\Result\RME_One_of_Each_Imperial\output\Resource\3D_View\_3D_\_3D_.svf -size=1024 -outpath=./Result/RME_One_of_Each_Imperial/
    // The svf_thumb is using GI with path tracing. If you want consistent renders you can use an
    // image compare with tolerance (I can give you one) or you can generate the thumbnail use –bounce=0 
    // to turn off path tracing. This will ensure that only the geometry + direct light is rendered and 
    // allows you to validate consistently over time.
    this.svf2ImageToolArgs = [this.svfFilePath, '-size=512', '-depth=2'];

    this.checkPoint = new checkPoint_ns.CheckPoint(checkPoint_ns.View3DCheck_Svf2Image);
    this.testcase.checkPoints.push(this.checkPoint);
}


// This checker do the following:
// 1. generate the image for the give svf file.

checker.Svf2ImageCommand.prototype.checks = function(callback) {
    var scope = this;
    if (!this.isExecuted) {
        this.context.executingCmd = true;
        this.isExecuted = true;

        var util = require('util'),
            spawn = require('child_process').spawn,
            exec = spawn(this.svf2ImageToolPath, this.svf2ImageToolArgs);

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

            if (scope.context.genBenchmarks) {
                var destPath = path.join(scope.testcase.benchmarksPath,
                    scope.outputImagePath.substr(scope.outputImagePath.lastIndexOf('\\')));
                fsextra.copy(scope.outputImagePath, destPath, function(err) {
                    if (err)
                        console.log(err);
                    else
                        console.log('Copy the generated image to benchmark folder.');
                });
            } else {
                // add a image compare checker to the next for benchmark.
                scope.context.checkPoints.splice(
                    scope.context.currentCheckPointIndex + 1, // inserts the new check points to the next position.
                    0, // no removing.
                    new imageChecker.imageChecker.ImageChecker(scope.context, scope.testcase, scope.outputImagePath, 1000, true)
                );
            }
            callback('SUCCESS', scope.testcase.prefix + 'Generates the image for the give svf at ' + scope.outputImagePath + '.');

        } else
            scope.checkPoint.postCallback(callback, 'ERROR',
                scope.testcase.prefix +
                'Failed to generate the image for the give svf file - ' +
                scope.svfFilePath + '.');
    }
}