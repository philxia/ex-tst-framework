var fs = require('fs');
var path = require('path');
var tstMgr_ns = require('../testManager').testManager;
var checkPoint_ns = require('./testing/checkPoint').checkPoint;


var suites = exports.suites = {};

var suitesString = fs.readFileSync("./cvthttpsvr/lib/testSuites.json", "utf8");
var sm = JSON.parse(suitesString);
var id = 0;
sm.suites.forEach(function(v, i, arr) {
	v.id = id;
	id++;
})
suites.smoke = sm;


