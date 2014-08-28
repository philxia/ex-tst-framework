var fs = require('fs');
var cmd_svf2Image = require('./svf2ImageCommand');
var dbChecker = require('./databaseChecker');
var cmd_dwfx2Image = require('./dwfx2ImageCommand');

var checker = exports.keyFilesChecker = {};

checker.KeyFilesChecker = function(context, testcase) {
    this.testcase = testcase;
    this.context = context;
}


// This checker do the following:
// 1. check if the test case bubble json is existed.
// 2. compare the gen bubble.json to benchmarks bubble.json.
// 3. check if the key files existed.
checker.KeyFilesChecker.prototype.checks = function(callback) {


    if (!this.testcase['keyFilesPath'])
        throw 'Testing framework error: The testcase.keyFilesPath property does not existed.'

    var filesPath = this.testcase['keyFilesPath'];

    // 1. generate the new checkers for the different files.
    for (var jj = 0; jj < filesPath.length; jj++) {
        // 4.1 conver to image if the file is svf.
        var filePath = filesPath[jj];
        var fileExtension = filePath.substr(filePath.lastIndexOf('.'));
        if (fileExtension === '.svf') {
            // locates the index to insert these check points.
            var currentFolder = filePath.substr(0, filePath.lastIndexOf('\\') + 1);
            this.context.checkPoints.splice(
                this.context.currentCheckPointIndex + 1, // inserts the new check points to the next position.
                0, // no removing.
                new cmd_svf2Image.svf2ImageCommand.Svf2ImageCommand(this.context, this.testcase, filePath),
                new dbChecker.databaseChecker.DatabaseChecker(this.context, this.testcase, currentFolder + 'objects_attrs.json.gz'),
                new dbChecker.databaseChecker.DatabaseChecker(this.context, this.testcase, currentFolder + 'objects_avs.json.gz'),
                // new dbChecker.databaseChecker.DatabaseChecker(this.context, this.testcase, currentFolder + 'objects_ids.json.gz'),
                new dbChecker.databaseChecker.DatabaseChecker(this.context, this.testcase, currentFolder + 'objects_offs.json.gz'),
                new dbChecker.databaseChecker.DatabaseChecker(this.context, this.testcase, currentFolder + 'objects_vals.json.gz')            );

        } else if (fileExtension == '.dwfx') {

            this.context.checkPoints.splice(
                this.context.currentCheckPointIndex + 1, // inserts the new check points to the next position.
                0, // no removing.
                new cmd_dwfx2Image.dwfx2ImageCommand.Dwfx2ImageCommand(this.context, this.testcase, filePath)
            );
        }
    }

}