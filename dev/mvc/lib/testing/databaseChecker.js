var fs = require('fs');
var fsextra = require('fs.extra');
var unzip = require('unzip');
var zlib = require('zlib');
var path = require('path');
var jsonComparer = require('./jsonComparer').JsonComparer;
var checkPoint_ns = require('./checkPoint').checkPoint;
var tstMgr_ns = require('../../testManager').testManager;
var txtdiff_ns = require('./textComparer').TextComparer;


var checker = exports.databaseChecker = {}; // new namespace.


checker.DatabaseChecker = function(context, testcase, dbFilePath) {
    this.testcase = testcase;
    this.context = context;
    this.isExecuted = false;
    this.isDone = false;
    this.returnCode = -1;
    this.dbFilePath = dbFilePath;
    this.extractCount = 0;
    this.fileName = '';
    if (!fs.existsSync(this.dbFilePath))
        throw 'The tool does not existed at the give path - ' + this.dbFilePath;

    this.checkPoint = new checkPoint_ns.CheckPoint(checkPoint_ns.DatabaseCheck);
    this.testcase.checkPoints.push(this.checkPoint);
}


// This checker do the following:
// 1. Extract the json files for the give sdb file.
// 2. Adds the check points for the json files.
checker.DatabaseChecker.prototype.checks = function(callback) {
    var scope = this;
    if (scope.extractCount === 2) {
        scope.isDone = true;
        scope.returnCode = 0;
    }
    if (!scope.isExecuted) {
        scope.context.executingCmd = true;
        scope.isExecuted = true;

        if (scope.context.genBenchmarks) {
            // copy the database to benchmarks.
            var destPath = path.join(scope.testcase.benchmarksPath,
                scope.dbFilePath.substr(scope.dbFilePath.lastIndexOf('\\')));
            fsextra.copy(scope.dbFilePath, destPath, function(err) {
                if (err)
                    console.log(err);
                else
                    console.log('Copy the datebase to benchmark folder.');
            });

            scope.isDone = true;
            scope.returnCode = 0;
            scope.context.executingCmd = false;
            scope.checkPoint.setStatus(checkPoint_ns.SUCCESS);
            return;
        }

        var exFolder = scope.dbFilePath.substr(0, scope.dbFilePath.lastIndexOf('\\') + 1);

        // extracts the output.
        var unzipExtractor1 = zlib.createGunzip();
        scope.genDbJsonFilePath = scope.dbFilePath.substr(0, scope.dbFilePath.length - '.gz'.length);
        var outstream = fs.createWriteStream(scope.genDbJsonFilePath);
        fs.createReadStream(scope.dbFilePath).pipe(unzipExtractor1).pipe(outstream);

        outstream.on('close', function(argument) {
            scope.extractCount++;
            scope.checkPoint.setBenchmarkPath(scope.genDbJsonFilePath);
        });

        // extracts the benchmarks.
        var unzipExtractor2 = zlib.createGunzip();
        scope.genBmDbJsonFilePath = scope.genDbJsonFilePath + '.bm.json';
        scope.fileName = scope.dbFilePath.substr(scope.dbFilePath.lastIndexOf('\\') + 1);
        var bmDbJsonFilePath = path.join(tstMgr_ns.BenchmarksFolder, scope.context.envName,
            scope.testcase.args[1], scope.fileName);
        var outstreambm = fs.createWriteStream(scope.genBmDbJsonFilePath);
        fs.createReadStream(bmDbJsonFilePath).pipe(unzipExtractor2).pipe(outstreambm);

        outstreambm.on('close', function(argument) {
            scope.extractCount++;
            scope.checkPoint.setBenchmarkPath(scope.genBmDbJsonFilePath);
        });
    }

    // go next checker if this test is done.
    if (scope.isDone) {
        scope.context.executingCmd = false;
        if (scope.returnCode === 0) {
            if (!fs.existsSync(scope.genBmDbJsonFilePath))
                throw 'The benchmark file for the database file does not existed at - ' +
                    scope.genBmDbJsonFilePath + '.';

            // var bmDbJsonString = fs.readFileSync(scope.genBmDbJsonFilePath, 'utf8');
            // fs.unlinkSync(scope.genBmDbJsonFilePath);
            // var bmDbJsonObj = JSON.parse(bmDbJsonString);

            // var genDbJsonString = fs.readFileSync(scope.genDbJsonFilePath, 'utf8');
            // fs.unlinkSync(scope.genDbJsonFilePath);
            // var genDbJsonObj = JSON.parse(genDbJsonString);

            // if (!jsonComparer.deepCompare(genDbJsonObj, bmDbJsonObj, function(p, gen, bm) {
            //     scope.checkPoint.postCallback(callback, 'ERROR', scope.testcase.prefix + 'Database file -' +
            //         scope.fileName +
            //         '- validation failed, because the values of property -' +
            //         p +
            //         '- are different for generated database json (' +
            //         gen + ') and benchmark database json (' + bm + ').');
            // })) {
            //     return;
            // } else {
            //     scope.checkPoint.setStatus(checkPoint_ns.SUCCESS);
            //     callback('SUCCESS', scope.testcase.prefix + 'The database file -' +
            //         scope.fileName +
            //         '- is identical with the benchmark.');
            // }

            var rst = txtdiff_ns.compareTexts(scope.genDbJsonFilePath, scope.genBmDbJsonFilePath);
            if(rst === null)
            {
                callback('SUCCESS', scope.testcase.prefix + 'The database file -' +
                    scope.fileName +
                    '- is identical with the benchmark.');
                result = true;
            }
            else{
                scope.checkPoint.diffTextPath = scope.genDbJsonFilePath + '_diffText.html';
                // var content = JSON.stringify({content: rst});
                fs.writeFileSync(scope.checkPoint.diffTextPath, rst);
                scope.checkPoint.postCallback(callback, 'ERROR', scope.testcase.prefix + 
                    'The database file -' +
                    scope.fileName +
                    '- is different with the benchmark.');
            }

        } else
            scope.checkPoint.postCallback(callback, 'ERROR',
                scope.testcase.prefix +
                'Failed to extract the json for the give database file - ' +
                scope.dbFilePath + '.');
    }
}