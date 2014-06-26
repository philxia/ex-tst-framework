/**
 * Module dependencies.
 */

var db = require('../../db');
var tstMgr_ns = require('../../testManager').testManager;

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
    // reconstruct the packages RevitExtractor_x64_2015.0.2014.0320.zip
    // with the format as below.
    // th Product
    // th Version
    // th Build Time
    // th Smoke Status
    // th Run Test?
    // th Package
    var env = req.env;
    var fieldcount = env.perChangelist ? 5 : 3;
    var isInTesting = tstMgr_ns.Manager.isRunningTesting();
    var currentRunningTestPackName = (!isInTesting) ? 'none' : tstMgr_ns.Manager.getCurrentTesting().pack.name;
    var currentRunningTestEnvName = (!isInTesting) ? 'none' : tstMgr_ns.Manager.getCurrentTesting().envName;
    var newPackages = [];
    for (var i = 0; i < req.env.packages.length; i++) {
        var pack = req.env.packages[i];
        var packFileName = pack.name;
        var strs = packFileName.split('_');
        // RevitExtractor_x64_CL398396_20140603_0440.zip
        // RevitExtractor_x64_2015.0.2014.0320.zip
        if (strs.length !== fieldcount)
            throw "The package name is changed to " + packFileName + ".";
        pack.product = strs[0];

        if (env.perChangelist) {
            pack.changelist = strs[2];
            pack.buildTime = strs[4][0] + strs[4][1] + ':' + strs[4][2] + strs[4][3] + ' ' +
                strs[3][4] + strs[3][5] + "/" + strs[3][6] + strs[3][7] + "/" + strs[3][0] + strs[3][1] + strs[3][2] + strs[3][3];
        } else {
            var lastString = strs[2];
            strs = lastString.split('.');
            if (strs.length == 5){
                pack.version = strs[0];
                pack.buildTime = strs[3][0] + strs[3][1] + "/" + strs[3][2] + strs[3][3] + "/" + strs[2];
            } else if(strs.length == 6) {
                pack.version = strs[0];
                pack.buildTime = strs[3][0] + strs[3][1] + "/" + strs[3][2] + strs[3][3] + "/" + strs[2] + 
                ' ' + strs[4][0] + strs[4][1] + ':' + 
                strs[4][2] + strs[4][3] + ':' + strs[4][4] + strs[4][5];

            } else
                throw "The package name is changed to " + packFileName + ".";
        }
        pack.status = 'normal';
        if (isInTesting) {
            pack.status = 'disabled';
            if (pack.name === currentRunningTestPackName && req.env.name === currentRunningTestEnvName)
                pack.status = 'onprocess';
        }
    }
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