var fs = require('fs');
var diff = require('../diffmatchpatch/diffmatchpatch');

var checker = exports.TextComparer = {};


checker.compareTexts = function(txtFile1, txtFile2) {
	var dmp = new diff.diff_match_patch();
	var d1 = fs.readFileSync(txtFile1, 'utf8');
	var d2 = fs.readFileSync(txtFile2, 'utf8');
	var a = dmp.diff_linesToChars_(d1.toString(), d2.toString());
	var lineText1 = a.chars1;
	var lineText2 = a.chars2;
	var lineArray = a.lineArray;

	var result = dmp.diff_main(lineText1, lineText2, false);
	if(result.length === 1 && result[0][0] === 0)// only one item(size is 1) and no change(tag is 0)
		return null;

	dmp.diff_charsToLines_(result, lineArray);
	for(var dd=result.length-1; dd>=0; dd--){
		var df = result[dd]; // array2
		var indicator = df[0];
		var content = df[1];
		if(indicator === 1)
		{
			// "guid": "8862a3f6-5b77-41c9-a19c-0efbb4293b84",
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
	// html = html.replace(/ /g, '&nbsp;');
	return html;
}