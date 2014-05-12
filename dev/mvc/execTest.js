var http = require('http');
var fs = require('fs');
var unzip = require('unzip');


var runTest = exports.runTest = {};

runTest.copyFile = function(source, target, cb) {
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

runTest.executeTest = function(pack, serverPath, callback) {
    // 1. download the packge from server & extract the package.
    var url = pack.name;

    if (fs.existsSync(url))
        fs.unlink(url, function(err) {
            if (err) throw err;
            console.log("'successfully deleted");
        })

    this.copyFile(serverPath + "\\" + url, url, function(arg) {
        // body...
        callback('Success', 'End to copy the package - ' + url + '.\n');

        // unzip the package.
        var exFolder = url.substr(0, url.length - 4); //remove the extension.
        fs.createReadStream(url).pipe(unzip.Extract({
            path: exFolder
        }));
        callback('Success', 'Extract the package to - ' + exFolder + '\\Program\\*.*.\n');

        // 2. run the package.
        var cmd = ".\\Program\\Program\\RevitExtractor.exe";
        var exec = require('child_process').exec,
            child;
        child = exec(cmd, function(err, stdout, stderr) {
            callback(err, stdout, stderr)
            // console.log('stdout: ' + stdout);
            // console.log('stderr: ' + stderr);
            // if (err !== null) {
            //     console.log('exec error: ' + err);
            // }
        });
    });




}