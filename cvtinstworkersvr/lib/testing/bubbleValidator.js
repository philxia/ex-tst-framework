var fs = require('fs');
var fsextra = require('fs.extra');
var path = require('path');

var checkPoint_bubbleJsonFile = require('./bubbleJsonFileChecker');
var checkPoint_keyFiles = require('./keyFilesChecker');
var checkPoint_resultNotification = require('./resultNotification');
var tstMgr_ns = require('../../testManager').testManager;


var bubbleValidator = exports.bubbleValidator = {};

bubbleValidator.BubbleValidator = function(execTestsObject, testcase) {
    this.testcase = testcase;
    this.context = execTestsObject;
}

function traverFoldersToFindAllBubbleJsons (rootPath, resFiles) {
    var files = fs.readdirSync(rootPath)
    for(var i=0; i<files.length; i++)
    {
        var fpath = path.join(rootPath, files[i]);
        if(fpath.indexOf('bubble.json') > 0)
            resFiles.push(fpath);
        else if(fs.lstatSync(fpath).isDirectory())
            traverFoldersToFindAllBubbleJsons(fpath, resFiles);
    }
}

// this validator only push the sub-checkers.
bubbleValidator.BubbleValidator.prototype.checks = function(callback) {
    if (this.context.genBenchmarks) {
        // create the folder for test case.
        this.testcase.benchmarksPath = path.join(this.context.benchmarksPath, this.testcase.args[1]);
        if (!fs.existsSync(this.testcase.benchmarksPath))
            fsextra.mkdirRecursiveSync(this.testcase.benchmarksPath);
    }
    

    // checks if there is any sub bubbles.
    // 1. get the output folder path.
    var indexJsonPath = this.testcase.args[0];
    var rootFolder = indexJsonPath.substr(0, indexJsonPath.length - 'index.json'.length);
    rootFolder = path.join(tstMgr_ns.OutputFolder,
        this.context.envName,
        this.context.packNameWithoutExtension,
        rootFolder);
    rootFolder = path.join(rootFolder, 'output');

    // 2. get the bubble json pathes.
    var bubblePathes = [];
    this.testcase.keyFilesPath = new Array();
    traverFoldersToFindAllBubbleJsons(rootFolder, bubblePathes);
    for(var i=0; i<bubblePathes.length; i++)
        this.context.checkPoints.splice(
            this.context.currentCheckPointIndex + 1, // inserts the new check points to the next position.
            0, // no removing.
            new checkPoint_bubbleJsonFile.bubbleJsonFileChecker.BubbleJsonFileChecker(
                this.context, this.testcase, bubblePathes[i])
        );


    // locates the index to insert these check points.
    this.context.checkPoints.splice(
        this.context.currentCheckPointIndex + 1 + bubblePathes.length, // inserts the new check points to the next position.
        0, // no removing.
        new checkPoint_keyFiles.keyFilesChecker.KeyFilesChecker(this.context, this.testcase),
        new checkPoint_resultNotification.resultNotification.ResultNotification(this.context, this.testcase)
    );
}