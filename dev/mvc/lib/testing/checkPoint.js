var checkPoint = exports.checkPoint = {};


// enums
checkPoint.ExtractionCheck = 1000;
checkPoint.BubbleFileCheck = 1001;
checkPoint.BubbleKeyFilesCheck = 1002;
checkPoint.View3DCheck = 1003;
checkPoint.View2DCheck = 1004;
checkPoint.DatabaseCheck = 1005;
checkPoint.View3DCheck_Svf2Image = 1006;
checkPoint.View2DCheck_dwfx2Image = 1007;
checkPoint.View2DCheck_ImageCompareCheck = 1008;
checkPoint.View3DCheck_ImageCompareCheck = 1009;


// status
checkPoint.SUCCESS = 'success';
checkPoint.FAILURE = 'failure';


checkPoint.CheckPoint = function(checkType) {
    this.checkType = checkType;
    this.status = 'failure'; // success or failure.
    this.message = '';
    this.outputPath = '';
    this.benchmarkPath = '';
}

checkPoint.CheckPoint.prototype.postCallback = function(callback, err, stdout, stderr) {

    if (err === 'ERROR') {
        this.setStatus(checkPoint.FAILURE);
        this.setMessage(stdout);
    }
    if ( !! callback)
    {
        callback(err, stdout, stderr);  
        if(err === 'ERROR'){
            callback('HINT', JSON.stringify(this));
        }
    }
}


checkPoint.CheckPoint.prototype.setStatus = function(status) {
    if (status != checkPoint.FAILURE && status != checkPoint.SUCCESS)
        throw 'The argument is out of range.';
    this.status = status;
}

checkPoint.CheckPoint.prototype.getStatus = function() {
    return this.status;
}

checkPoint.CheckPoint.prototype.setMessage = function(msg) {
    this.message = msg;
}

checkPoint.CheckPoint.prototype.getMessage = function() {
    return this.message;
}

checkPoint.CheckPoint.prototype.setOutputPath = function(path) {
    this.outputPath = path;
}

checkPoint.CheckPoint.prototype.getOutputPath = function() {
    return this.outputPath;
}

checkPoint.CheckPoint.prototype.setBenchmarkPath = function(path) {
    this.benchmarkPath = path;
}

checkPoint.CheckPoint.prototype.getBenchmarkPath = function() {
    return this.benchmarkPath;
}