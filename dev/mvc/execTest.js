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

    this.successCount = 0;
    this.failureCount = 0;
    this.abortCount = 0;

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