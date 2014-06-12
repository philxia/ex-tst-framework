var fs = require('fs');

var checkPoint_bubbleJsonFile = require('./bubbleJsonFileChecker');
var checkPoint_keyFiles = require('./keyFilesChecker');
var checkPoint_resultNotification = require('./resultNotification');


var bubbleValidator = exports.bubbleValidator = {};

bubbleValidator.BubbleValidator = function(execTestsObject, testcase) {
    this.testcase = testcase;
    this.context = execTestsObject;
}

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

