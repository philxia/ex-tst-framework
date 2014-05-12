/**
 * Module dependencies.
 */

var db = require('../../db');
var exec = require('../../execTest');

exports.before = function(req, res, next) {
    var pack_id = req.params.pack_id;
    var strs = pack_id.split('&&');
    if (strs.length !== 2)
        throw "Invalid params."

    var envId = parseInt(strs[0]);
    var packId = parseInt(strs[1]);

    var pack = db.envs[envId].packages[packId];
    if (!pack) return next(new Error('Pack not found'));
    req.pack = pack;
    next();
};

exports.show = function(req, res, next) {
    res.render('show', {
        pack: req.pack
    });

    var pack_id = req.params.pack_id;
    var strs = pack_id.split('&&');
    if (strs.length !== 2)
        throw "Invalid params."

    var envId = parseInt(strs[0]);
    var env = db.envs[envId];

    exec.runTest.executeTest(req.pack, env.path, function(err, stdout, stderr) {
        req.pack.Message = stdout;
        // res.render('show', {
        //     pack: req.pack,
        //     layout: false
        // })
    });
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