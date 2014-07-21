/**
 * Module dependencies.
 */

var db = require('../../db');
var tstMgr_ns = require('../../testManager').testManager;
var suites = require('../../lib/testSuites').suites;


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
        envs: db.envs,
        suites: suites
    });
};


exports.show = function(req, res, next) {
    res.render('show', {
        suites: suites
    });
};