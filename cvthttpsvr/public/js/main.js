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

									// if ( !! window.socket)
									// 	window.socket.emit("runCTest", data.result);
									var resObj = JSON.parse(data.result);
									var jobfiles = resObj.files;
									var url = jobfiles[0].url;
									var filename = jobfiles[0].name;

									// it is really strange that $.post works but $.ajax doesn't.
									$.post('http://10.148.204.189:3000/create', 
										{
											packId: -1,
											envId: 4,
											filename: filename
										},
										function(data) {
											if(data)
												console.log(data);
										},
										"json"
									);

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




	/**
	 * Active state.
	 */

	var active = 'complete';

	/**
	 * Active type filter.
	 */

	var filter;

	/**
	 * Number of jobs fetched when "more" is clicked.
	 */

	var more = 100;

	/**
	 * Number of jobs shown.
	 */

	var to = more;

	/**
	 * Sort order.
	 */

	var sort = 'asc';


	/**
	 * Show jobs with `state`.
	 *
	 * @param {String} state
	 * @param {Boolean} init
	 * @return {Function}
	 */

	function show(state) {
		return function () {
			active = state;
			if (pollForJobs.timer) {
				clearTimeout(pollForJobs.timer);
				delete pollForJobs.timer;
			}
			// history.pushState({ state: state }, state, state);
			// $('#jobs .job').remove();
			// $('#menu li a').removeClass('active');
			// $('#menu li.' + state + ' a').addClass('active');
			pollForJobs(state, 1000);
			return false;
		}
	}

	/**
	 * Poll for jobs with `state` every `ms`.
	 *
	 * @param {String} state
	 * @param {Number} ms
	 */

	function pollForJobs(state, ms) {
		// $('h1').text(state);
		refreshJobs(state, function () {
			// infiniteScroll();
			if (!pollForJobs.timer) pollForJobs.timer = setTimeout(function () {
				delete pollForJobs.timer;
				pollForJobs(state, ms);
			}, ms);
		});
	};

	/**
	 * Re-request and refresh job elements.
	 *
	 * @param {String} state
	 * @param {Function} fn
	 */

	function refreshJobs(state, fn) {
		

		var url = 'http://10.148.204.189:3001/jobs/'
				+ (filter ? filter + '/' : '')
				+ state + '/0..' + to
				+ '/' + sort;

		// var color = ['blue', 'red', 'yellow', 'green', 'purple'][Math.random() * 5 | 0];

		request(url, function (jobs) {
			var len = jobs.length
				, job
				, el;

			// remove jobs which have changed their state
			$('#jobsTable .table tr').each(function (i, el) {
				// skip the top row.
				if(i === 0)
					return;
				var el = $(el)
					, id = (el.attr('id') || '').replace('job-', '')
					, found = jobs.some(function (job) {
						return job && id == job.id;
					});
				if (!found) el.remove();
			});

			for (var i = 0; i < len; ++i) {
				if (!jobs[i]) continue;

				// exists
				if ($('#job-' + jobs[i].id).length) {
					// if (i < visibleFrom || i > visibleTo) continue;
					job = jobs[i];
					var count = job.data.count;
					var success = job.data.success;
					var fails = job.data.fail;

					el = $('#job-' + jobs[i].id)[0];
					if(el.jobData != null)
					{
						if(el.jobData.success === success && 
							el.jobData.fails === fails)
							continue;
					}

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
					
					// $(el).find('td:eq(2)')[0].innerHTML = '<span class="label label-info">phil.xia@autodesk.com</span>';
					$(el).find('td:eq(4)')[0].innerHTML = (((fails+success) == count) && count !=0)? "complete":"in process";
					$(el).find('td:eq(5)')[0].innerHTML = totalHTML + successHTML +
						abortHTML + failHTML;
					var progress = Math.ceil(100*(success+fails)/count);
					if(progress>1)
						$(el).find('td:eq(6) > .progressbar').progressbar('value', progress);
					// el.css('background-color', color);
					// job = el.get(0).job;
					// job.update(jobs[i])
					// 	.showProgress('active' == active)
					// 	.showErrorMessage('failed' == active)
					// 	.render();
					// new
				} else {
					job = jobs[i];
					var count = job.data.count;
					var success = job.data.success;
					var fails = job.data.fail;
					var testTitle = job.data.title.split(' ')[1];
					var jobid = 'job-' + job.id;
					testTitle = testTitle.substr(0, testTitle.lastIndexOf('.'));
					var priorityText = 'normal';
					if(job.priority === -10)
						priorityText = 'normal';
					// add a row to the table and set the test status to pending.
					var htmlText = '<tr id="' + jobid + '"><td><span class="label label-info">'+ job.type
					+'</span></td><td>'+ priorityText+'</td><td><span class="label label-info">'+ job.data.owner
					+'</span></td><td class="item"><a>' + testTitle + 
					'</a></td><td>' + 'pending' + '</td><td></td><td><div class="progressbar"></div></td></tr>';
					// if($("#jobsTable tr:first").length > 0)
					// 	$("#jobsTable tr:first").before(htmlText);
					// else
					$("#jobsTable tr:first").after(htmlText);

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
					var trObj = document.getElementById(jobid);
					$(trObj).find('td:eq(4)')[0].innerHTML = (((fails+success) == count) && count !=0)? "complete":"in process";
					$(trObj).find('td:eq(5)')[0].innerHTML = totalHTML + successHTML +
						abortHTML + failHTML;
					$(trObj).find('td:eq(6) > .progressbar').progressbar({value:false});

					var progress = Math.ceil(100*(success+fails)/count);
					if(progress>1)
						$(trObj).find('td:eq(6) > .progressbar').progressbar('value', progress);

					trObj.jobData = job;


					// bound the event for a in tables.
					$('#'+jobid).on('click', function(e) {
						if(this.jobData === undefined)
							return;

						window.jobData = this.jobData;
						$('#myModal').resizable()
						$('#myModal').modal('show');					
					});
				}
			};

			fn();

		});
	}


	// timer update the queue status.
	function pollStats(ms) {
		request('http://10.148.204.189:3001/stats', function (data) {
			$('#queued_count').text(data.inactiveCount);
			$('#active_count').text(data.activeCount);
			$('#failed_count').text(data.failedCount);
			$('#complete_count').text(data.completeCount);
			$('#delayed_count').text(data.delayedCount);
			setTimeout(function () {
				pollStats(ms);
			}, ms);
		});
	}

	/**
	 * Request `url` and invoke `fn(res)`.
	 *
	 * @param {String} url
	 * @param {Function} fn
	 */

	function request(url, fn) {
		var method = 'GET';

		if ('string' == typeof fn) {
			method = url;
			url = fn;
			fn = arguments[2];
		}

		fn = fn || function () {
		};

		$.ajax({ 
			type: method, 
			beforeSend: function(xhr) {
				xhr.setRequestHeader("authorization", "Basic " + btoa("foo:bar"));
			},
			url: url
			})
			.success(function (res) {
				res.error
					? error(res.error)
					: fn(res);
			});
	}

	pollStats(1000);
	show('inactive')();

	// global tab switch event handler.
	$('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
		// alert(e.target.toString(), // activated tab
		// 	e.relatedTarget.toString()); // previous tab
		var tabid = e.target.hash.substr(1);
		switch(tabid)
		{
			case 'inactive': // queue
			case 'active':
			case 'complete':
			case 'failed':
			case 'delayed':
				show(tabid)();
				break;
			default:
				showResult(tabid);
		}
	});

	function showResult (tabid) {
		if(!window.jobresult)
			return;

		if(!window.perfcache)
		{
			var resultInfo = window.jobresult;
			var perfs = new Array();
			resultInfo.cases.forEach(function(v, i, arr) {
				//
				var casename = v.name;
				var perfdata = v.pref; //array;
				var perfcvs = new Array();
				perfdata.forEach(function(v, i, arr) {
					if(v.name === 'totaltime')
						return;
					perfcvs.push([
						v.name + '-end',
						v.time.toString()
						]);
				})
				perfs.push({name:casename,
					perf: perfcvs});
			});
			window.perfcache = perfs;
		}
		if(tabid === 'tab_perf') // show the perf diagram.
		{
			// clean the previous charts
			// $('#main').find('svg').remove();

			// Use d3.text and d3.csv.parseRows so that we do not need to have a header
			// row, and can receive the csv as an array of arrays.
			var csv = window.perfcache[0].perf;
			var json = buildHierarchy(csv);
			createVisualization(json);
			$('div .casetitle').html('<h3>'+window.perfcache[0].name + '</h3>');
		}
		else if(tabid === 'tab_console')
		{

		}
	}

	$('#myModal').on('hide.bs.modal', function(e) {
		if(window.jobData)
			delete window.jobData;
		if(window.perfcache)
			delete window.perfcache;
		if(window.jobresult)
			delete window.jobresult;
	})


	$('#myModal').on('shown.bs.modal', function (e) {
	  // do something...
	  var jobData = window.jobData;
	  if(jobData === undefined)
	  	return;

	  $('a[href="#tab_console"]').tab('show');

	  var target = e.target;
	  // title": "runTest_3_24 RevitExtractor_x64_2015.0.2014.0915.zip"
	  var title = jobData.data.title;
	  var ts = title.split(' ');
	  var env = ts[0].split('_');
	  env = env[1];
	  var tf = ts[1];
	  tf = tf.substr(0, tf.length-4); // remove the extension.
	  $('#result_title')[0].innerText = tf;

	  var requrl = 'http://10.148.204.189:3000/result/' + env + '/' + tf;
	  $.get(requrl, 
	  	function(result){
	      // $(target).find('.modal-body').html(result.result);
	      var jobres = result.result;
	      window.jobresult = jobres;

	      var casenameshtml = '';
	      jobres.cases.forEach(function(v, i, arr) {
	      	casenameshtml += '<li><a href="#">'+v.name+'</a></li>';
	      });
	      $('.btn-group .dropdown-menu').html(casenameshtml);

	      // register the select changed event for dropup menus.
	      setTimeout(function(argument) {
	      	$('.btn-group .dropdown-menu a').click(function(e) {
	      		var casetitle = this.innerText;
	      		$('div .casetitle').html('<h3>' + casetitle + '</h3>');
	      		if(window.perfcache)
	      		{
	      			var done = false;
	      			window.perfcache.forEach(function(v, i, arr) {
	      				if(done)
	      					return;

	      				if(v.name == casetitle)
	      				{
	      					var csv = v.perf;
	      					var json = buildHierarchy(csv);
	      					createVisualization(json);
	      				}
	      			});
	      		}

	      		e.preventDefault();
	      	})
	      }, 500);
	    },
	    "json");
	})


})();
})(this);