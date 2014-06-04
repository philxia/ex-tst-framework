var fs = require('fs');
var path = require('path');
var unzip = require('unzip');

var checkPoint_ns = require('./checkPoint').checkPoint;
var tstMgr = require('../../testManager');

var checker = exports.processPackageCommand = {}; // new namespace.


checker.ProcessPackageCommand = function(context) {
    this.context = context;
    this.isExecuted = false;
    this.isDone = false;

    this.packName = this.context.pack.name;
    this.serverPath = this.context.serverPath;
}

checker.ProcessPackageCommand.prototype.copyFile = function(source, target, cb) {
    var cbCalled = false;

    var rd = fs.createReadStream(source);
    rd.on("error", function(err) {
        done(err);
    });
    var wr = fs.createWriteStream(target);
    wr.on("error", function(err) {
        done(err);
    });
    wr.on("close", function(ex) {
        done();
    });
    rd.pipe(wr);

    function done(err) {
        if (!cbCalled) {
            cb(err);
            cbCalled = true;
        }
    }
}


checker.ProcessPackageCommand.prototype.extractPackage = function(localPath, callback) {
    var scope = this;
    // unzip the package.
    var exFolder = localPath.substr(0, localPath.length - 4); //remove the extension.
    this.context.packExePath = path.join(exFolder, '\\Program\\RevitExtractor.exe');
    if (!fs.existsSync(this.context.packExePath)) {
        var unzipExtractor = unzip.Extract({
            path: exFolder
        });
        unzipExtractor.on('error', function(err) {
            scope.returnCode = -1;
        });
        unzipExtractor.on('close', function() {
            scope.isDone = true;
            scope.returnCode = 0;

            callback('SUCCESS', 'Finished the extraction for the package to - ' + exFolder + '\\Program\\*.*.\n');
        });
        fs.createReadStream(localPath).pipe(unzipExtractor);
    } else {
        callback('SUCCESS', 'The package is already existed at - ' + exFolder + '\\Program\\*.*.\n');
        scope.isDone = true;
        scope.returnCode = 0;
    }

}


// This checker do the following:
// 1. generate the image for the give svf file.

checker.ProcessPackageCommand.prototype.checks = function(callback) {
    var scope = this;
    if (!scope.isExecuted) {
        scope.context.executingCmd = true;
        scope.isExecuted = true;

        var localPath = path.join(tstMgr.testManager.PackageFolder, scope.context.envName, scope.packName);
        // removes the existing one.
        if (fs.existsSync(localPath)) {
            //fs.unlinkSync(localPath);
            scope.extractPackage(localPath, callback)
        } else {
            var serverPath = path.join(scope.serverPath, scope.packName);
            callback('INFO', 'Start to copy the package from ' + serverPath + ' to local.\n');
            scope.copyFile(serverPath, localPath, function(arg) {
                // body...
                callback('SUCCESS', 'Finished the copying for package from ' + serverPath + ' to local.\n');
                scope.extractPackage(localPath, callback);
            });
        }
    }

    // go next checker if this test is done.
    if (scope.isDone) {
        scope.context.executingCmd = false;
        if (scope.returnCode != 0)
            callback('ERROR', 'Failed to extract the package.');
    }
}