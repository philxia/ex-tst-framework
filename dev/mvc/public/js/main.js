(function(obj) {
	var progressbar = $( "#progress-export-zip" ),
	progressLabel = $( "#progress-export-zip > .progress-label" );
	progressbar.progressbar({
		value: false,
		change: function() {
			progressLabel.text( progressbar.progressbar( "value" ) + "%" );
		},
		complete: function() {
			progressLabel.text( "Complete!" );
			setTimeout(function () {
				progressbar.hide();
			}, 500);
		}
	});
	progressbar.hide();

	var model = (function() {
		var fs = new zip.fs.FS(), requestFileSystem = obj.webkitRequestFileSystem || obj.mozRequestFileSystem || obj.requestFileSystem, URL = obj.webkitURL
		|| obj.mozURL || obj.URL;
		zip.workerScriptsPath = 'zip/'

		function createTempFile(callback, filename) {
			var tmpFilename = filename;
			requestFileSystem(TEMPORARY, 4 * 1024 * 1024 * 1024, function(filesystem) {
				function create() {
					filesystem.root.getFile(tmpFilename, {
						create : true
					}, function(zipFile) {
						callback(zipFile);
					});
				}

				filesystem.root.getFile(tmpFilename, null, function(entry) {
					entry.remove(create, create);
				}, create);
			});
		}

		return {
			addDirectory : function(name, parent) {
				return parent.addDirectory(name);
			},
			addFile : function(name, blob, parent) {
				return parent.addBlob(name, blob);
			},
			getRoot : function() {
				return fs.root;
			},
			getById : function(id) {
				return fs.getById(id);
			},
			remove : function(entry) {
				fs.remove(entry);
			},
			rename : function(entry, name) {
				entry.name = name;
			},
			reset : function() {
				// body...
				for(var ii=0; ii<fs.root.children.length; ii++)
					fs.remove(fs.root.children[ii]);
			},
			exportZip : function(entry, filename, onend, onprogress, onerror) {
				var zipFileEntry;

				function onexport(blob) {
					var blobURL;
					if (requestFileSystem)
						onend(zipFileEntry.toURL(), function() {
						});
					else {
						blobURL = URL.createObjectURL(blob);
						onend(blobURL);
					}
				}

				if (requestFileSystem)
					createTempFile(function(fileEntry) {
						zipFileEntry = fileEntry;
						entry.exportFileEntry(zipFileEntry, onexport, onprogress, onerror);
					}, filename);
				else
					entry.exportBlob(onexport, onprogress, onerror);
			},
			importZip : function(blob, targetEntry, onend, onprogress, onerror) {
				targetEntry.importBlob(blob, onend, onprogress, onerror);
			},
			getBlobURL : function(entry, onend, onprogress, onerror) {
				entry.getBlob(zip.getMimeType(entry.filename), function(blob) {
					var blobURL = URL.createObjectURL(blob);
					onend(blobURL, function() {
						URL.revokeObjectURL(blobURL);
					});
				}, onprogress, onerror);
			}
		};
	})();

	(function() {
		var progressExport = document.getElementById("progress-export-zip");
		var packageinput = document.getElementById('packageupload');

		//Socket.io 'http://10.148.205.1:3000'
		window.socket = io.connect(null, {
			'port': 3000,
			'force new connection': true
		});

		window.socket.on('connect', function(msg) {
		    // socket.emit('start_testjob', idstr);
		});

		window.socket.on('test_information_update', function(msg) {
			console.log(msg);
			var updateObj = JSON.parse(msg);
			var jobresult = updateObj.jobresult;
			if(jobresult === undefined)
				return;

			var testid = jobresult.id; 
			var trObj = document.getElementById(testid);
			if(!trObj)
				return;

			// {"testcase":{"current":1,"count":9,"testid":"RevitExtractor_x64_2015.0.2014.0624.141616"}}
			var count = jobresult.count;
			var success = jobresult.success;
			var fails = jobresult.failures;
			var totalHTML = '<div class="col-md-3"><span class="label label-info">'+ count +'</span></div>';
			var successHTML = '<div class="col-md-3">'+'</div>';
			if(success>0)
				successHTML = '<div class="col-md-3"><span class="label label-success">'
					+ success +'</span></div>';
			var abortHTML = '<div class="col-md-3">'+'</div>';
			var failHTML = '<div class="col-md-3">'+'</div>';
			if(fails>0)
				failHTML = '<div class="col-md-3"><span class="label label-danger">'
					+ fails +'</span></div>';
			
			$(trObj).find('td:eq(0)')[0].innerHTML = '<span class="label label-info">phil.xia@autodesk.com</span>';
			$(trObj).find('td:eq(2)')[0].innerHTML = ((fails+success) == count)? "complete":"in process";
			$(trObj).find('td:eq(3)')[0].innerHTML = totalHTML + successHTML +
				abortHTML + failHTML;
			var progress = Math.ceil(100*(success+fails)/count);
			if(progress>1)
				$(trObj).find('td:eq(4) > .progressbar').progressbar('value', progress);
		});

		window.socket.on('test_information_hint', function(msg) {
			console.log(msg);
		});

		function onerror(message) {
			alert(message);
		}

		function getFileNode(element) {
			return element ? model.getById(element.dataset.fileId) : model.getRoot();
		}

		function getFileElement(element) {
			while (element && !element.dataset.fileId)
				element = element.parentElement;
			return element;
		}

		function stopEvent(event) {
			event.stopPropagation();
			event.preventDefault();
		}

		function onexport(isFile) {
			function downloadBlobURL(target, filename) {
				return function(blobURL) {
					progressExport.style.opacity = 0.2;
					window.resolveLocalFileSystemURL = window.resolveLocalFileSystemURL ||
					window.webkitResolveLocalFileSystemURL;
					window.resolveLocalFileSystemURL(blobURL, function(fileEntry) {
						fileEntry.file(function(content) {
							content.rename = filename;
							$('#packageupload').fileupload();
							$('#packageupload').fileupload('add', {files: [content]});
						});
					});
				};
			}

			function onprogress(index, end) {
				var p = Math.ceil(index*100/end);
				progressbar.progressbar( "value", p );
			}

			return function(event) {
				var filename, target = event.target, node;
				if (!target.download) {
					node = event.node;
					filename = event.filename;//prompt("Filename", isFile ? node.name : node.parent ? node.name + ".zip" : "example.zip");
					if (filename) {
						progressExport.style.opacity = 1;
						// progressExport.offsetHeight;
						if (isFile)
							model.getBlobURL(node, downloadBlobURL(target, filename), onprogress, onerror);
						else
							model.exportZip(node, filename, event.onZipEnd, onprogress, onerror);
						// event.preventDefault();
					}
				}
			};
		}

		packageinput.addEventListener('change', function(event) {
			var files = packageinput.files;
			var filestree = {};
			for(var ii=0; ii<files.length; ii++)
			{
				var file = files[ii];
				var fpath = file.webkitRelativePath;
				var strs = fpath.split('/');
				var pointer = filestree;
				for(var jj=0; jj<strs.length; jj++)
				{
					var str = strs[jj];
					if(pointer[str] === undefined) // not existed.
					{
						pointer[str] = {};
						var entry = null;
						if(jj===0)
							var entry = model.addDirectory(str, model.getRoot());
						else if(jj === strs.length-1)
							var entry = model.addFile(file.name, file, pointer);
						else
							var entry = model.addDirectory(str, pointer);
						pointer[str] = entry;
					}
					pointer = pointer[str];
				}
			}

			// zip the folder and send out to file server.
			// RevitExtractor_x64_2015.0.2014.0320.zip
			var date = new Date();
			var monthstr = (date.getMonth()+1 > 9)? '':'0'; // getMonth returns 0~11.
			var datestr = (date.getDate() > 9)? '':'0';
			var hourstr = (date.getHours()+1 > 9)? '':'0';
			var minstr = (date.getMinutes() > 9)? '':'0';
			var secstr = (date.getSeconds() > 9)? '':'0';
			var filename = 'RevitExtractor_x64_2015.0.' + date.getFullYear() + '.' + 
			monthstr + (date.getMonth() + 1).toString() + 
			datestr + date.getDate() + '.' + 
			hourstr + (date.getHours()+1).toString() +
			minstr + date.getMinutes() + 
			secstr + date.getSeconds() + 
			'.zip';

			progressbar.show();
			var func = onexport(false);
			func({
				'target':packageinput, 
				'node':model.getRoot(), 
				'filename':filename,
				'onZipEnd': function(blobURL) {
					// clean the status.
					model.reset();

					// prepare the upload.
					window.resolveLocalFileSystemURL = window.resolveLocalFileSystemURL ||
					window.webkitResolveLocalFileSystemURL;
					window.resolveLocalFileSystemURL(blobURL, function(fileEntry) {
						fileEntry.file(function(content) {
							$('#packageupload').fileupload({
								done: function (e, data) {
									if(e)
										console.log(e);

									if ( !! window.socket)
										window.socket.emit("runCTest", data.result);

									// add a row to the table and set the test status to pending.
									var testid = filename.substr(0, filename.lastIndexOf('.'));
									var htmlText = '<tr id="' + testid + '"><td><span class="label label-info">phil.xia@autodesk.com</span></td><td>' + testid + 
									'</td><td>' + 'pending' + '</td><td></td><td><div class="progressbar"></div></td></tr>';
									// if($("#jobsTable tr:first").length > 0)
									// 	$("#jobsTable tr:first").before(htmlText);
									// else
										$("#jobsTable tr:first").after(htmlText);

									var trObj = document.getElementById(testid);
									$(trObj).find('td:eq(4) > .progressbar').progressbar({value:false});

									// destroy the upload widget.
									$('#packageupload').fileupload('destroy');
								}
							});
							$('#packageupload').fileupload('add', {files: [content]});

							// reset the file input.
							var e = $('#packageupload');
							e.wrap('<form>').closest('form').get(0).reset();
							e.unwrap();
						});
					});
				}
			});
		});

})();


$(window).on('unload', function() {
	if ( !! window.socket) {
	        window.socket.disconnect(); // disconnect.
	        delete window.socket;
	    }
	});

})(this);