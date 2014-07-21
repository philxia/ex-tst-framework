var fs = require('fs');
var fsextra = require('fs.extra');


var genBenchmarksCommand = exports.genBenchmarksCommand = {};

genBenchmarksCommand.GenBenchmarksCommand = function(execTestsObject, testcase) {
    this.testcase = testcase;
    this.context = execTestsObject;
}

// this validator only push the sub-checkers.
genBenchmarksCommand.GenBenchmarksCommand.prototype.checks = function(callback) {



}


