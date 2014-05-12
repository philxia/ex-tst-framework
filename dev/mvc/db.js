// faux database


// var pets = exports.pets = [];

// pets.push({
//     name: 'Tobi',
//     id: 0
// });
// pets.push({
//     name: 'Loki',
//     id: 1
// });
// pets.push({
//     name: 'Jane',
//     id: 2
// });
// pets.push({
//     name: 'Raul',
//     id: 3
// });

// var users = exports.users = [];

// users.push({
//     name: 'TJ',
//     pets: [pets[0], pets[1], pets[2]],
//     id: 0
// });
// users.push({
//     name: 'Guillermo',
//     pets: [pets[3]],
//     id: 1
// });
// users.push({
//     name: 'Nathan',
//     pets: [],
//     id: 2
// });

// var server_release = '\\\\usmanpdglstr01\\revit\\Cloud\\RevitExtractor\\Dev\\';
var server_dev = '\\\\manrevstore04\\Data\\Cloud\\RevitExtractor\\Dev';
var server_release = '\\\\manrevstore04\\Data\\Cloud\\RevitExtractor\\Release';

var envs = exports.envs = [];
envs.push({
    name: 'Release',
    packages: null,
    path: server_release,
    id: 0
});
envs.push({
    name: 'Development',
    packages: null,
    path: server_dev,
    id: 1
});


// get all the files in these two folders.
var fs = require('fs');
fs.readdir(server_dev, function(err, files) {
    if ( !! err)
        console.log(err);

    var fileinfos = [];
    for (var i = 0; i < files.length; i++) {
        fileinfos.push({
            'name': files[i],
            'isTested': false,
            'id': i
        });
    }

    envs[1].packages = fileinfos;
});


fs.readdir(server_release, function(err, files) {
    if ( !! err)
        console.log(err);

    var fileinfos = [];
    for (var i = 0; i < files.length; i++) {
        fileinfos.push({
            'name': files[i],
            'isTested': false,
            'id': i
        });
    }
    envs[0].packages = fileinfos;
});