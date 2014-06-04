var fs = require('fs');

var checkPoint_bubbleJsonFile = require('./bubbleJsonFileChecker');
var checkPoint_keyFiles = require('./keyFilesChecker');
var checkPoint_resultNotification = require('./resultNotification');


var bubbleValidator = exports.bubbleValidator = {};

bubbleValidator.BubbleValidator = function(execTestsObject, testcase) {
    this.testcase = testcase;
    this.context = execTestsObject;
}


bubbleValidator.benchmarkRootPath = ".\\benchmarks\\";
bubbleValidator.svf2ImageToolPath = ".\\mvc\\tools\\SvfTexThumbExtractor\\svf_thumb.exe"


// this validator only push the sub-checkers.
bubbleValidator.BubbleValidator.prototype.checks = function(callback) {
    // locates the index to insert these check points.
    this.context.checkPoints.splice(
        this.context.currentCheckPointIndex + 1, // inserts the new check points to the next position.
        0, // no removing.
        new checkPoint_bubbleJsonFile.bubbleJsonFileChecker.BubbleJsonFileChecker(this.context, this.testcase),
        new checkPoint_keyFiles.keyFilesChecker.KeyFilesChecker(this.context, this.testcase),
        new checkPoint_resultNotification.resultNotification.ResultNotification(this.context, this.testcase)
    );
}



// function runCmdSync(cmd, args, timeoutInSecond) {

//     var util = require('util'),
//         spawn = require('child_process').spawn,
//         exec = spawn(cmd, args);

//     exec.stdout.on('data', function(data) {
//         var buff = new Buffer(data);
//         var info = buff.toString('utf8');
//         console.log('stdout: ' + info);
//         callback('INFO', info);
//     });

//     exec.stderr.on('data', function(data) {
//         console.log('stderr: ' + data);
//         callback('ERROR', data);
//     });

//     exec.on('exit', function(code) {

//     });
// }
// bubbleValidator.validateBubbleJson = function(testcase, callback) {
//     // 1. check if the test case bubble json is existed.
//     var indexJsonPath = testcase.args[0];
//     var genBubbleOutputPath = indexJsonPath.substr(0, indexJsonPath.length - 'index.json'.length);
//     var generatedBubbleJsonFilePath = genBubbleOutputPath + 'output\\bubble.json';
//     if (!fs.existsSync(generatedBubbleJsonFilePath)) {
//         callback('ERROR', testcase.prefix + 'Failed to generate the bubble.json file.');
//         return false;
//     } else
//         callback('SUCCESS', testcase.prefix + 'The bubble.json file is generated.');

//     // 2. read the json to object.
//     var genBubbleJsonObj = null;
//     try {
//         var genBubbleJsonString = fs.readFileSync(generatedBubbleJsonFilePath, "utf8");
//         genBubbleJsonObj = JSON.parse(genBubbleJsonString);

//         var bmBubbleJsonFilePath = this.benchmarkRootPath + testcase.args[1] + '\\bubble.json';
//         if (!fs.existsSync(bmBubbleJsonFilePath))
//             throw 'The benchmark bubble.json for this case does not existed.';
//         var bmBubbleJsonString = fs.readFileSync(bmBubbleJsonFilePath, 'utf8');
//         var bmBubbleJsonObj = JSON.parse(bmBubbleJsonString);

//         // compare the 2 json objects.
//         if (!this.deepCompare(genBubbleJsonObj, bmBubbleJsonObj, function(p, gen, bm) {
//             callback('ERROR', testcase.prefix + 'Bubble.json file validation failed, because the values of property -' + p + '- are different for generated bubble (' +
//                 gen + ') and benchmark bubble (' + bm + ').');
//         })) {
//             return;
//         } else
//             callback('SUCCESS', testcase.prefix + 'The bubble.json file is identical with the benchmark.')

//     } catch (err) {
//         callback('ERROR', testcase.prefix +
//             'Exception thrown when parse bubble.json with message - ' +
//             err);
//         return false;
//     }

//     // 3. check if the key files existed.
//     var urns = [],
//         filesPath = [];
//     traverBubbleChildren(genBubbleJsonObj, function(b) {
//         if ( !! b['type'] && b['type'] === 'resource' && !! b['urn'])
//             urns.push(b['urn']);
//     });

//     try {
//         for (var ii = 0; ii < urns.length; ii++) {
//             // sample: "$file$/output/Resource/3D_View/_3D_/_3D_.svf"
//             var urv = urns[ii].substr('$file$'.length);
//             var filePath = genBubbleOutputPath + urv;
//             if (!fs.existsSync(filePath))
//                 throw 'The urv - ' + urns[ii] + ' - does not existed.';

//             filesPath.push(filePath);
//         }
//     } catch (err) {
//         callback('ERROR', testcase.prefix +
//             'Exception thrown when parse bubble.json with message - ' +
//             err);
//         return false;
//     }

//     // 4. generate benchmarks.
//     for (var jj = 0; jj < filesPath.length; jj++) {
//         // 4.1 conver to image if the file is svf.

//     }


//     return true;
// }