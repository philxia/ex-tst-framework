/**
 * Module dependencies.
 */

var db = require('../../db');
var exec = require('../../execTest');
var tstMgr = require('../../testManager').testManager;

exports.before = function(req, res, next) {
    var pack_id = req.params.pack_id;
    var strs = pack_id.split('&&');
    if (strs.length !== 2)
        throw "Invalid params."

    var envId = parseInt(strs[0]);
    var packId = parseInt(strs[1]);

    var pack = db.envs[envId].packages[packId];
    if (!pack) return next(new Error('Pack not found'));
    pack.envId = envId;
    req.pack = pack;
    next();
};


function sendMessagesToConnections(conns, err, stdout) {
    // body...
    for (var id in conns) {
        var socket = conns[id];
        if (err === "INFO")
            socket.emit('test_information_info', stdout);
        else if (err === "SUCCESS")
            socket.emit('test_information_success', stdout);
        else if (err === "ERROR")
            socket.emit('test_information_error', stdout);
        else if (err === "UPDATE")
            socket.emit('test_information_update', stdout);
    }
}

exports.show = function(req, res, next) {
    var pack = req.pack;
    pack.Message = "";

    var envId = pack.envId;
    var env = db.envs[envId];



    // res.app.render('show', {
    //     layout: false
    // }, function(err, html) {
    //     var response = {
    //         pack: req.pack,
    //         my_html: html
    //     };
    //     res.send(response);
    // });

    // res.render('show', {
    //     pack: req.pack
    // });
    var socket_server = require('../../socket');
    if (!tstMgr)
        throw 'testManager is Invalid.';

    tstMgr.messages.length = 0; //clean the msgs.


    setTimeout(function() {
        // body...
        exec.runTest.executeTest(req.pack, env.path, function(err, stdout, stderr) {
            console.log(stdout);

            if ( !! socket_server && !! socket_server.socket_connections) {
                var conns = socket_server.socket_connections;
                var countOfConns = Object.keys(conns).length;
                // caches the messages if the connections were not setup.
                if (countOfConns < 1) {
                    tstMgr.messages.push({
                        'err': err,
                        'stdout': stdout
                    });
                } else {
                    // send out the cached messages if the connection are setup.
                    if (tstMgr.messages.length > 0) {
                        for (var jj = 0; jj < tstMgr.messages.length; jj++) {
                            var msg = tstMgr.messages[jj];
                            sendMessagesToConnections(conns, msg['err'], msg['stdout']);
                        }
                        tstMgr.messages.length = 0; //clean the messages.
                    }

                    sendMessagesToConnections(conns, err, stdout);
                }

            }
        });
    }, 500);
};

// exports.edit = function(req, res, next) {
//     res.render('edit', {
//         pet: req.pet
//     });
// };

// exports.update = function(req, res, next) {
//     var body = req.body;
//     req.pet.name = body.pet.name;
//     res.message('Information updated!');
//     res.redirect('/pet/' + req.pet.id);
// };