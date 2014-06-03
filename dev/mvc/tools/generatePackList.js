var fs = require('fs');


var server1 = '\\\\usmanpdglstr01\\revit\\Cloud\\RevitExtractor\\Dev\\';
fs.readdir(server1, function(err, files) {
    if ( !! err)
        console.log(err);

    var jsonObj = {};
    for (var i = 0; i < files.length; i++) {
        jsonObj[files[i]] = true;
    }
    var content = JSON.stringify(jsonObj);

    fs.writeFileSync("Dev_PackageList.txt", content);
});