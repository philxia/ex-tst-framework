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
envs.push({
    name: 'ReleasePerCL',
    packages: null,
    path: tstMgr_ns.server_relperchangelist,
    id: 2,
    perChangelist: true
});
envs.push({
    name: 'Release',
    packages: null,
    path: tstMgr_ns.server_release,
    id: 3,
    perChangelist: false
});
envs.push({
    name: 'Custom',
    packages: null,
    path: tstMgr_ns.CustomPacksFolder,
    id: 4,
    perChangelist: false
})




function loadPackagesInformation(err, files, envIndex) {
    if ( !! err)
        console.log(err);

    if (files.length < 1)
    {
        envs[envIndex].packages = new Array();
        return;
    }
    
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

function loadCustomPackageInformation (err, files, envIndex) {
    if ( !! err)
        console.log(err);

    if (files.length < 1)
    {
        envs[envIndex].packages = new Array();
        return;
    }
    
    var env = envs[envIndex];
    files.sort().reverse();

    var fileinfos = [];
    for (var i = 0; i < files.length; i++) {
        fileinfos.push({
            'name': files[i] + '.zip',
            'smokeStatus': 'unknown',
            'isTested': false,
            'id': (files.length - i - 1)
        });
    }

    for (var j = fileinfos.length-1; j >=0; j--) {
        var name = fileinfos[j].name;
        var resultFilePath = path.join(tstMgr_ns.ResultsFolder, envs[envIndex].name, name.substr(0, name.lastIndexOf('.')));
        var isSuccess = fs.existsSync(path.join(resultFilePath, checkPoint_ns.SUCCESS + '.txt'));
        var isFailure = fs.existsSync(path.join(resultFilePath, checkPoint_ns.FAILURE + '.txt'));
        // skip the folder if there is no result file.
        if(!isSuccess && !isFailure)
            fileinfos.splice(j,1);
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
    if(err)
    {
        console.log(err);
        return;
    }
    loadPackagesInformation(err, files, 0);
});

fs.readdir(tstMgr_ns.server_dev, function(err, files) {
    if(err)
    {
        console.log(err);
        return;
    }
    loadPackagesInformation(err, files, 1);
});

fs.readdir(tstMgr_ns.server_relperchangelist, function(err, files) {
    if(err)
    {
        console.log(err);
        return;
    }
    loadPackagesInformation(err, files, 2);
});

fs.readdir(tstMgr_ns.server_release, function(err, files) {
    if(err)
    {
        console.log(err);
        return;
    }
    loadPackagesInformation(err, files, 3);
});

fs.readdir(path.join(tstMgr_ns.ResultsFolder, 'Custom'), function(err, files) {
    if(err)
    {
        console.log(err);
        return;
    }
    loadCustomPackageInformation(err, files, 4);
});