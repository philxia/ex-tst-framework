var fs = require('fs');

function main (argument) {

	String.prototype.trim = function() {
		return this.replace(/(^\s*)|(\s*$)/g, "");
	}

	var TAG = "PerfEvent{";
	var TAG_2DS = "'Export DWFx For Views.";

fs.readFile('../data/log.txt', function (err, data) {
	if(err)
	{
		console.log(err);
		return;
	}

	var content = data.toString('utf8');
	var lines = content.split('\n');
	var lineCount = lines.length;
	var perfObjs = new Array();
	for(var ii=0; ii<lineCount; ii++)
	{
		var line = lines[ii];
		if(!line.trim())
			continue;

		// find the perf tag
		var index = line.indexOf(TAG);
		if(index < 0)
			continue;

		line = line.substr(index+TAG.length);
		var vars = line.split(',');
		var perfObject = {};
		vars.forEach(function(value, index, arr) {
			var pairs = value.split('=');
			if(!(Array.isArray(pairs) && pairs.length === 2))
				return;
			//m_runId='', m_cntr='Export SVF For 3D Views', m_eventId='33afee0b-c8eb-4364-96ec-fb0202bd5a33', 
			// m_parentId='06a0fe4e-83d2-4ddb-a5f2-75dd546c5365', m_elapsedTime=330523, m_startTime=1410535269781, 
			// m_endTime=1410535600304, m_version='v1', m_status='completed', m_ip='10.148.204.157', options={}

			var pk = pairs[0].trim();
			var pv = pairs[1].trim();
			// console.log("=== " + pk + " " + pv);
			switch(pk)
			{
				case 'm_cntr':
					{
						var nameString = pv;
						if(pv === "'Export SVF For 3D Views'")
							nameString = "3dsvf";
						else if(pv === "'Resolve the link files'")
							nameString = "opendoc-relinks";
						else if(pv === "'Open RVT file'")
							nameString = "opendoc";
						else if(pv === "'Export property database'")
							nameString = "database";
						else if(pv === "'Close RVT file'")
							nameString = "closedoc";
						else if(pv === "'Export PNG for Views'")
							nameString = "thumbnail";
						else if(pv === "'RVT Conversion'")
							nameString = "totaltime";

						//m_cntr='Export DWFx For Views. Sheets: 593, other 2D Views: 0 '
						if(pv.indexOf(TAG_2DS)==0)
						{
							var cc = pv.substr(TAG_2DS.length).split(',');
							var ccs = cc[0].split(':');
							if(ccs[0].trim() == "Sheets")
								perfObject.count = parseInt(ccs[1]);
							nameString = "2ddwfx";
						}

						perfObject.name = nameString;
					}
					break;
				case 'm_elapsedTime':
					{
						//in Milliseconds
						perfObject.time = parseInt(pv)/1000;// to second.
					}
				default:
					break;
			}
		});

		console.log(JSON.stringify(perfObject));
		perfObjs.push(perfObject);
	}// end of read log content.

	var csvContent = new Array();
	perfObjs.forEach(function(v, i, arr) {
		if(v.name === "totaltime")
			return;
		else
			csvContent.push(v.name+"-end, "+v.time );
	});
	csvContent = csvContent.join('\n');
	fs.writeFileSync('conversion.csv', csvContent);
	
});



}

// setTimeout(function() {
	main();
// }, 20000);
