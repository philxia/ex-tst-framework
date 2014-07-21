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
                line = "\"guid\":\"dummy_value\"";
            } else if(tag === "\"size\""){
                line = "\"size\": dummy_value";
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
        var d1 = fs.readFileSync('E:\\gitrepos\\express\\dev\\mixedsvr\\tools\\d1.json');
        var d2 = fs.readFileSync('E:\\gitrepos\\express\\dev\\mixedsvr\\tools\\d2.json');
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

        for(var dd=result.length-1; dd>=0; dd--){
            var df = result[dd]; // array2
            var indicator = df[0];
            var content = df[1];
            if(indicator === 1)
            {
                // "          "guid": "8862a3f6-5b77-41c9-a19c-0efbb4293b84",
//"
                var strtmp = content.trim();
                var strarr = strtmp.split(':');
                if(strarr.length !== 2)
                    continue;
                var tag = strarr[0];
                if(tag === "\"guid\""){
                    result.splice(dd, 1); // remove this line;
                    result[dd-1][0] = 0; // ignore the change.
                    dd --;
                }
            }
        }

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