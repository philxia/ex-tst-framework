$(function() {

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

            var actionString = window.testjob_id.split('_')[0];
            $('#pack_name')[0].innerText = window.testjob_id.split(' ')[1];
            var consoleElem = $('#test_console')[0];
            consoleElem.innerHTML = ''; // clean the content.

            $("#testStatus").html('Status: <span style=color:#00ff00;"> In process.</span>');

            var consoleHeight = $('#testing_information')[0].clientHeight - 220;
            // var consoleWidth = $('#testing_information')[0].clientWidth - 220;
            consoleElem.style.height = consoleHeight + 'px';
            // consoleElem.style.width = consoleWidth + 'px';

            if ( !! window.socket)
                window.socket.emit(actionString, window.testjob_id);

        },
        close: function() {
            // if ( !! window.socket) {
            //     socket.disconnect(); // disconnect.
            //     delete window.socket;
            // }
            window.isTestingInformationPanelVisible = false;
        }
    });

    function openModalDialog(button) {
        // body...
    }

    $('.testinfo_btn ').button().click(function() {
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
            // $("id=['" + btnId + "']").button().click(function() {
            //     var idstr = $(this).attr('id');
            //     window.testjob_id = idstr;

            //     $("#testing_information").dialog("open");
            // })
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
    })

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

            //$("button[id='monitorTest_1_0 RevitExtractor_x64_2015.0.2014.0519.zip']") 
            var strs = btnId.split(' ');
            var prefixstrs = strs[0].split('_');
            var newBtnId = 'browseResult_' + prefixstrs[1] + '_' + prefixstrs[2] +
                ' ' + strs[1];

            // replace the button with the browse result button.
            $("button[id='" + btnId + "']").replaceWith('<button id="' + newBtnId +
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

    })


    $(window).on('unload', function() {
        if ( !! window.socket) {
            window.socket.disconnect(); // disconnect.
            delete window.socket;
        }
    });
});