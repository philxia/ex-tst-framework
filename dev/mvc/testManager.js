var fs = require('fs');
var path = require('path');

var testManager = exports.testManager = {};


testManager.messages = new Array();

testManager.PackageFolder = 'd:\\tf\\packs\\';

testManager.OutputFolder = 'd:\\tf\\output\\';

testManager.ModelsFolder = 'd:\\tf\\models\\';

testManager.ResultsFolder = 'd:\\tf\\results\\';

testManager.BenchmarksFolder = 'd:\\tf\\benchmarks\\';

testManager.ToolsFolder = 'd:\\tf\\tools\\';

testManager.server_dev = '\\\\manrevstore04\\Data\\Cloud\\RevitExtractor\\Dev';
testManager.server_release = '\\\\manrevstore04\\Data\\Cloud\\RevitExtractor\\Release';


testManager.Action_RunTest = 'runTest';
testManager.Action_BrowseResult = 'browseResult';
testManager.Action_MonitorTest = 'monitorTest';


testManager.Timeout_PackagesMonitor = 600000; // 10 min



/////////////////////////////////////////////////////////////////////////////
// global methods

testManager.addMessage = function(msg) {
    this.messages.push(msg);
}

testManager.sortPackagesWithDate = function(packs) {
    if (!Array.isArray(packs))
        throw 'The argument is not an array.';
    if (packs.length < 1)
        return packs;

    var templateFilePrefix = packs[0].substr(0, 'RevitExtractor_x64_XXXX.X.'.length);

    var fileNameInInts = new Array();
    for (var k = 0; k < packs.length; k++) {
        // sample: RevitExtractor_x64_2015.0.2014.0519.zip
        var fileName = packs[k];
        fileName = fileName.substr(templateFilePrefix.length, '2014.0519'.length);
        fileName = fileName.replace('.', '');
        fileNameInInts.push(parseInt(fileName));
    }
    fileNameInInts.sort().reverse();

    var fileinfos = new Array();
    for (var i = 0; i < fileNameInInts.length; i++) {
        var fileNameInInt = fileNameInInts[i];
        var fileNamePart = fileNameInInt.toString();
        var sfileName = templateFilePrefix + fileNamePart.substr(0, 4) + '.' + fileNamePart.substr(4, 4) + '.zip';
        fileinfos.push(sfileName);
    }
    return fileinfos;
}

testManager.getLatestPackage = function(env) {
    // 1. checks the server dev.
    var packsInServer = fs.readdirSync(env.path);
    var sortedPacksInServer = this.sortPackagesWithDate(packsInServer);

    var dbpacks = env.packages;
    var diffcount = sortedPacksInServer.length - dbpacks.length;
    if (diffcount < 1)
        return null;

    for (var ii = dbpacks.length; ii < sortedPacksInServer.length; ii++) {
        env.packages.splice(0, 0, {
            'name': sortedPacksInServer[ii],
            'smokeStatus': 'unknown',
            'isTested': false,
            'id': ii
        });
    }

    // 2. get the latest one.
    return sortedPacksInServer[0];
}

/////////////////////////////////////////////////////////////////////////////
// TestManager class methods
testManager.TestManager = function() {

    this.application = null;
    this.currentTesting = null;
}


testManager.TestManager.prototype.setApplication = function(app) {
    this.application = app;
};

testManager.TestManager.prototype.isRunningTesting = function() {
    return !!(this.currentTesting)
};

testManager.TestManager.prototype.setCurrentTesting = function(curTesting) {
    this.currentTesting = curTesting;
};

testManager.TestManager.prototype.resetCurrentTesting = function() {
    this.currentTesting = null;
};



testManager.TestManager.prototype.getCurrentTesting = function() {
    return this.currentTesting;
};

testManager.Manager = new testManager.TestManager();