$(function () {
    //console.log("Home Page");
    var base_address_url = window.location.protocol + "//" + window.location.hostname;
    var capturemode;
    var resomono;
    var resomain;
    var bitd;
    var captureStatus = 0;
    var g = "enabled";
    var r = "enabled";
    var re = "enabled";
    var nir = "enabled";
    var rgb = "enabled";
    var gpsparam;
    var timelapseparam;
    var autoparam;
    var calibrationStatus0;
    var calibrationStatus1;
    var calibrationState0 = 0;
    var calibrationState1 = 0;
    var justStarted = 0;
    var idClient = 0;
    var ledState = "on";
    var timerLed = null;
    var sdAvailable = 0;
    var storageSelected = "internal";
    var irConnected = 0;
    var isImuHeating = 0;
    var disconnected = 0;
    var language;
    var autoselect;
    var calibradio = 0;
    var address_config = base_address_url + "/config";
    var address_capture = base_address_url + "/capture";
    var address_start = base_address_url + "/capture/start";
    var address_stop = base_address_url + "/capture/stop";
    var addressCheckChange = base_address_url + "/checkChange/";
    var addressGallery = base_address_url + "/gallery/";
    var addressConnection = base_address_url + "/connection";
    var addressStorage = base_address_url + "/storage";
    var address_calibration = base_address_url + "/calibration";
    var address_gpsfix = base_address_url + "/gpsfix";
    var timerCalibration;
    var sdReadOnly = 0;
    var sdCorrupted = 0;
    var snapshotSound1 = new Audio("../sounds/photo.ogg");
    var snapshotSound2 = new Audio("../sounds/photo.m4a");
    var soundActive = 1;
    var isOS = /iPad|iPhone|iPod/.test(navigator.platform);
    var radiometr = "off";
    var racal;
    var gpsfixed = 0;
    
    setInterval(checkConnection, 5000);
    refresh();

    var deco;
    var decoTimeout;
    console.info("ws://" + window.location.hostname + ":" + "80" + "/websocket");
    var connection = new WebSocket("ws://" + window.location.hostname + ":" + "80" + "/websocket");
    connection.onopen = function () {
        console.info("Socket opened");
    };

    console.info(navigator);

    connection.onclose = function () {
        console.info("Socket closed");
    };

    connection.onmessage = function (msg) {
        //console.info(msg); //Awesome!
        var change = jQuery.parseJSON(msg['data']);
        if (change['status'] == "done") {
            console.info("change done");
        } else if (change['status'] == "change") {
            console.info("change received");
            console.info(change);
            getStatus();
            handleChange(change);

        } else if (change['status'] == "pending") {
            console.info("pending");
            connection.send("present");
        } else if (change['status'] == "ping") {
            console.info("ping");
            connection.send("pong");
        } else {
            console.warn(msg['data']);
        }

    }

    connection.onerror = function (error) {
        console.error(error.data);
    }

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
                if (calibradio == 0) {
                    displayDisconnected()
                    disconnected = 1;
                }
            }

        });
    }


    function displayDisconnected() {
        decoTimeout = setTimeout(deco, 2000);
    }

    function deco() {
        $('body').removeClass("modal-open");
        $('body').css('height', '100%');
        $('body').html('<div id="disp" style="text-align: center;vertical-align:center"></div>');
        if (language == "indexfr.html") {
            $("#disp").append('<h1>Sequoia Disconnected</h1><p>Please check your connection</p>');
        } else if (language == "index.html") {
            $("#disp").append('<h1>Sequoia Déconnecté</h1><p>Veuillez vérifier votre connexion</p>');
        }
    }

    var cpt = 0;

    function handleChange(result) {
        var element;

        if (result['bug_report']) {
            element = result['bug_report'];
            if (!isUpToDate(idClient, element['id'])) {
                idClient = parseInt(element['id']);
            }
            $("#bugfilename").html(element['status'] + ".zip");
            $("#dlbugreport").attr('name', element['status']);
            $("#bugmodal").modal('show');
            console.warn(idClient);
        }

        if (result['fix']) {
            if (result['fix'] == "yes") {
                gpsfixed = 1;
                handleMsgState();
            }
            else if (result['fix'] == "no") {
                gpsfixed = 0;
                handleMsgState();
            }
        }

        if (result['capture_mode']) {
            if (result['capture_mode'] != "radiometric") {
                capturemode = result['capture_mode'];
                handleCaptureMode();
            }
        }

        if (result['timelapse_param']) {
            timelapseparam = result['timelapse_param'];
            gpsparam = result['gps_param'];
            autoparam = result['overlap_param'];
            handleCaptureParam();
        }

        if (result['sensors_mask']) {
            handleSensors(result['sensors_mask']);
            handleSensorsState();
        }

        if (result['resolution_rgb']) {
            resomain = result['resolution_rgb'];
            resomono = result['resolution_mono'];
            handleResolutionMain();
            handleResolutionMono();
        }

        if (result['bit_depth']) {
            bitd = result['bit_depth'];
            handleBitDefinition();
        }

        if (result['capture']) {
            if (result['capture'] == "running") {
                ledState = "capture";
                $('form :input').attr('disabled', true);
                handleLedState();
                handleMsgState();
                if ($("#radiometric-running").is(':visible'))
                    calibradio = 1;
            } else if (result['capture'] == "ready") {
                if (ledState != "calibration" && ledState != "staystill") {
                    ledState = "on";
                    $("form :input").attr('disabled', false);
                    if (capturemode == "timelapse") {
                        $("#gps").attr('disabled', true);
                        $("#overlap").attr('disabled', true);
                    }
                    if (capturemode == "gps_position") {
                        $("#timelapse").attr('disabled', true);
                        $("#overlap").attr('disabled', true);
                    }
                    if (capturemode == "single") {
                        $("#timelapse").attr('disabled', true);
                        $("#gps").attr('disabled', true);
                        $("#overlap").attr('disabled', true);
                    }
                    if (capturemode == "auto") {
                        $("#timelapse").attr('disabled', true);
                        $("#gps").attr('disabled', true);
                    }
                    handleLedState();
                    handleMsgState();
                }
                if (calibradio == 1) {
                    $("#radiometric-running").hide();
                    $("#radiometric-done").show();
                    $("#cancel-radiometric").hide();
                    $("#close-radiometric").show();
                    calibradio = 0;
                }
            }
        }

        if (result['staystill']) {
            element = result['staystill'];
            if (!isUpToDate(idClient, element['id'])) {
                idClient = parseInt(element['id']);
            }
            if (element['status'] == "yes") {
                ledState = "staystill";
                handleLedState();
                handleMsgState();
                console.info("Stay still")
            } else if (element['status'] == "no") {
                if (ledState == "staystill") {
                    ledState = "on";
                    getCalibrationStatus();
                    handleLedState();
                    handleMsgState();
                    console.info("No stay still")
                }
            }
        }

        if (result['calibration']) {
            if (result['calibration'] == "body")
                handleCalibrationState(result['state'], null);
            else if (result['calibration'] == "sunshine")
                handleCalibrationState(null, result['state']);
            handleCalibration();
        }

        if (result['storage_status']) {
            refreshSD();
            getMemoryInfo();
        }

        if (result['snapshot']) {
            element = result['snapshot'];
            if (ledState == "capture") {
                ledState = "snapshot"
                handleLedState();
                handleMsgState();
                console.info("sound " + soundActive);
                if (soundActive) {
                    console.info("sound " + soundActive);

                    snapshotSound2.volume = 1;
                    snapshotSound1.volume = 1;
                    if (snapshotSound1.play());
                    else snapshotSound2.play();
                }
            }
            if (cpt == 10) {
                getMemoryInfo();
                cpt = 0;
            } else
                cpt++;
        }

        if (result['storage_select']) {
            storageSelected = result['storage_select'];
            handleMemoryInfo();
        }
    }

    function isUpToDate(idClient, idEvent) {
        if (idClient < idEvent) {
            return false;
        } else {
            return true;
        }
    }

    $().ready(function () {
        if (localStorage.getItem("sound") == 0) {
            soundActive = 0;
            $("#sound-ico").attr('src', "img/capture_mode/nosound.png");
        } else if (localStorage.getItem("sound") == 1) {
            soundActive = 1;
            $("#sound-ico").attr('src', "img/capture_mode/sound.png");
        } else {
            soundActive = 1;
            $("#sound-ico").attr('src', "img/capture_mode/sound.png");
            localStorage.setItem("sound", 1);
        }


        if ($("#language").attr('href') == "index.html")
            language = "FR";
        else
            language = "EN";
        if (!isOS)
            $('[data-toggle="tooltip"]').tooltip();
        //console.log("rgb " + rgb);
        //refresh();

        $(document).on('click', '#sound-ico', function (e) {
            if (soundActive) {
                soundActive = 0;
                localStorage.setItem("sound", 0);
                $("#sound-ico").attr('src', "img/capture_mode/nosound.png");
            } else {
                soundActive = 1;
                localStorage.setItem("sound", 1);
                $("#sound-ico").attr('src', "img/capture_mode/sound.png");
            }
        });

        $(document).on('click', '#intmem', function (e) {
            e.preventDefault();
            if (ledState != "capture" && ledState != "snapshot") {
                setMemoryInfo("internal");
            }
        });

        $(document).on('click', '#sdmem', function (e) {
            e.preventDefault();
            if (sdAvailable && !sdReadOnly && !sdCorrupted) {
                if (ledState != "capture" && ledState != "snapshot") {
                    setMemoryInfo("sd");
                }
            }
        });


        $(document).on('click', '#applyT', function () {
            timelapseparam = $("#tlcalculated").text();
            //console.log("TLP" + $("#tlcalculated").text());
            $("#timelapse").val(timelapseparam);
            sendTimelapseParam(timelapseparam);
        });

        $('#speedT').keyup(function (e) {
            if (e.keyCode == 13) {
                calculTimelapse();
            }
        });

        $('#heightT').keyup(function (e) {
            if (e.keyCode == 13) {
                calculTimelapse();
            }
        });

        $('#overlapT').keyup(function (e) {
            if (e.keyCode == 13) {
                calculTimelapse();
            }
        });

        $(document).on('click', '#applyG', function () {
            gpsparam = $("#gpscalculated").text();
            //console.log($("#gpscalculated").text());
            $("#gps").val(gpsparam);
            sendGPSParam();
        });

        $(document).on('keyup', '#heightG', function (e) {
            if (e.keyCode == 13) {
                calculGps();
            }
        });
        $(document).on('keyup', '#overlapG', function (e) {
            if (e.keyCode == 13) {
                calculGps();
            }
        });

        $(document).on('click', "#dlbugreport", function (e) {
            console.info("click on download");
            downloadMacgyver($(this).attr('name'));
        })

        $(document).on('click', '#autoselect', function (e) {
            var autoS
            e.preventDefault();
            if ($("#autoselect").hasClass("toggle-button-selected"))
                autoS = "off";
            else
                autoS = "on";
            console.info("Auto-select > " + autoS);
            sendAutoSelect(autoS);
        });

    });

    var timerR;
    $("#radiometric-calibration").click(function (e) {
        var st;
        if (storageSelected == "internal") st = 1;
        else if (storageSelected == "sd") st = 2;
        console.info("launch radiometric calibration");
        clearInterval(timerR);
        clearTimeout(racal);
        $("#launch-radiometric").show();
        //$("#radiometric-prez").show();
        $("#radiometric-starting").hide();
        $("#radiometric-running").hide();
        $("#radiometric-done").hide();
        $("#cancel-radiometric").show();
        $("#close-radiometric").hide();
        if ($("#language").attr('href') == "indexfr.html")
            $("#urlgallery").attr('href', base_address_url + '/view/gallery.html?source=' + st);
        else
            $("#urlgallery").attr('href', base_address_url + '/view/galleryfr.html?source=' + st);
        $("#radiometric-modal").modal('show');
    });
    $("#launch-radiometric").click(function (e) {
        var i;
        $("#calibsec").html(10);
        racal = setTimeout(function () {
            $.get(base_address_url + "/calibration/radiometric/start");
            $("#radiometric-starting").hide();
            $("#radiometric-running").show();
            radiometr = "on";
        }, 10000);
        timerR = setInterval(function () {
            var v;
            v = parseInt($("#calibsec").html());
            v--;
            $("#calibsec").html(v);
            if (v <= 0) {
                clearInterval(timerR);
            }
        }, 1000);
        $("#launch-radiometric").hide();
        //$("#radiometric-prez").hide();
        $("#radiometric-starting").show();
    });

    $("#overlapG").change(function (e) {
        var reg = /^\d+$/;
        if (reg.test(e.target.value)) {
            if (e.target.value > 95) e.target.value = 95;
            if (e.target.value < 70) e.target.value = 70;
        } else {
            e.target.value = "";
        }
    });

    $("#overlapT").change(function (e) {
        var reg = /^\d+$/;
        if (reg.test(e.target.value)) {
            if (e.target.value > 95) e.target.value = 95;
            if (e.target.value < 70) e.target.value = 70;
        } else {
            e.target.value = "";
        }
    });


    $("#single0").click(function () {
        if (ledState != "capture" && ledState != "snapshot") {
            capturemode = "single";
            sendCaptureMode();
            handleCaptureMode();
            handleMsgState();
        }
    });
    $("#time0").click(function () {
        if (ledState != "capture" && ledState != "snapshot") {
            capturemode = "timelapse";
            sendCaptureMode();
            handleCaptureMode();
            handleMsgState();
        }
    });
    $("#gps0").click(function () {
        if (ledState != "capture" && ledState != "snapshot") {
            capturemode = "gps_position";
            sendCaptureMode();
            handleCaptureMode();
            handleMsgState();
        }
    });
    $("#auto0").click(function () {
        if (ledState != "capture" && ledState != "snapshot") {
            capturemode = "auto";
            sendCaptureMode();
            handleCaptureMode();
            handleMsgState();
        }
    });

    $("#g0").click(function () {
        if (ledState != "capture" && ledState != "snapshot") {
            g = "enabled";
            $("#g0").hide();
            $("#g1").show();
            sendSensorState();
        }
    });
    $("#g1").click(function () {
        if (ledState != "capture" && ledState != "snapshot") {
            g = "disabled";
            $("#g1").hide();
            $("#g0").show();
            sendSensorState();
        }
    });
    $("#r0").click(function () {
        if (ledState != "capture" && ledState != "snapshot") {
            r = "enabled";
            $("#r0").hide();
            $("#r1").show();
            sendSensorState();
        }
    });
    $("#r1").click(function () {
        if (ledState != "capture" && ledState != "snapshot") {
            r = "disabled";
            $("#r1").hide();
            $("#r0").show();
            sendSensorState();
        }
    });
    $("#re0").click(function () {
        if (ledState != "capture" && ledState != "snapshot") {
            re = "enabled";
            $("#re0").hide();
            $("#re1").show();
            sendSensorState();
        }
    });
    $("#re1").click(function () {
        if (ledState != "capture" && ledState != "snapshot") {
            re = "disabled";
            $("#re1").hide();
            $("#re0").show();
            sendSensorState();
        }
    });
    $("#nir0").click(function () {
        if (ledState != "capture" && ledState != "snapshot") {
            nir = "enabled";
            $("#nir0").hide();
            $("#nir1").show();
            sendSensorState();
        }
    });
    $("#nir1").click(function () {
        if (ledState != "capture" && ledState != "snapshot") {
            nir = "disabled";
            $("#nir1").hide();
            $("#nir0").show();
            sendSensorState();
        }
    });
    $("#rgb0").click(function () {
        if (ledState != "capture" && ledState != "snapshot") {
            rgb = "enabled";
            $("#rgb0").hide();
            $("#rgb1").show();
            sendSensorState();
        }
    });
    $("#rgb1").click(function () {
        if (ledState != "capture" && ledState != "snapshot") {
            rgb = "disabled";
            $("#rgb1").hide();
            $("#rgb0").show();
            sendSensorState();
        }
    });
    $("#03mpixmono").click(function () {
        resomono = 0.3;
        sendResolutionMono();
    });
    $("#12mpixmono").click(function () {
        resomono = 1.2;
        sendResolutionMono();
    });
    $("#12mpixmain").click(function () {
        resomain = 12;
        sendResolutionMain();
    });
    $("#16mpixmain").click(function () {
        resomain = 16;
        sendResolutionMain();
    });
    $("#8bit").click(function () {
        bitd = "8bits";
        sendBitDefinition();
    });
    $("#10bit").click(function () {
        bitd = "10bits";
        sendBitDefinition();
    });
    $("#overlap").change(function () {
        sendAutoParam($("#overlap").val());
    });
    $("#gps").change(function () {
        sendGPSParam($("#gps").val());
    });
    $("#timelapse").change(function () {
        sendTimelapseParam($("#timelapse").val());
    });
    $(document).on('keyup', '.numeric_only', function (event) {
        var v = this.value;
        if ($.isNumeric(v) === false) {
            //chop off the last char entered
            this.value = v.slice(0, -1);
        }
    });
    $("#green").click(function () {
        if (ledState == "on") {
            if ((rgb == "enabled" || g == "enabled" || r == "enabled" || nir == "enabled" || reg == "enabled") && ledState != "waiting") {
                ledState = "waiting";
                handleMsgState();
                startCapture();

                snapshotSound2.volume = 0;
                snapshotSound1.volume = 0;

                snapshotSound1.load();
                snapshotSound2.load();
            }
        } else if ((ledState == "capture" || ledState == "snapshot")) {
            ledState = "stopping";
            handleMsgState();
            stopCapture();
        }
    });
    $("#calibrationP").click(function () {
        if (ledState != "staystill") {
            $("#calibalert").fadeTo(500, 0.5);
            $("#calibalert").fadeTo(500, 1);
        }
    });
    $("#offP").click(function () {
        $("#calibalert").fadeTo(500, 0.5);
        $("#calibalert").fadeTo(500, 1);
    });
    $("#calibbtn").click(function () {
        launchCalibration();
    });
    $("#calibModal").on('hidden.bs.modal', function () {
        stopCalibration();
    });
    $("#radiometric-modal").on('hidden.bs.modal', function () {
        stopCapture();
        clearTimeout(racal);
        clearInterval(timerR);
    });
    $("#calculTimelapse").click(function () {
        calculTimelapse();
    });
    $("#calculGps").click(function () {
        calculGps();
    });

    function setMemoryInfo(ss) {
        var config = {
            storage_selected: ss
        }
        $.ajax({
            url: address_config,
            type: "POST",
            dataType: "json",
            contentType: "json",
            data: JSON.stringify(config),
            timeout: 5000,
            cache: false,
            success: function (result) {
                //console.log("<" + result + ">");
                if (result['storage_selected'] == 'Ok') {
                    if (ss == "internal") {
                        storageSelected = "internal";
                    } else if (ss == "sd") {
                        storageSelected = "sd";
                    }
                    handleMemoryInfo();
                }
                console.log("SS : " + storageSelected);
            },
            error: function (xhr, ajaxOptions, thrownError) {
                //console.log("req err : " + xhr.responseText);
                //console.log(thrownError);
            }
        });
    }


    function getMemoryInfo() {
        var internal;
        var sd;

        $.ajax({
            url: addressStorage,
            type: "GET",
            dataType: "json",
            timeout: 5000,
            cache: false,
            success: function (result) {
                console.info(result);
                clearTimeout(decoTimeout);
                internal = result['internal'];

                $("#int_used").html(((internal['total'] - internal['free']) / 1048576).toFixed(1));
                $("#int_avail").html((internal['free'] / 1048576).toFixed(1));

                pIM = 100 - ((internal['free'] / internal['total']) * 100);
                $("#jaugeIM").attr("aria-valuenow", pIM.toFixed(0));
                $("#jaugeIM").attr("style", 'width:' + pIM.toFixed(0) + "%;min-width:10%;");
                $("#jaugeIM").html(pIM.toFixed(0) + "%");

                if (pIM > 75) {
                    $("#jaugeIM").removeClass('progress-bar-success');
                    $("#jaugeIM").removeClass('progress-bar-danger');
                    $("#jaugeIM").addClass('progress-bar-warning');
                }
                if (pIM > 90) {
                    $("#jaugeIM").removeClass('progress-bar-warning');
                    $("#jaugeIM").removeClass('progress-bar-success');
                    $("#jaugeIM").addClass('progress-bar-danger');
                }

                if (result['sd']) {
                    sd = result['sd'];
                    $("#sd_used").html(((sd['total'] - sd['free']) / 1048576).toFixed(1));
                    $("#sd_avail").html((sd['free'] / 1048576).toFixed(1));
                    if (sd['read_only'] == "no" && sd['corrupted'] == "no") {
                        if ($("#language").attr('href') == "index.html") $("#sd").html("CARTE SD");
                        else $("#sd").html("SD CARD");
                        $('#imgsd').show();
                        $('#imgnosd').hide();
                        sdReadOnly = 0;
                        sdCorrupted = 0;
                    } else if (sd['read_only'] == "yes" && sd['corrupted'] == "no") {
                        if ($("#language").attr('href') == "index.html") $("#sd").html("CARTE SD - LECTURE SEULE");
                        else $("#sd").html("SD CARD - READ ONLY");
                        $('#imgsd').hide();
                        $('#imgnosd').show();
                        sdReadOnly = 1;
                        sdCorrupted = 0;
                    } else {
                        if ($("#language").attr('href') == "index.html") $("#sd").html("CARTE SD - CORROMPUE");
                        else $("#sd").html("SD CARD - CORRUPTED");
                        $('#imgsd').hide();
                        $('#imgnosd').show();
                        sdCorrupted = 1;
                    }

                    $("#sd_info").show();


                    pSM = 100 - ((sd['free'] / sd['total']) * 100);

                    $("#jaugeSM").attr("aria-valuenow", pSM.toFixed(0));
                    $("#jaugeSM").attr("style", 'width:' + pSM.toFixed(0) + "%;min-width:10%;");
                    $("#jaugeSM").html(pSM.toFixed(0) + "%");


                    if (pSM > 75) {
                        $("#jaugeSM").removeClass('progress-bar-success');
                        $("#jaugeSM").removeClass('progress-bar-danger');
                        $("#jaugeSM").addClass('progress-bar-warning');
                    }
                    if (pSM > 90) {
                        $("#jaugeSM").removeClass('progress-bar-warning');
                        $("#jaugeSM").removeClass('progress-bar-success');
                        $("#jaugeSM").addClass('progress-bar-danger');
                    }
                    sdAvailable = 1;
                    refreshSD();

                } else {
                    if ($("#language").attr('href') == "index.html") $("#sd").html("PAS DE CARTE SD");
                    else $("#sd").html("NO SD CARD");
                    $('#imgsd').hide();
                    $("#sd_info").hide();
                    $('#imgnosd').show();
                    $("#sm").removeAttr('title');
                    sdAvailable = 0;
                }


                if (result['storage_selected'] == "sd") {
                    storageSelected = "sd";
                } else if (result['storage_selected'] == "internal") {
                    storageSelected = "internal";
                }
                console.log("SS : " + storageSelected);
                handleMemoryInfo();
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

    function handleMemoryInfo() {
        if (storageSelected == "internal") {
            $(".mem").removeClass("active");
            $("#im").addClass("active");

        } else if (storageSelected == "sd") {
            $(".mem").removeClass("active");
            $("#sm").addClass("active");
            $("#sm").removeAttr('title');
        }
    }

    function calculTimelapse() {
        var timelapseResult;
        var dataVolume;
        var overlap;
        var height;
        var vFov = 50.1;
        var hFov = 63.9;
        var reso = 11.6;
        var speed;
        var gpsForData;

        speed = $("#speedT").val();
        overlap = ($("#overlapT").val()) / 100;
        height = $("#heightT").val();

        if (speed && overlap && height) {
            timelapseResult = ((1 - overlap) * 2 * height * Math.tan(((vFov / 2) * (Math.PI / 180)))) / speed;
            trackSpacing = ((1 - overlap) * 2 * height * Math.tan(((hFov / 2) * (Math.PI / 180))));
            dataVolume = ((100 / (timelapseResult * speed)) * (100 / trackSpacing)) * reso;
            $(".resultT").replaceWith('<span  id="tlcalculated" class="resultT">' + Math.round(timelapseResult * 10) / 10 + '</span>');
            $("#trackSpacingT").replaceWith('<span id="trackSpacingT">' + Math.round(trackSpacing * 10) / 10 + '</span>');
            $("#dataVolumeT").replaceWith('<span id="dataVolumeT">' + Math.round(dataVolume * 10) / 10 + '</span>');
            if (timelapseResult >= 1 && rgb == "enabled") {
                $("#resultTimelapseko").hide();
                $("#resultTimelapseok").show();
                $("#applyT").show();
            } else if (timelapseResult >= 0.5 && rgb == "disabled") {
                $("#resultTimelapseko").hide();
                $("#resultTimelapseok").show();
                $("#applyT").show();
            } else {
                if (rgb == "enabled") {
                    $("#mintl").text("1");
                } else if (rgb == "disabled") {
                    $("#mintl").text("0.5");
                }
                $("#resultTimelapseok").hide();
                $("#resultTimelapseko").show();
                $("#applyT").hide();
            }
        } else {
            $("#resultTimelapseok").hide();
            $("#resultTimelapseko").hide();
            $("#applyT").hide();
        }
    }


    function calculGps() {
        var gpsResult;
        var overlap;
        var height;
        var trackSpacing;
        var dataVolume;
        var reso = 11.6;
        var hFov = 63.9;
        var vFov = 50.1;

        overlap = ($("#overlapG").val()) / 100;
        height = $("#heightG").val();

        if (overlap && height) {
            trackSpacing = ((1 - overlap) * 2 * height * Math.tan(((hFov / 2) * (Math.PI / 180))));
            gpsResult = ((1 - overlap) * 2 * height * (Math.tan((vFov / 2) * (Math.PI / 180))));
            dataVolume = ((100 / gpsResult) * (100 / trackSpacing)) * reso;
            $(".resultG").replaceWith('<span id="gpscalculated" class="resultG">' + Math.round(gpsResult * 10) / 10 + '</span>');
            $("#trackSpacingG").replaceWith('<span id="trackSpacingG">' + Math.round(trackSpacing * 10) / 10 + '</span>');
            $("#dataVolumeG").replaceWith('<span id="dataVolumeG">' + Math.round(dataVolume * 10) / 10 + '</span>');
            if (gpsResult >= 5) {
                $("#resultGpsok").show();
                $("#resultGpsko").hide();
                $("#applyG").show();
            } else {
                $("#resultGpsok").hide();
                $("#resultGpsko").show();
                $("#applyG").hide();
            }
        } else {
            $("#resultGpsok").hide();
            $("#resultGpsko").hide();
            $("#applyG").hide();
        }
    }

    function handleLedState() {
        console.log("Led state = " + ledState);
        if (ledState == "on") {
            $(".btn-capture").hide();
            $("#onP").show();
        } else if (ledState == "capture") {
            if ($("#snapshotP").is(':visible')) {
                $("#captureP").show();
                $("#snapshotP").hide();
            } else {
                $(".btn-capture").hide();
                $("#captureP").show();
            }
            /*if (capturemode == "single") {
                setTimeout(function () {
                    ledState = "on";
                    $("form :input").attr('disabled', false);
                    if (capturemode == "timelapse") {
                        $("#gps").attr('disabled', true);
                    }
                    if (capturemode == "gps") {
                        $("#timelapse").attr('disabled', true);
                    }
                    if (capturemode == "single") {
                        $("#timelapse").attr('disabled', true);
                        $("#gps").attr('disabled', true);
                    }
                    handleLedState();
                    handleMsgState();
                }, 5000);
            }*/
        } else if (ledState == "staystill") {
            $(".btn-capture").hide();
            $("#calibrationP").show();
        } else if (ledState == "calibration") {
            $(".btn-capture").hide();
            $("#calibrationP").show();
            clearInterval(timerLed);
            timerLed = setInterval(function () {
                toggleLed()
            }, 1000);

        } else if (ledState == "snapshot") {
            //$(".btn-capture").hide();
            $("#snapshotP").show();
            $("#captureP").hide();
            //console.log("snapshoooot " + isImuHeating);
            setTimeout(function () {
                if (ledState == "snapshot") {
                    //if (capturemode != "single") {
                    ledState = "capture";
                    $("form :input").attr('disabled', true);
                    handleLedState();
                    handleMsgState();
                }
            }, parseInt(400));
        }
        if (ledState != "calibration") {
            clearInterval(timerLed);
        }
    }

    function handleMsgState(msg) {
        if (msg != null) {
            console.info(msg);
            if (msg == "Not available" && $("#language").attr('href') == "index.html") 
                msg = "Non disponible";
            $("#action-sequoia").html('<span style="color:firebrick">'+msg.toUpperCase()+'<span>');
            setTimeout(handleMsgState, 3000);
        } else {
            console.log("Msg state : " + ledState);
            if ($("#language").attr('href') == "index.html") {
                if (ledState == "stopping") {
                    $("#action-sequoia").html("ARRET DE LA CAPTURE");
                }
                if (ledState == "waiting") {
                    $("#action-sequoia").html("LANCEMENT DE LA CAPTURE");
                }
                if (ledState == "capture") {
                    if (capturemode == "single")
                        $("#action-sequoia").html("CAPTURE");
                    if (capturemode == "timelapse")
                        $("#action-sequoia").html("TIMELAPSE EN COURS");
                    if (capturemode == "gps_position")
                        $("#action-sequoia").html("GPSLAPSE EN COURS");
                    if (capturemode == "auto")
                        $("#action-sequoia").html("CAPTURE AUTO EN COURS");
                }
                if (ledState == "on") {
                    if((capturemode == "gps_position" || capturemode == "auto")
                        && (!gpsfixed)) {
                        $("#action-sequoia").html("PAS DE GPS");
                    }
                    else {
                        $("#action-sequoia").html("PRET");
                    }
                }
                if (ledState == "calibration") {
                    $("#action-sequoia").html("CALIBRATION EN COURS");
                }
                if (ledState == "staystill") {
                    $("#action-sequoia").html("RESTER IMMOBILE SVP");
                }
            } else {
                if (ledState == "stopping") {
                    $("#action-sequoia").html("STOPPING CAPTURE");
                }
                if (ledState == "waiting") {
                    $("#action-sequoia").html("LAUNCHING CAPTURE");
                }
                if (ledState == "capture") {
                    if (capturemode == "single")
                        $("#action-sequoia").html("SNAPSHOT");
                    if (capturemode == "timelapse")
                        $("#action-sequoia").html("TIMELAPSE RUNNING");
                    if (capturemode == "gps_position")
                        $("#action-sequoia").html("GPSLAPSE RUNNING");
                    if (capturemode == "auto")
                        $("#action-sequoia").html("AUTO CAPTURE RUNNING");
                }
                if (ledState == "on") {
                    if((capturemode == "gps_position" || capturemode == "auto")
                        && (!gpsfixed)) {
                        $("#action-sequoia").html("NO GPS");
                    }
                    else {
                        $("#action-sequoia").html("READY");
                    }
                }
                if (ledState == "calibration") {
                    $("#action-sequoia").html("CALIBRATION RUNNING");
                }
                if (ledState == "staystill") {
                    $("#action-sequoia").html("PLEASE STAY STILL");
                }
            }
        }
    }

    function toggleLed() {
        if ($('#calibrationP').is(":visible")) {
            $(".btn-capture").hide();
            $("#offP").show();
        } else {
            $(".btn-capture").hide();
            $("#calibrationP").show();
        }
    }

    function launchCalibration() {
        $("#btnstopcalibration").show();
        $("#btnclosecalibration").hide();
        $("#titleModalCalibrate").replaceWith('<span id="titleModalCalibrate">Please calibrate Sequoia</span>');
        justStarted = 2;
        handleCalibration();
        timerCalibration = setInterval(function () {
            refreshCalibration()
        }, 1000);
        $("#calibModal").modal('show');
        startCalibration();
    }


    function refreshCalibration() {
        getCalibrationStatus();
    }


    function startCalibration() {
        var body;
        var sunshine;

        if (calibrationState0 > 0 && calibrationState1 > 0) {
            $.ajax({
                url: address_calibration + "/start",
                dataType: "json",
                type: "GET",
                timeout: 5000,
                cache: false,
                success: function (result) {
                    console.info(result);
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //console.log("req err : " + xhr.responseText);
                    //console.log(thrownError);
                }
            });
        } else if (calibrationState0 > 0) {
            $.ajax({
                url: address_calibration + "/body/start",
                dataType: "json",
                type: "GET",
                timeout: 5000,
                cache: false,
                success: function (result) {
                    console.info(result);
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //console.log("req err : " + xhr.responseText);
                    //console.log(thrownError);
                }
            });
        } else if (calibrationState1 > 0) {
            $.ajax({
                url: address_calibration + "/sunshine/start",
                dataType: "json",
                type: "GET",
                timeout: 5000,
                cache: false,
                success: function (result) {
                    console.info(result);
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    //console.log("req err : " + xhr.responseText);
                    //console.log(thrownError);
                }
            });
        }
    }

    function stopCalibration() {
        $.ajax({
            url: address_calibration + "/stop",
            type: "GET",
            dataType: "json",
            timeout: 5000,
            cache: false,
            success: function (result) {
                clearInterval(timerCalibration);
                if (result['body'] == "Ok")
                    calibrationState0 = 0;
                if (result['sunshine'] == '0k')
                    calibrationState1 = 0;
                //console.log("Calibration >> " + calibrationState0 + " " + calibrationState1);
                handleCalibration();
            },
            error: function (xhr, ajaxOptions, thrownError) {
                //console.log("req err : " + xhr.responseText);
                //console.log(thrownError);
            }
        });
    }

    function stopCapture() {
        $.ajax({
            url: address_stop,
            type: "GET",
            dataType: "json",
            cache: false,
            error: function (xhr, ajaxOptions, thrownError) {
                //console.log("req err : " + xhr.responseText);
                //console.log(thrownError);
            },
            success: function (result) {
                console.info(result);
            },
            timeout: 5000,
        });
    }

    function startCapture() {
        $.ajax({
            url: address_start,
            type: "GET",
            dataType: "json",
            cache: false,
            error: function (xhr, ajaxOptions, thrownError) {
                //console.log("req err : " + xhr.responseText);
                //console.log(thrownError);
            },
            success: function (result) {
                console.info(result);
                if (result['status'] != "Timelapse running" && result['status'] != "Snapshot running") {
                    ledState = "on";
                    console.info("error capture");
                    handleMsgState(result['status']);
                } else {
                    
                }
            },
            timeout: 5000,
        });
    }

    function sendSensorState() {
        var sensorsmask = 0;
        if (rgb == "enabled") sensorsmask += 1;
        if (g == "enabled") sensorsmask += 2;
        if (r == "enabled") sensorsmask += 4;
        if (re == "enabled") sensorsmask += 8;
        if (nir == "enabled") sensorsmask += 16;
        var config = {
                sensors_mask: sensorsmask
            }
            //console.log("rgb : " + rgb + ", g : " + g + ", r : " + r + ", re : " + re + ", nir : " + nir);
        $.ajax({
            url: address_config,
            type: "POST",
            dataType: "json",
            contentType: "json",
            data: JSON.stringify(config),
            timeout: 5000,
            cache: false,
            success: function (result) {
                //console.log(result.responseText);
                console.warn($("#timelapse").val());

            },
            error: function (xhr, ajaxOptions, thrownError) {
                //console.log("req err : " + xhr.responseText);
                //console.log(thrownError);
            }
        });
    }



    function sendAutoSelect(autoS) {
        var config = {
            auto_select: autoS
        };
        $.ajax({
            url: address_config,
            type: "POST",
            dataType: "json",
            contentType: "json",
            data: JSON.stringify(config),
            timeout: 5000,
            cache: false,
            success: function (result) {
                console.log(result);
                if (result['auto_select'] == "Ok") {
                    autoselect = autoS;
                    handleAutoSelect();
                }
            },
            error: function (xhr, ajaxOptions, thrownError) {
                //console.log("req err : " + xhr.responseText);
                //console.log(thrownError);
            }
        });
    }



    function sendResolutionMono() {
        var config = {
            resolution_mono: parseFloat(resomono)
        };
        console.warn(resomono);
        $.ajax({
            url: address_config,
            type: "POST",
            dataType: "json",
            contentType: "json",
            data: JSON.stringify(config),
            timeout: 5000,
            cache: false,
            success: function (result) {
                console.info(result);
            },
            error: function (xhr, ajaxOptions, thrownError) {
                console.error(xhr.responseText);
            }
        });
    }

    function sendResolutionMain() {
        var config = {
            resolution_rgb: parseInt(resomain)
        };
        $.ajax({
            url: address_config,
            type: "POST",
            dataType: "json",
            contentType: "json",
            data: JSON.stringify(config),
            timeout: 5000,
            cache: false,
            success: function (result) {
                console.log(result);
            },
            error: function (xhr, ajaxOptions, thrownError) {
                console.error(xhr.responseText);
            }
        });
    }

    function getConfig() {
        $.ajax({
            url: address_config,
            type: "GET",
            dataType: "json",
            timeout: 5000,
            cache: false,
            success: function (result) {
                console.info(result);
                handleConfig(result);
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


    function sendBitDefinition() {
        var config = {
            bit_depth: bitd
        };
        $.ajax({
            url: address_config,
            type: "POST",
            dataType: "json",
            contentType: "json",
            data: JSON.stringify(config),
            timeout: 5000,
            cache: false,
            success: function (result) {
                console.info(result);
            },
            error: function (xhr, ajaxOptions, thrownError) {
                //console.log("req err : " + xhr.responseText);
                //console.log(thrownError);
            }
        });
    }

    function sendCaptureMode() {
        var config = {
            capture_mode: capturemode
        };
        $.ajax({
            url: address_config,
            type: "POST",
            dataType: "json",
            contentType: "json",
            data: JSON.stringify(config),
            timeout: 5000,
            cache: false,
            success: function (result) {
                console.info(result);
            },
            error: function (xhr, ajaxOptions, thrownError) {
                //console.log("req err : " + xhr.responseText);
                //console.log(thrownError);
            }
        });
    }

    function sendAutoParam(ap) {
        var config = {
            overlap_param: ap
        };
        $.ajax({
            url: address_config,
            type: "post",
            dataType: "json",
            contentType: "json",
            data: JSON.stringify(config),
            timeout: 5000,
            cache: false,
            success: function (result) {
                console.info(result);
                autoparam = ap;
                handleCaptureParam();
            },
            error: function (xhr, ajaxOptions, thrownError) {
                //console.log("req err : " + xhr.responseText);
                //console.log(thrownError);
            }
        });
    }

    function sendGPSParam(gp) {
        var config = {
            gps_param: gp
        };
        $.ajax({
            url: address_config,
            type: "post",
            dataType: "json",
            contentType: "json",
            data: JSON.stringify(config),
            timeout: 5000,
            cache: false,
            success: function (result) {
                console.info(result);
                gpsparam = gp;
                handleCaptureParam();
            },
            error: function (xhr, ajaxOptions, thrownError) {
                //console.log("req err : " + xhr.responseText);
                //console.log(thrownError);
            }
        });
    }

    function sendTimelapseParam(tl) {
        //console.log("will send timelapse param");
        var config = {
            timelapse_param: tl
        };
        $.ajax({
            url: address_config,
            type: "POST",
            dataType: "json",
            contentType: "json",
            data: JSON.stringify(config),
            timeout: 5000,
            cache: false,
            success: function (result) {
                console.log(result);
                timelapseparam = tl;
                handleCaptureParam();
            },
            error: function (xhr, ajaxOptions, thrownError) {
                //console.log("req err : " + xhr.responseText);
                //console.log(thrownError);
            }
        });
    }

    function getStatus() {
        //console.log("status");

        $.ajax({
            url: address_capture,
            type: "GET",
            dataType: "json",
            timeout: 5000,
            cache: false,
            success: function (result) {
                clearTimeout(decoTimeout);
                console.info(result);

                if (result['status'] == "Snapshot running") {
                    captureStatus = 1;
                } else {
                    captureStatus = 0;
                }
                if (result['status'] == "Please stay still") {
                    ledState = "staystill";
                    //console.log("stay still");
                    handleLedState();
                    handleMsgState();
                } else {
                    if (ledState == "staystill") {
                        ledState = "on";
                        handleLedState();
                        handleMsgState();
                    }
                    //console.log("no stay still");
                    handleLedState();
                    handleMsgState();
                }
                handleCapture();

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
                console.info(result);

                //console.log("Calibration >> " + calibrationState0 + " " + calibrationState1);
                handleCalibrationState(result['body'], result['sunshine']);
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

    function handleCalibrationState(body_state, sunshine_state) {
        console.info(body_state + " " + sunshine_state);
        if (body_state) {
            if (body_state == "Ok") {
                calibrationState0 = 0;
            } else if (body_state == "None") {
                $("#btnstopcalibration").show();
                $("#btnclosecalibration").hide();
                $("#calibinfo").show();
                calibrationState0 = 4;
            } else {
                if (body_state == "Psi pending") {
                    calibrationState0 = 3;
                } else if (body_state == "Theta pending") {
                    calibrationState0 = 2;
                } else if (body_state == "Phi pending") {
                    calibrationState0 = 1;
                }
            }
        }

        if (sunshine_state) {
            if (sunshine_state == "Ok") {
                calibrationState1 = 0;
            } else if (sunshine_state == "None") {
                $("#btnstopcalibration").show();
                $("#btnclosecalibration").hide();
                $("#calibinfo").show();
                calibrationState1 = 4;
            } else {
                if (sunshine_state == "Psi pending") {
                    calibrationState1 = 3;
                } else if (sunshine_state == "Theta pending") {
                    calibrationState1 = 2;
                } else if (sunshine_state == "Phi pending") {
                    calibrationState1 = 1;
                }
            }
        }

        if (calibrationState0 > 0  || calibrationState1 > 0 ) {
            $("#btnstopcalibration").show();
            $("#btnclosecalibration").hide();
            $("#calibinfo").show();
        } else {
            $("#calibinfo").hide();
        }
        console.info(calibrationState0 + " " + calibrationState1);
    }

    function handleCalibration() {
        console.info("2 : " + calibrationState0 + " " + calibrationState1);
        if ((calibrationState0 == 4 || calibrationState0 == 0) && (calibrationState1 == 4 || calibrationState1 == 0)) {
            if (ledState != "staystill") {
                ledState = "on";
                handleLedState();
                handleMsgState();
            }
        }
        if (calibrationState0 == 3 || calibrationState1 == 3) {
            $(".yaw").fadeTo(1, 1);
            $(".pitch").fadeTo(1, 0.5);
            $(".roll").fadeTo(1, 0.5);
            //console.log("PSI" + calibrationState0 + calibrationState1);
            if (ledState != "calibration" && ledState != "staystill") {
                ledState = "calibration";
                handleLedState();
                handleMsgState();
            }
        }
        if (calibrationState0 < 3 && calibrationState1 < 3 && (calibrationState0 == 2 || calibrationState1 == 2)) {
            $(".yaw").fadeTo(1, 0.5);
            $(".pitch").fadeTo(1, 1);
            $(".roll").fadeTo(1, 0.5);
            if (ledState != "calibration" && ledState != "staystill") {
                ledState = "calibration";
                handleLedState();
                handleMsgState();
            }
            //console.log("THETA" + calibrationState0 + calibrationState1);
        }
        if (calibrationState0 < 2 && calibrationState1 < 2 && (calibrationState0 == 1 || calibrationState1 == 1)) {
            $(".yaw").fadeTo(1, 0.5);
            $(".pitch").fadeTo(1, 0.5);
            $(".roll").fadeTo(1, 1);
            if (ledState != "calibration" && ledState != "staystill") {
                ledState = "calibration";
                handleLedState();
                handleMsgState();
            }
            //console.log("PHI" + calibrationState0 + calibrationState1);
        }
        if (calibrationState0 == 0 && calibrationState1 == 0) {
            $("#titleModalCalibrate").replaceWith('<span id="titleModalCalibrate">CALIBRATION DONE !</span>');
            $(".yaw").fadeTo(1, 0.5);
            $(".pitch").fadeTo(1, 0.5);
            $(".roll").fadeTo(1, 0.5);
            $("#btnstopcalibration").hide();
            $("#btnclosecalibration").show();
            //console.log("DONE" + calibrationState0 + calibrationState1);
            if (ledState != "capture" && ledState != "snapshot" && ledState != "staystill") {
                ledState = "on";
            }
            handleLedState();
            handleMsgState();
        }
    }

    function handleSensors(sensors) {
        if ((sensors & 1) != 0)
            rgb = "enabled";
        else
            rgb = "disabled";
        if ((sensors & 2) != 0)
            g = "enabled";
        else
            g = "disabled";
        if ((sensors & 4) != 0)
            r = "enabled";
        else
            r = "disabled";
        if ((sensors & 8) != 0)
            re = "enabled";
        else
            re = "disabled";
        if ((sensors & 16) != 0)
            nir = "enabled";
        else
            nir = "disabled";
    }

    function handleConfig(result) {
        resomono = result['resolution_mono'];
        resomain = result['resolution_rgb'];
        capturemode = result['capture_mode'];
        timelapseparam = result['timelapse_param'];
        gpsparam = result['gps_param'];
        autoparam = result['overlap_param'];
        bitd = result['bit_depth'];
        autoselect = result['auto_select'];
        handleSensors(result['sensors_mask']);
        console.info(result['sensors_mask']);
        console.info(result['sensors_mask'] & 1);
        console.info(result['sensors_mask'] & 2);
        console.info(result['sensors_mask'] & 4);
        console.info(result['sensors_mask'] & 8);
        console.info(result['sensors_mask'] & 16);

        handleCaptureMode();
        handleCaptureParam();
        handleResolutionMain();
        handleResolutionMono();
        handleBitDefinition();
        handleSensorsState();
        handleAutoSelect();
    }

    function handleAutoSelect() {
        if (autoselect == "on") {
            if (!$("#autoselect").hasClass("toggle-button-selected"))
                $("#autoselect").addClass("toggle-button-selected");
        } else if (autoselect == "off") {
            if ($("#autoselect").hasClass("toggle-button-selected"))
                $("#autoselect").removeClass("toggle-button-selected");
        }
    }

    function handleCapture() {
        if (captureStatus == 1) {
            ledState = "capture";
            $('form :input').attr('disabled', true);
            //console.log("capture running");
            handleLedState();
            handleMsgState();
        }
        if (captureStatus != 1 && ledState != "staystill") {
            ledState = "on";
            $("form :input").attr('disabled', false);
            if (capturemode == "timelapse") {
                $("#gps").attr('disabled', true);
            }
            if (capturemode == "gps") {
                $("#timelapse").attr('disabled', true);
            }
            if (capturemode == "single") {
                $("#timelapse").attr('disabled', true);
                $("#gps").attr('disabled', true);
            }
            //console.log("no capture");
            handleLedState();
            handleMsgState();
        }
    }

    function handleCaptureMode() {
        /*if (capturemode == "single") {
            $(".cm").removeClass('active');
            $("#single0").addClass('active');
        }
        else if (capturemode == "timelapse") {
            $(".cm").removeClass('active');
            $("#time0").addClass('active');
        }
        else if (capturemode == "gps_position") {
            $(".cm").removeClass('active');
            $("#gps0").addClass('active');
        }
        else if (capturemode == "auto") {
            $(".cm").removeClass('active');
            $("#auto0").addClass('active');
        }*/
        console.info(capturemode);
        if (capturemode == "single") {
            $("#single0").hide();
            $("#single1").show();
            $("#time1").hide();
            $("#time0").show();
            $("#gps1").hide();
            $("#gps0").show();
            $("#auto0").show();
            $("#auto1").hide();
            $("#number").hide();
            $("#precisetl").hide();
            $("#precisegps").hide();
            $("#gps").prop('disabled', true);
            $("#timelapse").prop('disabled', true);
            $("#overlap").prop('disabled', true);
        }
        if (capturemode == "timelapse") {
            $("#time0").hide();
            $("#time1").show();
            $("#single1").hide();
            $("#single0").show();
            $("#gps1").hide();
            $("#gps0").show();
            $("#auto0").show();
            $("#auto1").hide();
            $("#number").hide();
            $("#precisegps").hide();
            $("#gps").prop('disabled', true);
            $("#timelapse").prop('disabled', false);
            $("#overlap").prop('disabled', true);
        }
        if (capturemode == "gps_position") {
            $("#gps0").hide();
            $("#gps1").show();
            $("#single1").hide();
            $("#single0").show();
            $("#time1").hide();
            $("#time0").show();
            $("#auto0").show();
            $("#auto1").hide();
            $("#number").hide();
            $("#precisetl").hide();
            $("#timelapse").prop('disabled', true);
            $("#gps").prop('disabled', false);
            $("#overlap").prop('disabled', true);
        }
        if (capturemode == "auto") {
            $("#gps0").show();
            $("#gps1").hide();
            $("#single1").hide();
            $("#single0").show();
            $("#time1").hide();
            $("#time0").show();
            $("#auto0").hide();
            $("#auto1").show();
            $("#number").hide();
            $("#precisetl").hide();
            $("#timelapse").prop('disabled', true);
            $("#gps").prop('disabled', true);
            $("#overlap").prop('disabled', false);
        }
    }

    function handleCaptureParam() {
        if (timelapseparam != "Notlparam") {
            $("#timelapse").val(timelapseparam);
        }
        if (gpsparam != "Nogpsparam") {
            $("#gps").val(gpsparam);
        }
        if (autoparam != "Noautoparam") {
            $("#overlap").val(autoparam);
        }
    }

    function handleResolutionMono() {
        $('input:radio[name=resolutionmono]').filter('[value=' + parseInt(resomono * 10) + 'mpix]').prop('checked', true);
    }

    function handleResolutionMain() {
        $('input:radio[name=resolutionmain]').filter('[value=' + parseInt(resomain) + 'mpix]').prop('checked', true);
    }

    function handleBitDefinition() {
        console.info("BITD " + bitd);
        $('input:radio[name=bitdepth]').filter('[value=' + parseInt(bitd) + 'bit]').prop('checked', true);
    }

    function handleSensorsState() {
        if (rgb == "enabled") {
            $("#rgb0").hide();
            $("#rgb1").show();
        } else {
            $("#rgb0").show();
            $("#rgb1").hide();
        }

        if (g == "enabled") {
            $("#g0").hide();
            $("#g1").show();
        } else {
            $("#g0").show();
            $("#g1").hide();
        }

        if (r == "enabled") {
            $("#r0").hide();
            $("#r1").show();
        } else {
            $("#r0").show();
            $("#r1").hide();
        }

        if (re == "enabled") {
            $("#re0").hide();
            $("#re1").show();
        } else {
            $("#re0").show();
            $("#re1").hide();
        }

        if (nir == "enabled") {
            $("#nir0").hide();
            $("#nir1").show();
        } else {
            $("#nir0").show();
            $("#nir1").hide();
        }
    }

    function getGPS() {
        $.ajax({
            url: address_gpsfix,
            type: "GET",
            dataType: "json",
            timeout: 5000,
            cache: false,
            success: function (result) {
                if (result['fix'] == "yes") {
                    gpsfixed = 1;
                }
                else if (result['fix'] == "no") {
                    gpsfixed = 0;
                }
            }
        });
    }

    function refresh() {
        getStatus();
        getConfig();
        getGPS();
        setTimeout(getCalibrationStatus, 100);
        setTimeout(getMemoryInfo, 200);
    }
});
