var fs = require('fs');
var path = require('path');

var testManager = exports.testManager = {};


testManager.messages = new Array();

testManager.PackageFolder = 'd:\\tf\\packs\\';

testManager.OutputFolder = 'd:\\tf\\output\\';

testManager.ModelsFolder = 'd:\\tf\\models\\';

testManager.ResultsFolder = 'd:\\tf\\results\\';

testManager.BenchmarksFolder = 'd:\\tf\\benchmarks\\';

testManager.CustomPacksFolder = 'd:\\tf\\packs\\Custom\\'

testManager.ToolsFolder = 'd:\\tf\\tools\\';

testManager.LogFolder = 'C:\\Log\\rvt\\';

testManager.server_dev = '\\\\manrevstore04\\Data\\Cloud\\RevitExtractor\\Dev'; //'\\\\Shasrvbsd02\\Dataxfer\\Phil Xia\\pack';
testManager.server_devperchangelist = '\\\\usmanpdglstr01\\revit\\Cloud\\RevitExtractor\\Dev';
testManager.server_release = '\\\\manrevstore04\\Data\\Cloud\\RevitExtractor\\Release';
testManager.server_relperchangelist = '\\\\usmanpdglstr01\\revit\\Cloud\\RevitExtractor\\Release';


testManager.Action_RunTest = 'runTest';
testManager.Action_BrowseResult = 'browseResult';
testManager.Action_MonitorTest = 'monitorTest';
testManager.Action_GenerateBenchmarks = 'generateBenchmarks';
testManager.Action_RunTestForCustomPackage = 'runCTest';


testManager.Timeout_PackagesMonitor = 6000; // 10 min



/////////////////////////////////////////////////////////////////////////////
// global methods

testManager.getEnvName = function(id) {
    switch(id)
    {
        case 0:
            return 'DevelopmentPerCL';
        case 1:
            return 'Development';
        case 2:
            return 'ReleasePerCL';
        case 3:
            return 'Release';
        case 5:
            return 'Custom';
        default:
            throw 'Not supported id for env.';
    }
}

testManager.addMessage = function(msg) {
    this.messages.push(msg);
}

testManager.sortPackagesWithDate = function(files, perChangelist) {
    if (!Array.isArray(files))
        throw 'The argument is not an array.';
    if (files.length < 1)
        return files;

    var templateFilePrefix = (perChangelist) ?
        files[0].substr(0, 'RevitExtractor_x64_CL'.length) :
        files[0].substr(0, 'RevitExtractor_x64_XXXX.X.'.length);

    var templateFilePostfix = (perChangelist) ?
        files[0].substr(templateFilePrefix.length, '409980'.length) :
        files[0].substr(templateFilePrefix.length, '2014.0519'.length);

    var fileNameInInts = new Array();
    var map = {};
    for (var k = 0; k < files.length; k++) {
        // sample: RevitExtractor_x64_2015.0.2014.0519.zip
        var fileName = files[k];
        if (perChangelist) {
            //RevitExtractor_x64_CL409980_20140603_0440.zip
            fileName = fileName.substr(templateFilePrefix.length, templateFilePostfix.length);
        } else {
            fileName = fileName.substr(templateFilePrefix.length, templateFilePostfix.length);
            fileName = fileName.replace('.', '');
        }
        var key = parseInt(fileName);
        fileNameInInts.push(key);
        map[key] = files[k];
    }
    fileNameInInts.sort().reverse();

    var fileinfos = new Array();
    for (var i = 0; i < fileNameInInts.length; i++) {
        var fileNameInInt = fileNameInInts[i];
        var fileNamePart = fileNameInInt.toString();
        var sfileName = map[fileNameInInt];
        fileinfos.push(sfileName);
    }
    return fileinfos;
}

testManager.getLatestPackage = function(env) {
    // 1. checks the server dev.
    var packsInServer = fs.readdirSync(env.path);
    var sortedPacksInServer = this.sortPackagesWithDate(packsInServer, env.perChangelist);

    var dbpacks = env.packages;
    if (!dbpacks)
        return null;

    var diffcount = sortedPacksInServer.length - dbpacks.length;
    if (diffcount < 1)
        return null;

    for (var ii = dbpacks.length; ii < sortedPacksInServer.length; ii++) {
        env.packages.splice(0, 0, {
            'name': sortedPacksInServer[ii - dbpacks.length],
            'smokeStatus': 'unknown',
            'isTested': false,
            'id': ii
        });
    }

    // 2. get the latest one.
    return env.packages[0];
}

/////////////////////////////////////////////////////////////////////////////
// TestManager class methods
testManager.TestManager = function() {

    this.application = null;
    this.currentTesting = null;
    function getHostIP () {
        var os=require('os');
        var ifaces=os.networkInterfaces();
        for (var dev in ifaces) {
            ifaces[dev].forEach(function(details){
                if(details.family=='IPv4' && dev === 'Local Area Connection')
                    return details.address;
            });
        }
    }
    this.hostIP = getHostIP();
}

testManager.TestManager.prototype.getHostIP = function() {
    if(!this.hostIP){
        var scope = this;
        var os=require('os');
        var ifaces=os.networkInterfaces();
        for (var dev in ifaces) {
            ifaces[dev].forEach(function(details){
                if(details.family=='IPv4' && dev === 'Local Area Connection')
                    scope.hostIP = details.address;
            });
        }
    }
    return this.hostIP;
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