var fs = require('fs');
var path = require('path');
var checkPoint_ns = require('./checkPoint').checkPoint;
var tstMgr_ns = require('../../testManager').testManager;

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
    var outputImage = '';
    // sample: svf_thumb.exe .\Result\RME_One_of_Each_Imperial\output\Resource\3D_View\_3D_\_3D_.svf -size=1024 -outpath=./Result/RME_One_of_Each_Imperial/
    // The svf_thumb is using GI with path tracing. If you want consistent renders you can use an
    // image compare with tolerance (I can give you one) or you can generate the thumbnail use –bounce=0 
    // to turn off path tracing. This will ensure that only the geometry + direct light is rendered and 
    // allows you to validate consistently over time.
    this.svf2ImageToolArgs = [this.svfFilePath, '-size=1024', '–bounce=0'];

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
    if (this.isDone) {
        this.context.executingCmd = false;
        if (scope.returnCode === 0) {
            this.checkPoint.setStatus(checkPoint_ns.SUCCESS);
            // add a image compare checker to the next for benchmark.
            callback('SUCCESS', this.testcase.prefix + 'Generates the image for the give svf at ' + '.');

        } else
            this.checkPoint.postCallback(callback, 'ERROR',
                this.testcase.prefix +
                'Failed to generate the image for the give svf file - ' +
                this.svfFilePath + '.');
    }
}