$(document).ready(function () {

	$('#perfModal').on('hidden.bs.modal', function (e) {
		d3.select("#main_historyPerf").selectAll('*').remove();
		delete window.suiteIdString;
		delete window.cachedHistoryPerfResult;
	});

	// the click event for the suite case drop down menu.
	$('.dropdown .dropdown-menu a').click(function(e) {

		// skip the customized model dialog.
		var action = e.target.attributes['action'];
		if(action != null && action.value === 'check_performance')
			return;

		var href = e.target.href.split('#')[1];
		alert(action.value + href);

		// it is really strange that $.post works but $.ajax doesn't.
		$.post('http://10.148.204.189:3000/generatebaseline', 
			{
				suiteId: href
			},
			function(data) {
				if(data)
					console.log(data);
			},
			"json"
		);
	});



	$('.btn-group .dropdown-menu a').click(function(e) {
		var casetitle = this.innerText;
		$('div .casetitle').html('<h3>' + casetitle + '</h3>');
		$('#selectedInformation .packageNameAndTime').html('');
		$('#selectedInformation .taskNameAndTime').html('');


		d3.select("#main_historyPerf").selectAll('*').remove();
		var href = e.target.href.split('#')[1];
		if(window.suiteIdString)
		{
			getPerfData(parseInt(href), window.suiteIdString);
		}
	});

	$('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
		var target = $(e.target).attr("href") // activated tab
	  // alert(target);
		if(target === '#tab_information')
		{
			$('div.btn-group').hide();
		}
		else if(target === '#tab_historyPerf')
		{
			$('div.btn-group').show();	
		}
		else if(target === '#tab_perf')
		{
			var result = window.cachedHistoryPerfResult;
			if(result === undefined)
				return;
			// fill the p into the listbox.
			var curP = null;
			for(var p in result)
			{
				if(!curP)
					curP = p;

			}
		}
	});

	$('#perfModal').on('show.bs.modal', function (e) {
		// status preparation.
		$('div.btn-group').hide();
		$('div.modal-body .nav-tabs').children().removeClass('active');
		$('div.modal-body .nav-tabs').children()[0].className = 'active';
		$('.tab-content').children().removeClass('active');
		$('#tab_information').addClass('active');
	});
	$('#perfModal').on('shown.bs.modal', function (e) {
		try{
			// query the history perf data from the host.
			var suiteIdString = e.relatedTarget.href.split("#")[1];
			var suiteId = parseInt(suiteIdString);
			// console.log()
			window.suiteIdString = suiteIdString;

			getPerfData(2, suiteIdString);
			$('div .casetitle').html('<h3>Release per changelist</h3>');

		}
		catch(err)
		{
			console.log(err.toString('utf8'));
		}
	});

	function getPerfData (envId, suiteIdString) {



		// rest api - get the release per cl data at first.
		var requrl = 'http://10.148.204.189:3000/historyPerf/'+ envId.toString() + '/' + suiteIdString;
		$.get(requrl, 
			function(result){
				// caches this result at first.
				if(window.cachedHistoryPerfResult === undefined)
					window.cachedHistoryPerfResult = {};
				if(window.cachedHistoryPerfResult[envId.toString()] === undefined)
					window.cachedHistoryPerfResult[envId.toString()] = result;

				var fileprops = result.information;
				$('#tab_information').html('<p> File Name : '+ fileprops.name +'</p>' + 
					'<p> Path : '+ fileprops.path +'</p>' + 
					'<p> AllSheets : '+ fileprops.props.AllSheets +'</p>' + 
					'<p> AllViews : '+ fileprops.props.AllViews +'</p>' + 
					'<p> Existing 3D Views : '+ fileprops.props.Existing3DViews +'</p>' + 
					// '<p> Exported 2D Views : '+ fileprops.props.Exported2DViews +'</p>' +
					'<p> Exported 3D Views : '+ fileprops.props.Exported3DView +'</p>' + 
					'<p> Exported 2D Sheets : '+ fileprops.props.ExportedSheets +'</p>' +
					'<p> File Size : '+ fileprops.props.FileSize +'</p>');

				var layernames = [];
				var samplenames = [];
				var tickText = []; //RevitExtractor_x64_CL428691_20141008_0245
				for(p in result)
				{
					if(p === 'count' || p === 'information')
						continue;
					samplenames.push(p);
					var tx = p.split('_')[2];
					if(envId == 0 || envId == 2)
						tickText.push(tx);
					else if(envId == 1 || envId == 3)
					{
						var txs = tx.split('.');
						tickText.push(txs[2]+'.' + txs[3]);
					}
				}
				var onesample = result[samplenames[0]];
				for(p in onesample)
				{
					// forward compatible hack.
					if(p != 'opendoc-relinks-end' && p.split('-') === 3)
						continue;
					if(p === 'opendoc-relinks-end')
						layernames.push('relinks-end');
					else
						layernames.push(p);
				}

				var n = layernames.length, // number of layers
					m = result.count, // number of samples per layer
					stack = d3.layout.stack(),
					index = 0;
					layers = stack(d3.range(n).map(function() { 
						// return bumpLayer(m, .1); 
						var a = [];
						var thisLayerName = layernames[index];
						for(var ii=0; ii<m; ii++)
						{
							var spname = samplenames[ii];
							var sp = result[spname];
							var value = sp[thisLayerName];
							if(value === undefined)
							{
								if(thisLayerName === 'relinks-end')
									value = sp['opendoc-relinks-end'];
								else if(thisLayerName === 'opendoc-relinks-end')
									value = sp['relinks-end'];
							}
							a.push(value);
						}
						index++;
						var res = a.map(function(d, i) { return {x: i, y: d}; });
						return res;
					})),
					yGroupMax = d3.max(layers, function(layer) { return d3.max(layer, function(d) { return d.y; }); }),
					yStackMax = d3.max(layers, function(layer) { return d3.max(layer, function(d) { return d.y0 + d.y; }); });

				var margin = {top: 40, right: 10, bottom: 20, left: 10},
					width = 960 - margin.left - margin.right,
					height = 500 - margin.top - margin.bottom;

				var x = d3.scale.ordinal()
					.domain(d3.range(m))
					.rangeRoundBands([0, width], .08);

				var y = d3.scale.linear()
					.domain([0, yStackMax])
					.range([height, 0]);

				var color = d3.scale.linear()
					.domain([0, n - 1])
					.range(["#aad", "#556"]);

				var xAxis = d3.svg.axis()
					.scale(x)
					.tickFormat(function(d) { return tickText[d]; })
					.tickPadding(6)
					.orient("bottom");

				// var yAxis = d3.svg.axis()
				// 	.scale(y)
				// 	.tickFormat(function(d) {
				// 		return "hello";
				// 	})
				// 	.ticks(d3.time.minutes, 15)
				// 	.tickPadding(6)
				// 	.orient("left");


				var svg = d3.select("#main_historyPerf").append("svg")
					.attr("width", width + margin.left + margin.right)
					.attr("height", height + margin.top + margin.bottom)
				  .append("g")
					.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

				var layer = svg.selectAll(".layer")
					.data(layers)
				  .enter().append("g")
					.attr("class", "layer")
					.style("fill", function(d, i) { return color(i); });

				var rect = layer.selectAll("rect")
					.data(function(d) { return d; })
				  .enter().append("rect")
					.attr("x", function(d) { return x(d.x); })
					.attr("y", height)
					.attr("width", x.rangeBand())
					.attr("height", 0)
					.on("mouseover", mouseover);

				rect.transition()
					.delay(function(d, i) { return i * 10; })
					.attr("y", function(d) { return y(d.y0 + d.y); })
					.attr("height", function(d) { return y(d.y0) - y(d.y0 + d.y); });

				svg.append("g")
					.attr("class", "x axis")
					.attr("transform", "translate(0," + height + ")")
					.call(xAxis);

				// svg.append("g")
				// 	.attr("class", "y axis")
				// 	.attr("transform", "translate(30,0)")
				// 	.call(yAxis);

				d3.selectAll("input").on("change", change);

				d3.selectAll("rect")
					.on("mouseover", mouseover)
					.on("mouseleave", mouseleave);


				var timeout = setTimeout(function() {
				  d3.select("input[value=\"grouped\"]").property("checked", true).each(change);
				}, 2000);

				var preColor;
				function convert2TimeString(seconds)
				{
				  var hs = Math.floor(seconds/3600);
				  var restSeconds = seconds - hs*3600;
				  var ms = Math.floor(restSeconds/60);
				  var restSeconds = restSeconds - ms*60;
				  var ss = Math.ceil(restSeconds);
				  return hs + ':' + ms + ':' + ss;
				}
				function mouseover(d, i) {
					//d3.select(rect[0][i]).style("fill", "red");
					if(i === undefined)
						return;

					var nSample = i%samplenames.length;
					var nTask = (i-nSample)/samplenames.length;
					var sn = samplenames[nSample];
					var sr = result[sn];
					var tn = layernames[nTask];
					var tr = sr[tn];
					if(tr === undefined && tn==='relinks-end')
						tr = sr['opendoc-relinks-end'];

					sn = tickText[nSample];
					var totalTime = 0;
					for(var p in sr)
						totalTime += sr[p];

					console.log(sn + ":" + tn + ":"+ tr);
					var rect =d3.select(d3.selectAll('rect')[0][i]);
					preColor = rect.style("fill");
					rect.style("fill", "green");

					$('#selectedInformation .packageNameAndTime').html(
						'<p><span class="label label-primary">'+sn + '</span> TotalTime = ' 
						+ convert2TimeString(totalTime)  + '</p>');
					$('#selectedInformation .taskNameAndTime').html(
						'<p><span class="label label-info">' + tn + '</span> time = ' 
						+ convert2TimeString(tr) + '</p>');
				}

				function mouseleave(d, i) {
					if(i === undefined)
						return;
					var rect =d3.select(d3.selectAll('rect')[0][i]);
					if(preColor)
						rect.style("fill", preColor);
				}

				function change() {
				  clearTimeout(timeout);
				  if (this.value === "grouped") transitionGrouped();
				  else transitionStacked();
				}

				function transitionGrouped() {
				  y.domain([0, yGroupMax]);

				  rect.transition()
					  .duration(500)
					  .delay(function(d, i) { return i * 10; })
					  .attr("x", function(d, i, j) { return x(d.x) + x.rangeBand() / n * j; })
					  .attr("width", x.rangeBand() / n)
					.transition()
					  .attr("y", function(d) { return y(d.y); })
					  .attr("height", function(d) { return height - y(d.y); });
				}

				function transitionStacked() {
				  y.domain([0, yStackMax]);

				  rect.transition()
					  .duration(500)
					  .delay(function(d, i) { return i * 10; })
					  .attr("y", function(d) { return y(d.y0 + d.y); })
					  .attr("height", function(d) { return y(d.y0) - y(d.y0 + d.y); })
					.transition()
					  .attr("x", function(d) { return x(d.x); })
					  .attr("width", x.rangeBand());
				}

				// Inspired by Lee Byron's test data generator.
				function bumpLayer(n, o) {

				  function bump(a) {
					var x = 1 / (.1 + Math.random()),
						y = 2 * Math.random() - .5,
						z = 10 / (.1 + Math.random());
					for (var i = 0; i < n; i++) {
					  var w = (i / n - y) * z;
					  a[i] += x * Math.exp(-w * w);
					}
				  }

				  var a = [], i;
				  for (i = 0; i < n; ++i) a[i] = o + o * Math.random();
				  for (i = 0; i < 5; ++i) bump(a);
				  var res = a.map(function(d, i) { return {x: i, y: Math.max(0, d)}; });
					return res;
				}


			},
			"json"
		);
	}


});