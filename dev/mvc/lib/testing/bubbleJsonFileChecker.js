var fs = require('fs');
var fsextra = require('fs.extra');
var path = require('path');
var jsonComparer = require('./jsonComparer').JsonComparer;
var checkPoint_ns = require('./checkPoint').checkPoint;
var tstMgr_ns = require('../../testManager').testManager;


var checker = exports.bubbleJsonFileChecker = {};


checker.BubbleJsonFileChecker = function(context, testcase) {
    this.testcase = testcase;
    this.context = context;
    this.testcase.keyFilesPath = new Array();
}

function traverBubbleChildren(bubble, func) {
    // body...
    if ( !! func)
        func(bubble);

    if (!bubble['children'])
        return;

    for (var ii = 0; ii < bubble.children.length; ii++) {
        traverBubbleChildren(bubble.children[ii], func);
    }
}

// This checker do the following:
// 1. check if the test case bubble json is existed.
// 2. compare the gen bubble.json to benchmarks bubble.json.
// 3. check if the key files existed.
checker.BubbleJsonFileChecker.prototype.checks = function(callback) {
    var scope = this;
    var checkPoint = new checkPoint_ns.CheckPoint(checkPoint_ns.BubbleFileCheck);
    this.testcase.checkPoints.push(checkPoint);

    // 1. check if the test case bubble json is existed.
    var indexJsonPath = this.testcase.args[0];
    var genBubbleOutputPath = indexJsonPath.substr(0, indexJsonPath.length - 'index.json'.length);
    genBubbleOutputPath = path.join(tstMgr_ns.OutputFolder,
        this.context.envName,
        this.context.packNameWithoutExtension,
        genBubbleOutputPath);
    var generatedBubbleJsonFilePath = path.join(genBubbleOutputPath, 'output\\bubble.json');
    if (!fs.existsSync(generatedBubbleJsonFilePath)) {
        checkPoint.postCallback(callback, 'ERROR', this.testcase.prefix + 'Failed to generate the bubble.json file.');
        return false;
    } else
        callback('SUCCESS', this.testcase.prefix + 'The bubble.json file is generated.');

    // 2. read the json to object.
    var genBubbleJsonObj = null;
    try {
        var genBubbleJsonString = fs.readFileSync(generatedBubbleJsonFilePath, "utf8");
        genBubbleJsonObj = JSON.parse(genBubbleJsonString);

        if (scope.context.genBenchmarks) {
            var bmBubbleJsonFilePath = path.join(scope.context.benchmarksPath, this.testcase.args[1], '\\bubble.json');
            fsextra.copy(generatedBubbleJsonFilePath, bmBubbleJsonFilePath, function(err) {
                if (err)
                    console.log(err);
                else
                    console.log('Copy the bubble to benchmark folder.');
            });

        } else {
            var bmBubbleJsonFilePath = path.join(tstMgr_ns.BenchmarksFolder, this.context.envName, this.testcase.args[1], '\\bubble.json');
            if (!fs.existsSync(bmBubbleJsonFilePath))
                throw 'The benchmark bubble.json for this case does not existed.';
            var bmBubbleJsonString = fs.readFileSync(bmBubbleJsonFilePath, 'utf8');
            var bmBubbleJsonObj = JSON.parse(bmBubbleJsonString);

            // compare the 2 json objects.
            if (!jsonComparer.deepCompare(genBubbleJsonObj, bmBubbleJsonObj, function(p, gen, bm) {
                checkPoint.postCallback(callback, 'ERROR', scope.testcase.prefix + 'Bubble.json file validation failed, because the values of property -' + p + '- are different for generated bubble (' +
                    gen + ') and benchmark bubble (' + bm + ').');
            })) {
                checkPoint.postCallback(callback, 'ERROR', this.testcase.prefix + 'Bubble.json file validation failed.');
            } else
                callback('SUCCESS', this.testcase.prefix + 'The bubble.json file is identical with the benchmark.')
        }
    } catch (err) {
        checkPoint.postCallback(callback, 'ERROR', this.testcase.prefix +
            'Exception thrown when parse bubble.json with message - ' +
            err);
        return false;
    }

    // 3. check if the key files existed.
    var urns = [],
        filesPath = [];
    traverBubbleChildren(genBubbleJsonObj, function(b) {
        if ( !! b['type'] && b['type'] === 'resource' && !! b['urn'])
            urns.push(b['urn']);

        if ( !! b['type'] && b['type'] === 'geometry' && !! b['intermediateFile'])
            urns.push(b['intermediateFile']);
    });


    for (var ii = 0; ii < urns.length; ii++) {
        try {
            // sample: "$file$/output/Resource/3D_View/_3D_/_3D_.svf"
            // sample: "output/Resource/Sheet/A1___Floor_Plan/A1___Floor_Plan.dwfx"
            var filePath = null;
            if (urns[ii].indexOf('$file$') === 0) {
                var urv = urns[ii].substr('$file$'.length + 1).replace(/\//g, '\\');
                filePath = path.join(genBubbleOutputPath, urv);
            } else {
                filePath = path.join(genBubbleOutputPath, urns[ii]);
            }
            if (!fs.existsSync(filePath))
                throw 'The urv - ' + urns[ii] + ' - does not existed.';
            filesPath.push(filePath);
        } catch (err) {
            checkPoint.postCallback(callback, 'ERROR', testcase.prefix +
                'Exception thrown when parse bubble.json with message - ' +
                err);
            return false;
        }
    }

    // update the context.
    checkPoint.setStatus(checkPoint_ns.SUCCESS);

    // send the filesPath to testcase.
    this.testcase.keyFilesPath = filesPath;
}