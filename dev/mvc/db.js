var fs = require('fs');
var path = require('path');
var tstMgr_ns = require('./testManager').testManager;
var checkPoint_ns = require('./lib/testing/checkPoint').checkPoint;



exports.server_ip = '';

var envs = exports.envs = [];
envs.push({
    name: 'DevelopmentPerCL',
    packages: null,
    path: tstMgr_ns.server_devperchangelist,
    id: 0,
    perChangelist: true
});
envs.push({
    name: 'Development',
    packages: null,
    path: tstMgr_ns.server_dev,
    id: 1,
    perChangelist: false
});




function loadPackagesInformation(err, files, envIndex) {
    if ( !! err)
        console.log(err);

    if (files.length < 1)
        return;

    var env = envs[envIndex];

    var sortedfiles = tstMgr_ns.sortPackagesWithDate(files, env.perChangelist);

    var fileinfos = [];
    for (var i = 0; i < sortedfiles.length; i++) {
        var sfileName = sortedfiles[i];
        fileinfos.push({
            'name': sfileName,
            'smokeStatus': 'unknown',
            'isTested': false,
            'id': (sortedfiles.length - i - 1)
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
fs.readdir(tstMgr_ns.server_devperchangelist, function(err, files) {
    loadPackagesInformation(err, files, 0);
});


fs.readdir(tstMgr_ns.server_dev, function(err, files) {
    loadPackagesInformation(err, files, 1);
});