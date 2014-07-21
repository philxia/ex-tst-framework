var fs = require('fs');
var fsextra = require('fs.extra');
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
    this.ziptoolPath = path.join(tstMgr.testManager.ToolsFolder, '7Zip\\7z.exe');
    if(!fs.existsSync(this.ziptoolPath))
        throw 'The zip tool does not exist.';
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

    var exFolder = localPath.substr(0, localPath.length - 4); //remove the extension.
    var outputFolder = (scope.context.envId == 4)? "ReleaseX64" : "Program";
    if(!fs.existsSync(exFolder))
        fs.mkdirSync(exFolder);
    this.context.packExePath = path.join(exFolder, outputFolder, 'RevitExtractor.exe');    
    if (!fs.existsSync(this.context.packExePath)) {
        var util = require('util'),
            spawn = require('child_process').spawn,
            exec = spawn(this.ziptoolPath, ["x", localPath, "-o" + exFolder + ""]);

        exec.stdout.on('data', function(data) {
            var buff = new Buffer(data);
            var info = buff.toString('utf8');
            console.log('stdout: ' + info);
            callback('INFO', info);
        });

        exec.stderr.on('data', function(data) {
            var buff = new Buffer(data);
            var info = buff.toString('utf8');
            console.log('stdout: ' + info);
            callback('ERROR', info);
        });

        exec.on('error', function(data) {
            var buff = new Buffer(data);
            var info = buff.toString('utf8');
            console.log('stderr: ' + info);    
            scope.isDone = true;
            scope.returnCode = -1;
        });

        exec.on('exit', function(code) {
            scope.isDone = true;
            scope.returnCode = 0;

            callback('SUCCESS', 'Finished the extraction for the package to - ' + exFolder + '\\'+ outputFolder +
                '\\*.*.\n');

            // add NoDynamicText.testconfig file to the 2014 and 2015 folders.
            var programFolderPath = path.join(exFolder, outputFolder);
            var files = fs.readdirSync(programFolderPath);
            for (var ii = 0; ii < files.length; ii++) {
                if (fs.lstatSync(path.join(programFolderPath, files[ii])).isDirectory()) {
                    var destPath = path.join(exFolder, outputFolder, files[ii], 'NoDynamicText.testconfig');
                    fsextra.copy('.\\mvc\\NoDynamicText.testconfig', destPath, function(err) {
                        if (err)
                            console.log(err);
                    });
                }
            }
        });
    } else {
        callback('SUCCESS', 'The package is already existed at - ' + exFolder + '\\Program\\*.*.\n');
        scope.isDone = true;
        scope.returnCode = 0;
    }
}


checker.ProcessPackageCommand.prototype.extractPackage2 = function(localPath, callback) {
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

            // add NoDynamicText.testconfig file to the 2014 and 2015 folders.
            var programFolderPath = path.join(exFolder, '\\Program\\');
            var files = fs.readdirSync(programFolderPath);
            for (var ii = 0; ii < files.length; ii++) {
                if (fs.lstatSync(path.join(programFolderPath, files[ii])).isDirectory()) {
                    var destPath = path.join(exFolder, '\\Program\\', files[ii], 'NoDynamicText.testconfig');
                    fsextra.copy('.\\mvc\\NoDynamicText.testconfig', destPath, function(err) {
                        if (err)
                            console.log(err);
                    });
                }
            }
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