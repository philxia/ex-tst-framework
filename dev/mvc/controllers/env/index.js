/**
 * Module dependencies.
 */

var db = require('../../db');

exports.before = function(req, res, next) {
    var id = req.params.env_id;
    if (!id) return next();
    // pretend to query a database...
    process.nextTick(function() {
        req.env = db.envs[id];
        // cant find that user
        if (!req.env) return next(new Error('Environment not found'));
        // found it, move on to the routes
        next();
    });
};

exports.list = function(req, res, next) {
    res.render('list', {
        envs: db.envs
    });
};

// exports.edit = function(req, res, next) {
//     res.render('edit', {
//         user: req.user
//     });
// };

exports.show = function(req, res, next) {
    res.render('show', {
        env: req.env
    });
};
// exports.update = function(req, res, next) {
//     var body = req.body;
//     req.user.name = body.user.name;
//     res.message('Information updated!');
//     res.redirect('/user/' + req.user.id);
// };