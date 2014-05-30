var http = require('http');
var fs = require('fs');
var unzip = require('unzip');
// var checkPoint_ns = require('./lib/testing/checkPoint').checkPoint;
var checkPoint_processPackgeCmd = require('./lib/testing/processPackageCommand');
var checkPoint_runExtractorCommand = require('./lib/testing/runExtractorCommand');

var runTest = exports.runTest = {};
runTest.cases = null;
runTest.status = "waiting";
runTest.currentRunningTestCaseIndex = -1;
runTest.testcaseCount = 0;
runTest.failures = 0;
runTest.success = 0;


///////////////////////////////////////////////////////////////////////////////////////////////////////////
// new framework based on the state machine.
// Testing object constructor.
runTest.Testing = function(pack, envName, serverPath) {
    // load the test suites.
    var suitesString = fs.readFileSync(".\\mvc\\tools\\testSuites.json", "utf8");
    var suites = JSON.parse(suitesString);
    var suitesName = suites.name;
    var testcases = suites.suites;
    var testcaseCount = suites.suites.length;
    // if (testcaseCount < 0)
    //     callback('INFO', 'No test suties.');

    this.checkPoints = new Array();
    this.currentCheckPointIndex = 0;
    this.IsPause = false;
    this.executingCmd = false;
    this.consoleLog = new Array(); // caches the console log for displaying and final result serialization.

    // caches the test suites information.
    this.status = "inprocess";
    this.currentRunningTestCaseIndex = 0;
    this.testcaseCount = testcaseCount;
    this.cases = testcases;
    this.consoleLog.length = 0; // chean the console cache.
    this.envName = envName;

    this.pack = pack;
    var packName = pack.name;
    this.packNameWithoutExtension = packName.substr(0, packName.length - '.zip'.length);
    this.serverPath = serverPath;



    // add a command to process the package.
    this.checkPoints.push(new checkPoint_processPackgeCmd.processPackageCommand.ProcessPackageCommand(this));

    // push the testcase to checkPoints.
    for (var ii = 0; ii < this.testcaseCount; ii++) {
        var testcase = testcases[ii];
        // initialize the success and failures;
        testcase.checkPoints = new Array();
        testcase.index = ii + 1;
        testcase.prefix = '[The ' + testcase.index + 'th test case] ';
        this.checkPoints.push(
            new checkPoint_runExtractorCommand.runExtractorCommand.RunExtractorCommand(this, testcase));
    }
}


// runTest.Testing.prototype.executeTest = function(pack, envName, serverPath, callback) {
//     this.doCheck(callback);
// }
runTest.Testing.prototype.getChecker = function() {
    if (this.currentCheckPointIndex < this.checkPoints.length)
        return this.checkPoints[this.currentCheckPointIndex];

    return null;
}

runTest.Testing.prototype.doCheck = function(callback) {
    var checker = this.getChecker();
    if (!checker) // end of testing.
    {
        // setTimeout(endOfExecutionCallback, 500);
        return;
    }

    var func = checker['checks'];
    if (!func)
        throw 'The checker does not know how to check the point.';

    func.call(checker, callback);

    var timeOutInterval = 0;
    if (this.executingCmd)
        timeOutInterval = 500;

    if (this.executingCmd === false && this.IsPause === false)
        this.currentCheckPointIndex++;

    // this will make sure the next timeout call will set the this 
    // pointer to ExecutionSequence instead of window object.
    var self = this;
    var callee = arguments.callee;
    setTimeout(function() {
        callee.call(self, callback);
    }, timeOutInterval);
}


//
///////////////////////////////////////////////////////////////////////////////////////////////////////////
// runTest.copyFile = function(source, target, cb) {
//     var cbCalled = false;

//     var rd = fs.createReadStream(source);
//     rd.on("error", function(err) {
//         done(err);
//     });
//     var wr = fs.createWriteStream(target);
//     wr.on("error", function(err) {
//         done(err);
//     });
//     wr.on("close", function(ex) {
//         done();
//     });
//     rd.pipe(wr);

//     function done(err) {
//         if (!cbCalled) {
//             cb(err);
//             cbCalled = true;
//         }
//     }
// }
// runTest.runSingleTest = function(cmd, callback) {
//     var scope = this;
//     if (scope.currentRunningTestCaseIndex >= scope.testcaseCount) {
//         // clean up the status.
//         scope.currentRunningTestCaseIndex = -1;
//         scope.status = "completed";
//         scope.testcaseCount = 0;
//         delete scope.cases;
//         return;
//     }

//     var testcase = scope.cases[scope.currentRunningTestCaseIndex];
//     if (!testcase)
//         return;

//     var index = (scope.currentRunningTestCaseIndex + 1);

//     var updateObj = {
//         testcase: {
//             count: scope.testcaseCount,
//             current: index
//         }
//     };
//     callback('UPDATE', JSON.stringify(updateObj));

//     var prefix = '[The ' + index + 'th test case] ';
//     testcase.prefix = prefix;
//     callback('SUCCESS', prefix + 'The RevitExtractor start to extract the file - ' + testcase.name + '.');

//     // check bubble
//     bv.bubbleValidator.validateBubbleJson(testcase, callback);
//     return;

//     var util = require('util'),
//         spawn = require('child_process').spawn,
//         exec = spawn(cmd, testcase.args);

//     exec.stdout.on('data', function(data) {
//         var buff = new Buffer(data);
//         var info = buff.toString('utf8');
//         console.log('stdout: ' + info);
//         callback('INFO', info);
//     });

//     exec.stderr.on('data', function(data) {
//         console.log('stderr: ' + data);
//         callback('ERROR', data);
//     });

//     exec.on('exit', function(code) {
//         console.log('child process exited with code ' + code);
//         callback('SUCCESS', prefix + 'The RevitExtractor exited with the code - ' + code + '.');

//         // check bubble
//         if (!bv.bubbleValidator.validateBubbleJson(testcase, callback))
//             scope.failures++;
//         else
//             scope.success++;


//         scope.currentRunningTestCaseIndex++;
//         if (scope.currentRunningTestCaseIndex < scope.testcaseCount) {
//             setTimeout(function() {
//                 scope.runSingleTest(cmd, callback);
//             }, 3000);
//         } else {
//             //done.
//             var updateObj = {
//                 result: {
//                     failures: scope.failures,
//                     success: scope.success,
//                     count: scope.testcaseCount
//                 }
//             };
//             callback('UPDATE', JSON.stringify(updateObj));
//             // clean up the status.
//             scope.currentRunningTestCaseIndex = -1;
//             scope.status = "completed";
//             scope.testcaseCount = 0;
//             scope.failures = 0;
//             scope.success = 0;
//             delete scope.cases;
//             return;
//         }

//     });
// }

// runTest.executeTest2 = function(pack, serverPath, callback) {
//     // make up a command name.
//     var exFolder = 'C:\\Users\\xiap\\Documents\\GitHub\\express\\dev\\RevitExtractor_x64_2015.0.2014.0508';
//     var cmd = exFolder + "\\Program\\RevitExtractor.exe"; // + ".\\index.json .\\2015\\Simple_model.rvt \\no2d";

//     // load the test suites.
//     var suitesString = fs.readFileSync(".\\mvc\\tools\\testSuites.json", "utf8");
//     var suites = JSON.parse(suitesString);

//     var suitesName = suites.name;
//     var testcases = suites.suites;
//     var testcaseCount = suites.suites.length;
//     if (testcaseCount < 0)
//         callback('INFO', 'No test suties.');

//     // caches the test suites information.
//     this.status = "inprocess";
//     this.currentRunningTestCaseIndex = 0;
//     this.testcaseCount = testcaseCount;
//     this.cases = testcases;

//     this.runSingleTest(cmd, callback);
// }

// runTest.executeTest2 = function(pack, serverPath, callback) {
//     // 1. download the packge from server & extract the package.
//     var url = pack.name;

//     if (fs.existsSync(url))
//         fs.unlink(url, function(err) {
//             if (err) throw err;
//             console.log("'successfully deleted");
//         })

//     callback('Success', 'Begin to copy the package - ' + url + '.\n');
//     this.copyFile(serverPath + "\\" + url, url, function(arg) {
//         // body...
//         callback('Success', 'End to copy the package - ' + url + '.\n');

//         // unzip the package.
//         var exFolder = url.substr(0, url.length - 4); //remove the extension.
//         // fs.createReadStream(url).pipe(unzip.Extract({
//         //     path: exFolder
//         // }));

//         var unzipExtractor = unzip.Extract({
//             path: exFolder
//         });
//         unzipExtractor.on('error', function(err) {
//             throw err;
//         });
//         unzipExtractor.on('close', function() {
//             // 2. run the package.
//             var cmd = exFolder + "\\Program\\RevitExtractor.exe " + ".\\index.json .\\2015\\Simple_model.rvt \\no2d";
//             // var exec = require('child_process').exec,
//             //     child;
//             // child = exec(cmd, function(err, stdout, stderr) {
//             //     callback(err, stdout, stderr)
//             // });

//             var util = require('util'),
//                 spawn = require('child_process').spawn,
//                 exec = spawn(cmd);

//             exec.stdout.on('data', function(data) {
//                 console.log('stdout: ' + data);
//                 callback('SUCCESS', data);
//             });

//             exec.stderr.on('data', function(data) {
//                 console.log('stderr: ' + data);
//                 callback('ERROR', data);
//             });

//             exec.on('exit', function(code) {
//                 console.log('child process exited with code ' + code);
//                 callback('SUCCESS', 'child process exited with code ' + code);
//             });
//         });
//         fs.createReadStream(url).pipe(unzipExtractor);
//         callback('Success', 'Extract the package to - ' + exFolder + '\\Program\\*.*.\n');
//     });
// }