var fs = require('fs');
var path = require('path');
var tstMgr_ns = require('../testManager').testManager;
var checkPoint_ns = require('./testing/checkPoint').checkPoint;


var suites = exports.suites = {};

var suitesString = fs.readFileSync("./mvc/lib/testSuites.json", "utf8");
var sm = JSON.parse(suitesString);
suites.smoke = sm;


