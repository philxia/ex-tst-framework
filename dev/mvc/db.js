var fs = require('fs');
var path = require('path');
var tstMgr_ns = require('./testManager').testManager;
var checkPoint_ns = require('./lib/testing/checkPoint').checkPoint;



exports.server_ip = '';

var envs = exports.envs = [];
envs.push({
    name: 'Release',
    packages: null,
    path: tstMgr_ns.server_release,
    id: 0
});
envs.push({
    name: 'Development',
    packages: null,
    path: tstMgr_ns.server_dev,
    id: 1
});




function loadPackagesInformation(err, files, envIndex) {
    if ( !! err)
        console.log(err);

    if (files.length < 1)
        return;

    var templateFilePrefix = files[0].substr(0, 'RevitExtractor_x64_XXXX.X.'.length);

    var fileNameInInts = new Array();
    for (var k = 0; k < files.length; k++) {
        // sample: RevitExtractor_x64_2015.0.2014.0519.zip
        var fileName = files[k];
        fileName = fileName.substr(templateFilePrefix.length, '2014.0519'.length);
        fileName = fileName.replace('.', '');
        fileNameInInts.push(parseInt(fileName));
    }
    fileNameInInts.sort().reverse();



    var fileinfos = [];
    for (var i = 0; i < fileNameInInts.length; i++) {
        var fileNameInInt = fileNameInInts[i];
        var fileNamePart = fileNameInInt.toString();
        var sfileName = templateFilePrefix + fileNamePart.substr(0, 4) + '.' + fileNamePart.substr(4, 4) + '.zip';
        fileinfos.push({
            'name': sfileName,
            'smokeStatus': 'unknown',
            'isTested': false,
            'id': (fileNameInInts.length - i - 1)
        });
    }

    for (var j = 0; j < fileinfos.length; j++) {
        var name = fileinfos[j].name;
        var resultFilePath = path.join(tstMgr_ns.ResultsFolder, envs[envIndex].name, name.substr(0, name.length - '.zip'.length));
        var isSuccess = fs.existsSync(path.join(resultFilePath, checkPoint_ns.SUCCESS + '.txt'));
        var isFailure = fs.existsSync(path.join(resultFilePath, checkPoint_ns.FAILURE + '.txt'));
        if (isSuccess || isFailure)
            fileinfos[j].isTested = true;
        if (isSuccess)
            fileinfos[j].smokeStatus = checkPoint_ns.SUCCESS;
        else if (isFailure)
            fileinfos[j].smokeStatus = checkPoint_ns.FAILURE;
    }

    envs[envIndex].packages = fileinfos;
}

// get all the files in these two folders.
var fs = require('fs');
fs.readdir(tstMgr_ns.server_dev, function(err, files) {
    loadPackagesInformation(err, files, 1);
});


fs.readdir(tstMgr_ns.server_release, function(err, files) {
    loadPackagesInformation(err, files, 0);
});