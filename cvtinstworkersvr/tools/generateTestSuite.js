var fs = require('fs');
var fse = require('fs.extra');
var http = require('http');
var fs = require('fs');
var unzip = require('unzip');

var rimraf = require('rimraf');

var diff = require('../lib/diffmatchpatch/diffmatchpatch');

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

function diff_lineMode(text1, text2) {
  var dmp = new diff.diff_match_patch();
  var a = dmp.diff_linesToChars_(text1, text2);
  var lineText1 = a[0];
  var lineText2 = a[1];
  var lineArray = a[2];

  var diffs = dmp.diff_main(lineText1, lineText2, false);

  dmp.diff_charsToLines_(diffs, lineArray);
  return diffs;
}

function dummyVarSections (argument) {
	var lines = argument.split('\n');
	var newContent;
	for(var ii=0; ii<lines.length; ii++)
	{
		var line = lines[ii];
		var strtmp = line.trim();
		var strarr = strtmp.split(':');
		if(strarr.length === 2){
			var tag = strarr[0];
			if(tag === "\"guid\""){
				line = "\"guid\":\"dummy_value\",";
			} else if(tag === "\"size\""){
				line = "\"size\": dummy_value,";
			} else if(tag === "\"viewableID\""){
				// this is really evil and should be removed soon.
				var trickyLine = lines[ii - 3].trim(); // "role": "3d",
				var tlstrarr = trickyLine.split(':');
				if(tlstrarr.length === 2 && 
					tlstrarr[0] === "\"role\"" &&
					tlstrarr[1].trim() === "\"3d\",")
					line = "\"viewableID\":\"dummy_value\",";
			}
		}
		else{
			// solve the unique/viewable id because the view is generated on the fly.
			// "6da34a42-6730-4812-a9e0-26020e33f074-0004d73c"
			strtmp = strtmp.replace(/\"/g,'');// remove the ".
			strarr = strtmp.split('-');
			if(strarr.length === 6 && strtmp.length === 45)
			{
				line = "\"dummy_value-"+strarr[5]+"\"";
			}
		}
		newContent += line + '\n';
	}
	return newContent;
}
http.createServer(function(req, res) {

	var url = req.url;
	if (!url) {
		res.writeHead(200, {
			'Content-Type': 'text/plain'
		});
		res.end('This is the RevitExtractor testing server.\n');
	}
	if(url.match('suite') !== null)
	{
		var suites = fs.readFileSync("D:\\gitrepos\\rvt2lmv_extractor_testing_srv\\cvthttpsvr\\lib\\testSuites.json");
		var suitesjson = JSON.parse(suites);
		suites = suitesjson.suites;
		var content = fs.readFileSync("D:\\tf\\results\\Release\\RevitExtractor_x64_2015.0.2014.1010\\success.txt", 'utf8');
		var contentjson = JSON.parse(content);
		contentjson.forEach(function(v, i, arr) {
			if(v.err != "INFO")
				return;

			var info = v.stdout;
			if(info.indexOf('DSM_GenericInformation') > 0)
			{
				info = info.substr(info.indexOf('{'));
				info = info.trim();
				var infojson = JSON.parse(info);
				var filePath = infojson.StatusReportMsg.FilePath;
				var fileName = filePath.substr(filePath.lastIndexOf('\\')+1);
				suites.forEach(function(v, i, arr) {
					if(v.name == fileName)
					{
						var fp = infojson.StatusReportMsg.FileProps;
						var prr =[];
						for(p in fp)
						{
							if(p.indexOf('RCE') == 0)
								prr.push(p);
						}
						for(var j=0;j<prr.length; j++)
							delete fp[prr[j]];
						arr[i].props = fp;
					}
				});
			}
		});


		fs.writeFileSync("D:\\gitrepos\\rvt2lmv_extractor_testing_srv\\cvthttpsvr\\lib\\testSuites_new.json", JSON.stringify(suites), 'utf8');
		res.end('cool.');

	}
	if(url.match('mail') !== null)
	{
		var nodemailer = require('nodemailer');

		// create reusable transporter object using SMTP transport
		var transporter = nodemailer.createTransport({
			service: 'Gmail',
			auth: {
				user: 'phil.xia@gmail.com',
				pass: '1qaz@wsxevol'
			}
		});

		// NB! No need to recreate the transporter object. You can use
		// the same transporter object for all e-mails

		// setup e-mail data with unicode symbols
		var mailOptions = {
			from: 'Fred Foo :heavy_check_mark: <foo@blurdybloop.com>', // sender address
			to: 'phil.xia@autodesk.com', // list of receivers
			subject: 'Hello :heavy_check_mark:', // Subject line
			text: 'Hello world :heavy_check_mark:', // plaintext body
			html: '<b>Hello world :heavy_check_mark:</b>' // html body
		};

		// send mail with defined transport object
		transporter.sendMail(mailOptions, function(error, info){
			if(error){
				console.log(error);
			}else{
				console.log('Message sent: ' + info.response);
			}
		});
	}
	if(url.match('ip') !== null){
		var os=require('os');
		var ifaces=os.networkInterfaces();
		var ips = new Array();
		for (var dev in ifaces) {
		  var alias=0;
		  ifaces[dev].forEach(function(details){
			if (details.family=='IPv4') {
				ips.push(dev+(alias?':'+alias:''),details.address);
			  console.log(dev+(alias?':'+alias:''),details.address);
			  
			  ++alias;
			}
		  });
		}
		res.end(ips.toString());
	}
	if(url.match('diff') !== null){
		var dmp = new diff.diff_match_patch();
		var d1 = fs.readFileSync('D:\\gitrepos\\rvt2lmv_extractor_testing_srv\\cvtinstworkersvr\\tools\\objects_vals.json');
		var d2 = fs.readFileSync('D:\\gitrepos\\rvt2lmv_extractor_testing_srv\\cvtinstworkersvr\\tools\\objects_vals.json.bm.json');
		// var result = dmp.diff_main(d1.toString(),d2.toString());
		// dmp.diff_cleanupSemantic(result);
		// dmp.diff_cleanupEfficiency(result);
		var a = dmp.diff_linesToChars_(dummyVarSections(d1.toString()), 
			dummyVarSections(d2.toString()));
		  var lineText1 = a.chars1;
		  var lineText2 = a.chars2;
		  var lineArray = a.lineArray;

		var result = dmp.diff_main(lineText1, lineText2, false);

		dmp.diff_charsToLines_(result, lineArray);

		var html = dmp.diff_prettyHtml(result);
		html = html.replace(/&para;/g, '');
		// html = html.replace(/ /g, '&nbsp;');
		res.end('<p>' + html + '</p>');
	}
	if(url.match('sort') !== null){
		var localPath = 'E:\\tf\\results\\Custom';
		var files = fs.readdirSync(localPath);
		files.sort();
		res.end(files.toString());
	}
	if(url.match("unzip") !== null){
		var localPath = 'E:\\tf\\packs\\Custom\\RevitExtractor_x64_2015.0.2014.0623.152750.zip';
		var exFolder = 'E:\\tf\\packs\\Custom\\RevitExtractor_x64_2015.0.2014.0623.152750';
		var unzipExtractor = unzip.Extract({
			path: exFolder
		});
		unzipExtractor.on('error', function(err) {
			console.log(err);
		});
		unzipExtractor.on('close', function() {
			console.log('success');            
		});
		fs.createReadStream(localPath).pipe(unzipExtractor);
	}

	if (url.match("loadsuites") !== null) {
		var suitesString = fs.readFileSync(".\\testSuites.json", "utf8");
		var suites = JSON.parse(suitesString);
	}

	if (url.match("checkbubble") !== null) {
		var genBubbleJsonString = fs.readFileSync(".\\..\\dev\\benchmarks\\2015\\Simple_model.rvt\\bubble.json", "utf8");
		var genBubbleJsonObj = JSON.parse(genBubbleJsonString);

		var filesInfo = [];
		traverBubbleChildren(genBubbleJsonObj, function(b) {
			if ( !! b['type'] && b['type'] === 'resource' && !! b['urn'])
				filesInfo.push(b['urn']);
		});
	}
	if (url.match("del") !== null) {
		var folderPath = "D:\\tf\\output\\Development\\RevitExtractor_x64_2015.0.2014.0519";
		rimraf(folderPath, function(err) {
			console.log(err);
		})
	}
	if (url.match('rename') !== null) {
		var folderPath = "D:\\tf\\output\\Development\\RevitExtractor_x64_2015.0.2014.0519\\";
		fse.copyRecursive(folderPath, 'D:\\tf\\result\\Development\\RevitExtractor_x64_2015.0.2014.0519\\', function(argument) {
			console.log(argument);
		});
	}


}).listen(1337, '127.0.0.1');
console.log('Server running at http://127.0.0.1:1337/');
// var testSuite = {
//     name: "Smoke",
//     suites: [{
//         name: "Simple_model.rvt",
//         path: ".\\2015",
//         args: ["\\no2d"]
//     }]
// };


// var content = JSON.stringify(testSuite);

// fs.writeFileSync("testSuites.json", content);