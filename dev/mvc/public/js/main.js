(function(obj) {

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
					progressExport.value = 0;
					progressExport.max = 0;
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
				progressExport.value = index;
				progressExport.max = end;
			}

			return function(event) {
				var filename, target = event.target, node;
				if (!target.download) {
					node = event.node;
					filename = event.filename;//prompt("Filename", isFile ? node.name : node.parent ? node.name + ".zip" : "example.zip");
					if (filename) {
						progressExport.style.opacity = 1;
						progressExport.offsetHeight;
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
			var func = onexport(false);
			func({
				'target':packageinput, 
				'node':model.getRoot(), 
				'filename':filename,
				'onZipEnd': function(blobURL) {
					// clean the status.
					progressExport.style.opacity = 0.2;
					progressExport.value = 0;
					progressExport.max = 0;


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

								}
							});
							$('#packageupload').fileupload('add', {files: [content]});
						});
					});
				}
			});
		});

		progressExport.style.opacity = 0.2;
	})();


	$(window).on('unload', function() {
	    if ( !! window.socket) {
	        window.socket.disconnect(); // disconnect.
	        delete window.socket;
	    }
	});

})(this);