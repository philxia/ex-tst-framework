var fs = require('fs');
var diff = require('../diffmatchpatch/diffmatchpatch');

var checker = exports.TextComparer = {};

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
            	var trickyLine = lines[ii - 2].trim(); // "name":	"3D",
            	var tlstrarr = trickyLine.split(':');
            	if(tlstrarr.length === 2 && 
            		tlstrarr[0] === "\"name\"" &&
            		tlstrarr[1].trim() === "\"3D\",")
            		line = "\"viewableID\":\"dummy_value\",";
            }

        }
        newContent += line + '\n';
    }
    return newContent;
}

checker.compareTexts = function(txtFile1, txtFile2) {
	var dmp = new diff.diff_match_patch();
	var d1 = fs.readFileSync(txtFile1, 'utf8');
	var d2 = fs.readFileSync(txtFile2, 'utf8');
	var a = dmp.diff_linesToChars_( dummyVarSections(d1.toString()), 
		dummyVarSections(d2.toString()));
	var lineText1 = a.chars1;
	var lineText2 = a.chars2;
	var lineArray = a.lineArray;

	var result = dmp.diff_main(lineText1, lineText2, false);
	if(result.length === 1 && result[0][0] === 0)// only one item(size is 1) and no change(tag is 0)
		return null;

	dmp.diff_charsToLines_(result, lineArray);

	// check the result after handled some special cases.
	var isdiff = false;
	for(var ii=0; ii<result.length; ii++)
	{
		if(result[ii][0] != 0)
		{
			isdiff = true;
			break;
		}
	}
	if(!isdiff)
		return null;

	var html = dmp.diff_prettyHtml(result);
	html = html.replace(/&para;/g, '');
	html = '<html><head><meta charset="utf-8"></head>'+html+'</html>';
	// html = html.replace(/ /g, '&nbsp;');
	return html;
}