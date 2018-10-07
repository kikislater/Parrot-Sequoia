$(function () {
    var ssid;
    var calibrationState0;
    var calibrationState1;
    var calibrationStatus0;
    var calibrationStatus1;
    var justStarted;
    var irConnected = 0;
    var disconnected = 0;
    var language;

    var base_address_url = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port;
    var address_config = base_address_url + "/config";
    var address_settings = base_address_url + "/settings";
    var addressCheckChange = base_address_url + "/checkChange";
    var addressPLF = base_address_url + "/plf";
    var address_capture = base_address_url + "/capture";
    var addressConnection = base_address_url + "/connection";
    var address_calibration = base_address_url + "/calibration";
    var address_wifi = base_address_url + "/wifi";
    var timerCalibration;
    var deco;
    var decoTimeout;
    var isDebuggable = "no";
    var socket;
    var timerWifi;
    var isOS = /iPad|iPhone|iPod/.test(navigator.platform);
    var factory_reset_running = 0;
    var install_running = 0;

    setInterval(checkConnection, 4000);

    setTimeout(function () {
        socket = new WebSocket("ws://" + window.location.hostname + ":" + "80" + "/websocket");
        socket.onopen = function () {
            console.info("Socket opened");
        };

        socket.onclose = function () {
            console.info("Socket closed");
        };

        socket.onmessage = function (msg) {
            var change = jQuery.parseJSON(msg['data']);
            if (change['status'] == "done") {
                console.info("change done");
            } else if (change['status'] == "change") {
                handleChange(change);
                console.info(change);
            } else if (change['status'] == "pending") {
                console.info("pending");
                socket.send("present");
            } else if (change['status'] == "ping") {
                console.info("ping");
                socket.send("pong");
            } else {
                console.warn(msg['data']);
            }

        }

        socket.onerror = function (error) {
            console.error(error.data);
        }
    }, 10);

    function checkConnection() {
        $.ajax({
            url: addressConnection,
            type: "GET",
            dataType: "text",
            timeout: 6000,
            cache: false,
            success: function (result) {
                if (disconnected == 1) {
                    window.location.reload(false);
                }
                disconnected = 0;
            },
            error: function (xhr, ajaxOptions, thrownError) {
                //console.log("req err : " + xhr.responseText);
                //console.log(thrownError);
                if (disconnected == 0)
                    displayDisconnected();
            }

        });
    }

    $().ready(function () {
        if ($("#language").attr('href') == "settings.html")
            language = "FR";
        else
            language = "EN";
        if (!isOS)
            $('[data-toggle="tooltip"]').tooltip();
        setTimeout(function () {
            getDebuggable();
            getSSID();
            getStatus();
        }, 100);

        $(document).on('click', '.wifi_on', function (e) {
            var autoS
            e.preventDefault();
            if ($("#wifi_on").hasClass("toggle-button-selected"))
                wifi = "off";
            else
                wifi = "on";
            console.info("wifi > " + autoS);
            if (wifi == "off")
                $("#woffmodal").modal('show');
            else
                sendWifiStatus(wifi);
        });

        $("#confirmwifioff").click(function (e) {
            sendWifiStatus("off");
        });

        $("#factoryreset").click(function () {
            $("#resetmodal").modal('show');
        });

        $("#confirmreset").click(function () {
            factoryReset();
        });
        $("#calibration").click(function () {
            startCalibration();
        });
        $("#calibModal").on('hidden.bs.modal', function () {
            stopCalibration();
        });
        $("#startlog").click(function () {
            startLog();
        });
        $("#parselog").click(function () {
            parseLog();
        });
        $(document).on('change', '#input-upload', function () {
            //console.log($('#input-upload')[0].files[0].name);
            uploadAndSend();
        });
        $(document).on('click', "#dlbugreport", function (e) {
            console.info("click on download");
            downloadMacgyver($(this).attr('name'));
        });
        $("#set_ssid").click(function () {
            $("#text_ssid").hide();
            $("#input_ssid").show();
            $("#set_ssid").hide();
            $("#send_ssid").show();
        });
        $("#send_ssid").click(function () {
            if (checkLength($("#input_ssid").val()) <= 32) {
                $("#wssidmodal").modal('show');
                timerWifi = setInterval(function () {
                    var t = parseInt($("#rt").html());
                    console.info("time > " + t);
                    if (t > 0) {
                        $("#rt").html(--t);
                    } else {
                        clearInterval(timerWifi);
                        var ssid = {
                            ssid: $("#input_ssid").val()
                        }
                        $.ajax({
                            url: address_wifi,
                            type: "POST",
                            dataType: "json",
                            contentType: "json",
                            data: JSON.stringify(ssid),
                            cache: false,
                            timeout: 10000,
                            success: function (result) {
                                $("#alert_ssid").hide();
                                console.info(result);
                                if (result['status'] == "Ok")
                                    $("#text_ssid").html($("#input_ssid").val());
                                $("#text_ssid").show();
                                $("#input_ssid").hide();
                                $("#set_ssid").show();
                                $("#send_ssid").hide();
                            }
                        });
                        $("#wssidmodal").modal('hide');
                    }
                }, 1000);
            } else {
                $("#alert_ssid").show();
            }
        })
    });


    function sendWifiStatus(wifi) {
        var config = {
            status: wifi
        };
        $.ajax({
            url: address_wifi,
            type: "POST",
            dataType: "json",
            contentType: "json",
            data: JSON.stringify(config),
            timeout: 5000,
            cache: false,
            success: function (result) {
                console.log(result);
                if (result['status'] == "Ok")
                    handleWifiStatus(wifi);
            },
            error: function (xhr, ajaxOptions, thrownError) {
                //console.log("req err : " + xhr.responseText);
                //console.log(thrownError);
            }
        });
    }

    function handleWifiStatus(status) {
        if (status == "on") {
            if (!$("#wifi_on").hasClass("toggle-button-selected"))
                $("#wifi_on").addClass("toggle-button-selected");
        } else if (status == "off") {
            if ($("#wifi_on").hasClass("toggle-button-selected"))
                $("#wifi_on").removeClass("toggle-button-selected");
        }
    }

    function factoryReset() {
        var settings = {
            action: "factoryreset"
        }
        $.ajax({
            url: address_settings,
            type: "POST",
            dataType: "json",
            data: JSON.stringify(settings),
            success: function (result) {
                console.log(result);
                if (result['status'] == "Ok")
                    factory_reset_running = 1;
            }
        })
    }

    function checkLength(countMe) {
        var escapedStr = encodeURI(countMe)
        if (escapedStr.indexOf("%") != -1) {
            var count = escapedStr.split("%").length - 1
            if (count == 0) count++ //perverse case; can't happen with real UTF-8
                var tmp = escapedStr.length - (count * 3)
            count = count + tmp
        } else {
            count = escapedStr.length
        }
        return count;
    }

    function uploadAndSend() {
        var plf = $('#input-upload')[0].files[0];
        $("#fileName").text(plf.name);
        $("#block-filename").show();
        fileSize = plf.size;
        //console.log ("File Size : "+fileSize);

        var fileData = {
            action: "plf",
            fileSize: fileSize
        }

        $.ajax({
            url: addressPLF,
            type: 'POST',
            data: JSON.stringify(fileData),
            cache: false,
            dataType: 'json',
            complete: function (result) {
                console.log("Complete : " + result.responseText);
                $("#block-filename").hide();
                $("#block-upload-progress").show();
                $("#text-info").text('Uploading...');
                $("#text-info-fr").text('Envoi...');
                $.ajax({
                    xhr: function () {
                        var xhr = new window.XMLHttpRequest();

                        xhr.upload.addEventListener("progress", function (evt) {
                            if (evt.lengthComputable) {
                                var percentComplete = evt.loaded / evt.total;
                                percentComplete = parseInt(percentComplete * 100);
                                $("#upload-progress").attr('aria-valuenow', percentComplete);
                                $("#upload-progress").attr('style', 'width: ' + percentComplete + '%');
                                $("#upload-progress").text(percentComplete + "%");
                                if (percentComplete === 100) {
                                    $("#text-info").text('Installing...');
                                    $("#text-info-fr").text('Installation...');
                                }

                            }
                        }, false);

                        return xhr;
                    },
                    url: addressPLF,
                    type: 'POST',
                    data: plf,
                    cache: 'false',
                    processData: false,
                    contentType: false,
                    complete: function (result) {
                        $("#block-upload-progress").hide();
                        $("#upload-progress").attr('aria-valuenow', 0);
                        $("#upload-progress").attr('style', 'width: 0%');
                        $("#upload-progress").text("0%");
                        install_running = 1;
                        //console.log("sending file : "+result.responseText);
                    }
                });

            }
        });
    }

    var idClient = 0;

    function displayDisconnected() {
        decoTimeout = setTimeout(deco, 2000);
    }

    function deco() {
            disconnected = 1;
            $('body').removeClass("modal-open");
            $('body').css('height', '100%');
            $('body').html('<div id="disp" style="text-align: center;vertical-align:center"></div>');

            if (factory_reset_running == 1) {
                if (language == "FR") {
                    $("#disp").append('<h1>Sequoia Déconnecté</h1><p>Veuillez patientez pendant que le sequoia restaure les paramètres d\'usine</p><p>L\'opération peut prendre plusieurs minutes</p>');
                } else {
                    $("#disp").append('<h1>Sequoia Disconnected</h1><p>Please wait until the factory reset is complete</p><p>This operation could take several minutes</p>');
                }
            }
            else if (install_running == 1) {
                if (language == "FR") {
                    $("#disp").append('<h1>Sequoia Déconnecté</h1><p>Veuillez patientez pendant que le sequoia installe la mise à jour</p><p>L\'opération peut prendre plusieurs minutes</p>');
                } else {
                    $("#disp").append('<h1>Sequoia Disconnected</h1><p>Please wait while the Sequoia install the update</p><p>This operation could take several minutes</p>');
                }
            }
            else {
                if (language == "FR") {
                    $("#disp").append('<h1>Sequoia Déconnecté</h1><p>Veuillez vérifier votre connexion</p>');
                } else {
                    $("#disp").append('<h1>Sequoia Disconnected</h1><p>Please check your connection</p>');
                }
            }
    }


    function handleChange(result) {
        var element;



        if (result['bug_report']) {
            $("#bugfilename").html(element['status'] + ".zip");
            $("#dlbugreport").attr('name', element['status']);
            $("#bugmodal").modal('show');
        }

        if (result['storage_status']) {
            element = result['storage_status'];
            if (result['sd'] == "disconnected" || result['sd'] == "connected")
                refreshSD();
        }
    }

    function isUpToDate(idClient, idEvent) {
        if (idClient < idEvent) {
            return false;
        } else {
            return true;
        }
    }

    function getSSID() {
        $.ajax({
            url: address_wifi,
            type: "GET",
            dataType: "json",
            success: function (result) {
                console.log(result);
                $("#text_ssid").html(result['ssid']);
                handleWifiStatus(result['status']);
            }
        })
    }

    function getDebuggable() {
        var settings = {
            action: "getdebuggable"
        }
        $.ajax({
            url: address_settings,
            type: "post",
            dataType: "text",
            contentType: "json",
            data: JSON.stringify(settings),
            success: function (result) {
                clearTimeout(decoTimeout);
                //console.log(result.responseText);
                isDebuggable = result;
                if (result == "yes") {
                    $(".debug").show();
                } else {
                    $(".debug").hide();
                }
            }
        })
    }

    function startLog() {
        var settings = {
            action: "startlog"
        }
        $.ajax({
            url: address_settings,
            type: "post",
            dataType: "json",
            data: JSON.stringify(settings),
            complete: function (result) {
                //console.log(result.responseText);
            }
        })
    }

    function parseLog() {
        var settings = {
            action: "parselog"
        }
        $.ajax({
            url: address_settings,
            type: "post",
            dataType: "json",
            data: JSON.stringify(settings),
            complete: function (result) {
                //console.log(result.responseText);
            }
        })
    }

    function refreshCalibration() {
        getCalibrationStatus();
    }

    function startCalibration() {
        $.ajax({
            url: address_calibration + "/start",
            type: "GET",
            dataType: "json",
            timeout: 5000,
            cache: false,
            success: function (result) {
                console.info(result);
                if (result['body'] == "Ok")
                    calibrationState0 = 3;
                if (result['sunshine'] == "Ok")
                    calibrationState1 = 3;
                if (result['sunshine'] == "Fail to send command")
                    calibrationState1 = 0;
                $("#btnstopcalibration").show();
                $("#btnclosecalibration").hide();
                if ($("#language").attr('href') == "settingsfr.html")
                    $("#titleModalCalibrate").replaceWith('<span id="titleModalCalibrate">Please calibrate Sequoia</span>');
                else
                    $("#titleModalCalibrate").replaceWith('<span id="titleModalCalibrate">Veuillez calibrer votre Sequoia</span>');
                //console.log(result.responseText);
                handleCalibration();
                timerCalibration = setInterval(function () {
                    refreshCalibration()
                }, 1000);
                $("#calibModal").modal('show');
            }
        });
    }

    function stopCalibration() {
        $.ajax({
            url: address_calibration + "/stop",
            type: "GET",
            dataType: "json",
            timeout: 5000,
            cache: false,
            success: function (result) {
                if (result['body'] == "Ok" && result['sunshine'] == "Ok") {
                    calibrationState0 = 0;
                    calibrationState1 = 0;
                    clearInterval(timerCalibration);
                }
            }
        })
    }

    function getStatus() {
        var capture = {
            type: "getstatus"
        };
        $.ajax({
            url: address_capture,
            type: "post",
            dataType: "text",
            contentType: "json",
            data: JSON.stringify(capture),
            success: function (result) {
                //console.log("Status : "+result.responseText);
                var status = (result).split(" ");
                irConnected = status[1];
            }
        });
    }


    function getCalibrationStatus() {
        var response;
        $.ajax({
            url: address_calibration,
            type: "GET",
            dataType: "json",
            timeout: 5000,
            cache: false,
            success: function (result) {
                clearTimeout(decoTimeout);
                //console.log("Calibration Status : " + result);
                if (result['body'] == "Ok") {
                    calibrationState0 = 0;
                } else if (result['body'] == "None") {
                    calibrationState0 = 4;
                } else {
                    if (result['body'] == "Psi pending") {
                        calibrationState0 = 3;
                    } else if (result['body'] == "Theta pending") {
                        calibrationState0 = 2;
                    } else if (result['body'] == "Phi pending") {
                        calibrationState0 = 1;
                    }
                }

                if (result['sunshine']) {
                    if (result['sunshine'] == "Ok") {
                        calibrationState1 = 0;
                    } else if (result['sunshine'] == "None") {
                        calibrationState0 = 4;
                    } else {
                        if (result['sunshine'] == "Psi pending") {
                            calibrationState1 = 3;
                        } else if (result['sunshine'] == "Theta pending") {
                            calibrationState1 = 2;
                        } else if (result['sunshine'] == "Phi pending") {
                            calibrationState1 = 1;
                        }
                    }
                }

                if (calibrationState0 > 0 || calibrationState1 > 0) {
                    $("#btnstopcalibration").show();
                    $("#btnclosecalibration").hide();
                }
                //console.log("Calibration >> " + calibrationState0 + " " + calibrationState1);
                handleCalibration();

            },
            error: function (xhr, ajaxOptions, thrownError) {
                //console.log(thrownError);
                if (thrownError == "Service Unavailable" || xhr.status == 0) {
                    displayDisconnected();
                    disconnected = 1;
                }
            }
        });
    }

    function handleCalibration() {

        if (calibrationState0 == 3 || calibrationState1 == 3) {
            $(".yaw").fadeTo(1, 1);
            $(".pitch").fadeTo(1, 0.5);
            $(".roll").fadeTo(1, 0.5);
            //console.log("PSI"+calibrationState0+calibrationState1);
        }
        if (calibrationState0 < 3 && calibrationState1 < 3 && (calibrationState0 == 2 || calibrationState1 == 2)) {
            $(".yaw").fadeTo(1, 0.5);
            $(".pitch").fadeTo(1, 1);
            $(".roll").fadeTo(1, 0.5);
            //console.log("THETA"+calibrationState0+calibrationState1);
        }
        if (calibrationState0 < 2 && calibrationState1 < 2 && (calibrationState0 == 1 || calibrationState1 == 1)) {
            $(".yaw").fadeTo(1, 0.5);
            $(".pitch").fadeTo(1, 0.5);
            $(".roll").fadeTo(1, 1);
            //console.log("PHI"+calibrationState0+calibrationState1);
        }
        if (calibrationState0 == 0 && calibrationState1 == 0) {
            $("#titleModalCalibrate").replaceWith('<span id="titleModalCalibrate">CALIBRATION DONE !</span>');
            $("#btnstopcalibration").hide();
            $("#btnclosecalibration").show();
            $(".yaw").fadeTo(1, 0.5);
            $(".pitch").fadeTo(1, 0.5);
            $(".roll").fadeTo(1, 0.5);
            //console.log("DONE"+calibrationState0+calibrationState1);

        }
    }
});
