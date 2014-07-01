$(function() {

    function getCssValue (selector, cssname) {
        var v = $(selector).css(cssname);
        v = v.substr(0, v.length -2);
        v = parseInt(v);
        return v;
    }

    function getHeight (selector, ignoreMargin) {
        var height = getCssValue(selector, 'height');

        if(!ignoreMargin)
        {
            var mh = getCssValue(selector, 'margin-top');
            height += mh;
            var mb = getCssValue(selector, 'margin-bottom');
            height += mb;
        }
        return height;
    }
    function getResultPanelHeight () {
        var consoleHeight = $('#testing_information')[0].clientHeight - 
            getHeight('#pack_name') -
            getHeight('#testStatus');
        consoleHeight -= getHeight('.ui-tabs-nav') + 15;
        return consoleHeight + 'px';
    }

    // setup the tables.
    $('#testcontrolpanel').tabs({
        beforeLoad: function( event, ui ) {
                ui.jqXHR.error(function() {
                  ui.panel.html(
                    "Couldn't load this tab. We'll try to fix this as soon as possible. " +
                    "If this wouldn't be a demo." );
                });
              },
        activate: function(event, ui) {
            var tab = ui.newTab[0];
            if(!tab)
                return;
            var atag = tab.firstChild;
            if(!atag)
                return;
            var ahref = atag.href;
            if(!ahref)
                return;
            var divId = ahref.substr(ahref.lastIndexOf('#'));
            if($(divId).length < 1)
                return;
            $(divId)[0].style.height = getResultPanelHeight();
        }
    });


    //Socket.io 'http://10.148.205.1:3000'
    window.socket = io.connect(null, {
        'port': 3000,
        'force new connection': true
    });



    // initialize the modal form.
    $("#testing_information").dialog({
        autoOpen: false,
        height: $(window).height() - 180,
        width: $(window).width() - 100,
        modal: true,
        buttons: {
            Cancel: function() {
                $(this).dialog("close");
            }
        },
        open: function(event, ui) {
            if (!window.testjob_id)
                return;

            window.isTestingInformationPanelVisible = true;

            // always set the console as the active tab.
            $( "#testcontrolpanel" ).tabs( "option", "active", 0 );

            var actionString = window.testjob_id.split('_')[0];
            $('#pack_name')[0].innerText = window.testjob_id.split(' ')[1];
            var consoleElem = $('#test_console')[0];
            consoleElem.innerHTML = ''; // clean the content.

            $("#testStatus").html('Status: <span style=color:#00ff00;"> In process.</span>');

            consoleElem.style.height = getResultPanelHeight();

            if ( !! window.socket)
                window.socket.emit(actionString, window.testjob_id);

            if(!window.carouselLinks)
                window.carouselLinks = new Array();
            
            // clean up the bubble result and make it as accordion.
            $("#checkbubble_accordionbody").html('');
            $("#checkbubble_accordionbody").accordion({
                collapsible: true,
                active: false,
                activate: function(event, ui) {
                    var panel = ui.newPanel;
                    panel.css('height', '100%');
                },
            });
        },
        resize: function (event, ui) {
            var consoleElem = $('#test_console')[0];
            consoleElem.style.height = getResultPanelHeight();
        },
        close: function() {
            // if ( !! window.socket) {
            //     socket.disconnect(); // disconnect.
            //     delete window.socket;
            // }
            window.isTestingInformationPanelVisible = false;

            if(window.carouselLinks)
                delete window.carouselLinks;

            // clean the checkers.
            $(".check_result").switchClass('show', 'hide');
            $("#check_2d_tbody .temp").remove();

        }
    });

    function openModalDialog(button) {
        // body...
    }

    $('.testinfo_btn ').button().click(function() {
        var idstr = $(this).attr('id');
        window.testjob_id = idstr;

        $("#testing_information").dialog("open");
    });

    $('.generateBenchmarks_button').button().click(function() {
        var idstr = $(this).attr('id');
        window.testjob_id = idstr;
        $("#testing_information").dialog("open");
    })

    // runtest_button onclick event.
    $('.runtest_button').button().click(function() {
        // body...
        var idstr = $(this).attr('id');
        window.testjob_id = idstr;

        var strs = window.testjob_id.split(' ');
        var idprefix = strs[0];
        var prfixstrs = idprefix.split('_');
        idprefix = "monitorTest_" + prfixstrs[1] + '_' + prfixstrs[2];
        var packName = strs[1];


        // update the UI.
        // 1. disables other runtest buttons.
        $('.runtest_button').attr('disabled', 'disabled');


        // 2. set this button to monitor status.
        var btnId = idprefix + ' ' + packName;
        $(this).replaceWith('<button id="' + btnId + '" type="button" class="monitortest_button btn btn-info btn-block">Monitor Process</button>');
        setTimeout(function() {
            var btnElem = document.getElementById(btnId);
            if ( !! btnElem) {
                btnElem.addEventListener('click', function() {
                    var idstr = $(this).attr('id');
                    window.testjob_id = idstr;

                    $("#testing_information").dialog("open");
                });
            }
        }, 500);

    });

    window.socket.on('connect', function(msg) {
        // socket.emit('start_testjob', idstr);
    });
    window.socket.on('test_information_info', function(msg) {
        if (window.isTestingInformationPanelVisible) {
            console.log(msg);
            $("#test_console").append('<p><span style=color:#ffffff;">' + msg + '</span></p>');
            $("#test_console").scrollTop($("#test_console")[0].scrollHeight);
        }
    })

    window.socket.on('test_information_success', function(msg) {
        if (window.isTestingInformationPanelVisible) {
            console.log(msg);
            $("#test_console").append('<p><span style=color:#00ff00;">' + msg + '</span></p>');
            $("#test_console").scrollTop($("#test_console")[0].scrollHeight);
        }
    })

    window.socket.on('test_information_error', function(msg) {
        if (window.isTestingInformationPanelVisible) {
            console.log(msg);
            $("#test_console").append('<p><span style=color:#ff0000;">' + msg + '</span></p>');
            $("#test_console").scrollTop($("#test_console")[0].scrollHeight);
        }
    });

    window.socket.on('test_information_hint', function(msg) {
        if(window.isTestingInformationPanelVisible){
            console.log(msg);
            var hintObj = JSON.parse(msg);
            var width = getCssValue('#test_console', 'width');
            var urlhead = (!!hintObj.hostIP)? hintObj : "localhost";
            urlhead = "http://" + urlhead + ":8081/";

            if(hintObj.checkType === 1008) //View2DCheck_ImageCompareCheck
            {
                var fcwidth = width*0.1;
                var otwidth = width*0.25;
                var genImageUrl = hintObj.outputPath.replace(/\\/g, '/');
                genImageUrl = urlhead + 'results/' + genImageUrl.substr('e:/tf/output/'.length);
                // "e:\tf\benchmarks\ReleasePerCL\2015\rac_advanced_sample_project.rvt\A2___Sections.dwfx.png"
                var benImageUrl = hintObj.benchmarkPath.replace(/\\/g, '/');
                benImageUrl = urlhead + benImageUrl.substr('e:/tf/'.length);
                // "e:\tf\output\ReleasePerCL\RevitExtractor_x64_CL410709_20140608_2235\2015\rac_advanced_sample_project\output\Resource\Sheet\A2___Sections\A2___Sections.dwfx.png_diffImage.bmp"
                var diffImageUrl = hintObj.diffImagePath.replace(/\\/g, '/');
                diffImageUrl = urlhead + 'results/' +diffImageUrl.substr('e:/tf/output/'.length);
                var htmlText = '<tr class="temp"><td align="center" style="width:'+ fcwidth +'px;"><div class="tdhead">' + hintObj.message + 
                    '</div></td><td align="center"><a href="'+genImageUrl+
                    '" title="generated image" data-gallery><img src="' + genImageUrl + 
                    '" style="width:'+ otwidth + 'px; height:'+ otwidth + 'px;"></a></td><td align="center"><a href="'+benImageUrl+
                    '" title="baseline image" data-gallery><img src="' + benImageUrl + 
                    '" style="width: '+ otwidth + 'px; height:'+ otwidth + 'px;"></td><td align="center"><a href="'+diffImageUrl+
                    '" title="different image" data-gallery><img src="' + diffImageUrl + 
                    '" style="width: '+ otwidth + 'px; height:'+ otwidth + 'px;"></td></tr>';
                $("#check_2d_tbody tr:last").after(htmlText);
                if(!window.carouselLinks && Array.isArray(window.carouselLinks)){
                    window.carouselLinks.push({
                        href: genImageUrl,
                        title: "generated image"
                    });
                    window.carouselLinks.push({
                        href: benImageUrl,
                        title: "baseline image"
                    });
                    window.carouselLinks.push({
                        href: diffImageUrl,
                        title: "different image"
                    });
                }
                //blueimp.Gallery($('#check_2d_tbody a'), $('#blueimp-gallery').data());
            }
            else if(hintObj.checkType === 1001) // BubbleFileCheck
            {
                var diffTextPath = hintObj.diffTextPath.replace(/\\/g, '/');
                diffTextPath = urlhead + 'results/' + diffTextPath.substr('e:/tf/output/'.length);

                // $.ajax({
                //     url:diffTextPath,
                //     success:function(result){
                //         var html = '<h3>'+ hintObj.message +'</h3><div><iframe src="' + diffTextPath + '"/></div>';
                //         $("#div1").html(result);
                //         $("#checkbubble_accordionbody").append(html);
                //         $("#checkbubble_accordionbody").accordion( "refresh" );
                //     }
                // });

                var html = '<h3>'+ hintObj.message + 
                    '</h3><div><iframe style="height:auto;width:100%;" src="' + diffTextPath + '"/></div>';
                $("#checkbubble_accordionbody").append(html);
                $("#checkbubble_accordionbody").accordion( "refresh" );

            }

        }
    });

    window.socket.on('test_information_update', function(msg) {
        console.log(msg);
        var updateObj = JSON.parse(msg);
        if (window.isTestingInformationPanelVisible) {

            if ( !! updateObj.testcase) {
                //
                $("#testStatus").html('Status: <span style=color:#00ff00;">Running the ' + updateObj.testcase.current + 'th case in total ' + updateObj.testcase.count + ' cases.</span>');
            }
            if ( !! updateObj.result) {
                if (updateObj.result.success == updateObj.result.count)
                    $("#testStatus").html('Status: <span style=color:#00ff00;"> Test completed! - Success: ' + updateObj.result.success + '| Failures: ' + updateObj.result.failures + '| Totals: ' + updateObj.result.count + '.</span>');
                else
                    $("#testStatus").html('Status: <span style=color:#ff0000;"> Test completed! - Success: ' + updateObj.result.success + '| Failures: ' + updateObj.result.failures + '| Totals: ' + updateObj.result.count + '.</span>');
            }
            $("#test_console").scrollTop($("#test_console")[0].scrollHeight);

        }

        if ( !! updateObj.result && !! updateObj.result.buttonId) {
            var btnId = updateObj.result.buttonId;
            var statusString = (updateObj.result.success == updateObj.result.count) ? 'success' : 'failure';

            // show the detail checkers only when the dialog is open and the result is failure.
            if(window.isTestingInformationPanelVisible && statusString === 'failure')
            {
                $(".check_result").switchClass('hide', 'show');
                // Initialize the Gallery as image carousel:
                blueimp.Gallery(window.carouselLinks, {
                    container: '#blueimp-gallery',
                    carousel: true,
                    transitionSpeed: 1
                });
            }

            //$("button[id='monitorTest_1_0 RevitExtractor_x64_2015.0.2014.0519.zip']") 
            var strs = btnId.split(' ');
            var prefixstrs = strs[0].split('_');
            var monitorBtn = 'monitorTest_' + prefixstrs[1] + '_' + prefixstrs[2] +
                ' ' + strs[1];
            var newBtnId = 'browseResult_' + prefixstrs[1] + '_' + prefixstrs[2] +
                ' ' + strs[1];
            // just return if the button is already the new button.
            if ($("button[id='" + monitorBtn + "']").length === 0)
                return;

            // replace the button with the browse result button.
            // $("button[id='" + btnId + "']").replaceWith('<button id="' + newBtnId +
            //     '" type="button" class="browseResult_button testinfo_btn btn btn-default btn-block">Browse Result</button>');
            $("button[id='" + monitorBtn + "']").replaceWith('<button id="' + newBtnId +
                '" type="button" class="browseResult_button testinfo_btn btn btn-default btn-block">Browse Result</button>');

            // update the status label.
            $('#ts_' + prefixstrs[1] + '_' + prefixstrs[2])[0].innerText = statusString;
            $('#ts_' + prefixstrs[1] + '_' + prefixstrs[2]).removeClass('unknown').addClass(statusString);

            // enables the run test buttons.
            $('.runtest_button').removeAttr('disabled');

            setTimeout(function() {
                // rebind the event for this newly button.
                var newBtnElem = document.getElementById(newBtnId);
                if ( !! newBtnElem) {
                    newBtnElem.addEventListener('click', function() {
                        var idstr = $(this).attr('id');
                        window.testjob_id = idstr;

                        $("#testing_information").dialog("open");
                    });
                }
            }, 500);

        }

    });


    $(window).on('unload', function() {
        if ( !! window.socket) {
            window.socket.disconnect(); // disconnect.
            delete window.socket;
        }
    });
});