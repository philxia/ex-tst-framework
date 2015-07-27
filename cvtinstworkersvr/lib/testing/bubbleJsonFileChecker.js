var fs = require('fs');
var fsextra = require('fs.extra');
var path = require('path');
var jsonComparer = require('./jsonComparer').JsonComparer;
var checkPoint_ns = require('./checkPoint').checkPoint;
var tstMgr_ns = require('../../testManager').testManager;
var txtdiff_ns = require('./textComparer').TextComparer;


var checker = exports.bubbleJsonFileChecker = {};


checker.BubbleJsonFileChecker = function(context, testcase, bubblePath) {
	this.testcase = testcase;
	this.context = context;
	if(this.testcase.keyFilesPath === undefined)
		this.testcase.keyFilesPath = new Array();
	this.bubblePath = bubblePath;
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
	var result = false;

	// 1. check if the test case bubble json is existed.
	var indexJsonPath = this.testcase.args[0];
	var baseFolder = indexJsonPath.substr(0, indexJsonPath.length - 'index.json'.length);
	baseFolder = path.join(tstMgr_ns.OutputFolder,
		this.context.envName,
		this.context.packNameWithoutExtension,
		baseFolder);
	var outputFoler = path.join(baseFolder, 'output');
	var relativePath = this.bubblePath.substr(outputFoler.length+1);

	// baseFolder = path.join(baseFolder, 'output');
	var generatedBubbleJsonFilePath = this.bubblePath;
	if (!fs.existsSync(generatedBubbleJsonFilePath)) {
		checkPoint.postCallback(callback, 'ERROR', this.testcase.prefix + 'Failed to generate the bubble.json file.');
		return false;
	} else
		callback('SUCCESS', this.testcase.prefix + 'The bubble.json file is generated.');
	checkPoint.setOutputPath(generatedBubbleJsonFilePath);

	// 2. read the json to object.
	var genBubbleJsonObj = null;
	try {
		var genBubbleJsonString = fs.readFileSync(generatedBubbleJsonFilePath, "utf8");
		genBubbleJsonObj = JSON.parse(genBubbleJsonString);

		if (scope.context.genBenchmarks) {
			var bmBubbleJsonFilePath = path.join(scope.context.benchmarksPath, this.testcase.args[1], relativePath);
			var bmBubbleJsonFolderPath = bmBubbleJsonFilePath.substr(0, bmBubbleJsonFilePath.length-'bubble.json'.length);
			if(!fs.existsSync(bmBubbleJsonFolderPath))
				fsextra.mkdirpSync(bmBubbleJsonFolderPath);
			fsextra.copy(generatedBubbleJsonFilePath, bmBubbleJsonFilePath, function(err) {
				if (err)
					console.log(err);
				else
					console.log('Copy the bubble to benchmark folder.');
			});

		} else {
			var bmBubbleJsonFilePath = path.join(tstMgr_ns.BenchmarksFolder, this.testcase.args[1], relativePath);
			checkPoint.setBenchmarkPath(bmBubbleJsonFilePath);
			var isBmPathUpdated = false;
			if (!fs.existsSync(bmBubbleJsonFilePath))
			{
				// in some cases, the path is too long and be trimmed and we need some way to 
				// handle this case.
				// 1. try to iterate the bm folders to see if any foler name is part of this folder.
				var obViewName = generatedBubbleJsonFilePath.substr(0
					, generatedBubbleJsonFilePath.lastIndexOf("\\"));
				obViewName = obViewName.substr(obViewName.lastIndexOf("\\")+1);
				// twice can get the right folder.
				var bmViewsFolder = bmBubbleJsonFilePath.substr(0, bmBubbleJsonFilePath.lastIndexOf("\\"));
				bmViewsFolder = bmViewsFolder.substr(0, bmViewsFolder.lastIndexOf("\\"));
				var bmViewsName = fs.readdirSync(bmViewsFolder);
				var findIt = false;
				var bmViewName = null;
				for(var i=0; i<bmViewsName.length; i++)
				{
					if(obViewName.indexOf(bmViewsName[i]) === 0)
					{
						findIt = true;
						bmViewName = bmViewsName[i];
						bmBubbleJsonFilePath = path.join(bmViewsFolder, bmViewName, 'bubble.json');
						checkPoint.setBenchmarkPath(bmBubbleJsonFilePath);
						isBmPathUpdated = true;
						break;
					}
				}

				if(!findIt || !fs.existsSync(bmBubbleJsonFilePath))
					throw 'The benchmark bubble.json for this case does not existed.';
			}
			// var bmBubbleJsonString = fs.readFileSync(bmBubbleJsonFilePath, 'utf8');
			// var bmBubbleJsonObj = JSON.parse(bmBubbleJsonString);

			// compare the 2 json objects.
			// if (!jsonComparer.deepCompare(genBubbleJsonObj, bmBubbleJsonObj, function(p, gen, bm) {
			//     checkPoint.postCallback(callback, 'ERROR', scope.testcase.prefix + 'Bubble.json file validation failed, because the values of property -' + p + '- are different for generated bubble (' +
			//         gen + ') and benchmark bubble (' + bm + ').');
			// })) {
			//     checkPoint.postCallback(callback, 'ERROR', this.testcase.prefix + 'Bubble.json file validation failed.');
			// } else{
			//     callback('SUCCESS', this.testcase.prefix + 'The bubble.json file is identical with the benchmark.');
			//     result = true;
			// }
			var rst = txtdiff_ns.compareTexts(generatedBubbleJsonFilePath
				, bmBubbleJsonFilePath
				, isBmPathUpdated);
			if(rst === null)
			{
				callback('SUCCESS', this.testcase.prefix + 'The bubble.json file is identical with the benchmark.');
				result = true;
			}
			else{
				checkPoint.diffTextPath = generatedBubbleJsonFilePath + '_diffText.html';
				// var content = JSON.stringify({content: rst});
				fs.writeFileSync(checkPoint.diffTextPath, rst);
				checkPoint.postCallback(callback, 'ERROR', scope.testcase.prefix + 
					'Bubble.json file validation failed.');
			}
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
				filePath = path.join(baseFolder, urv);
			} else {
				filePath = path.join(baseFolder, urns[ii]);
			}
			if (!fs.existsSync(filePath))
				throw 'The urv - ' + urns[ii] + ' - does not existed.';
			filesPath.push(filePath);
		} catch (err) {
			checkPoint.postCallback(callback, 'ERROR', this.testcase.prefix +
				'Exception thrown when parse bubble.json with message - ' +
				err);
			return false;
		}
	}

	// update the context.
	if(result)
		checkPoint.setStatus(checkPoint_ns.SUCCESS);

	// send the filesPath to testcase.
	for(var i=0; i<filesPath.length; i++)
	{
		if(this.testcase.keyFilesPath.indexOf(filesPath[i]) < 0)
			this.testcase.keyFilesPath.push(filesPath[i]);
	}
	
}