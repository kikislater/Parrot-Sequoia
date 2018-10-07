$(function () {
    var base_address_url = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port;
    var address = base_address_url + "/status";
    var addressCheckChange = base_address_url + "/checkChange/";
    var activatedSection = "gps";
    var timer = setInterval(function () {
        refresh(address)
    }, 4000);
    var disconnected = 0;

    var deco;
    var decoTimeout;
    var gpsFixed = 0;
    var language;
    var socket;
    var isOS = /iPad|iPhone|iPod/.test(navigator.platform);



    var idClient = 0;

    $().ready(function () {
        language = "FR";
        if (!isOS)
            $('[data-toggle="tooltip"]').tooltip();
        $(document).on('click', "#dlbugreport", function (e) {
            console.info("click on download");
            downloadMacgyver($(this).attr('name'));
        })

        init_compass('body_compass');
        init_compass('sunshine_compass');
        init_compass('body_pitch_a');
        init_compass('sunshine_pitch_a');
        init_compass('body_roll_a');
        init_compass('sunshine_roll_a');
        init_sunshine('sunshine_green');
        init_sunshine('sunshine_red');
        init_sunshine('sunshine_rededge');
        init_sunshine('sunshine_nearinfrared');
        init_sunshine('sunshine_green_1');
        init_sunshine('sunshine_red_1');
        init_sunshine('sunshine_rededge_1');
        init_sunshine('sunshine_nearinfrared_1');
        init_sunshine('p7_a');
        init_sunshine('p7mu_a');
        init_sunshine('ddr3_a');
        init_sunshine('wifi_a');
        init_sunshine('imu_body_a');
        init_sunshine('imu_sunshine_a');
        refresh(address);
    });

    setTimeout(function () {
        socket = new WebSocket("ws://" + window.location.hostname + ":" + "80" + "/websocket");
        socket.onopen = function () {
            console.info("Socket opened");
        };

        socket.onclose = function () {
            console.info("Socket closed");
        };

        socket.onmessage = function (msg) {
            //console.info(msg);

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

    function displayDisconnected() {
        decoTimeout = setTimeout(deco, 2000);
    }


    function deco() {
        disconnected = 1;
        $('body').removeClass("modal-open");
        $('body').css('height', '100%');
        $('body').html('<div id="disp" style="text-align: center;vertical-align:center"></div>');
        $("#disp").append('<h1>Sequoia Disconnected</h1><p>Please check your connection</p>');
    }

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
        }

        if (result['storage_status']) {
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

    function refresh(address) {
        console.info("Getting all sensors");
        getAll(address);
    }


    function getAll(address) {
        $.ajax({
            url: address,
            type: "GET",
            dataType: "json",
            timeout: 5000,
            success: function (result) {
                console.info(result);
                clearTimeout(decoTimeout);
                if (disconnected == 1) {
                    window.location.reload(false);
                    disconnected = 0;
                }
                handleGPS(result['gps']);
                handleInstruments(result['instruments']);
                handleSunshine(result['sunshine']);
                handleTemperature(result['temperature']);

            },
            error: function (xhr, ajaxOptions, thrownError) {
                //console.log("Error >> "+thrownError);
                if (thrownError == "Service Unavailable" || xhr.status == 0) {
                    displayDisconnected();
                    disconnected = 1;
                }
            }
        });
    }

    function handleGPS(gps) {
        console.log("GPS " + gps['status']);
        if (gps['status'] == "Ok" && gps['fix'] != 0) {
            $("#nb_sat").html(gps['satellite_number']);
            $("#prec").html(gps['precision'].toFixed(1) + "m");
            $("#speed").html(gps['speed'].toFixed(1) + "m/s");
            if(gps['degres_lat']<0)
                ref="S";
            else
                ref="N";
            $("#lat").html(Math.abs(gps['degres_lat']) + "° " + Math.abs(gps['minutes_lat']) + "' " + Math.abs(gps['seconds_lat']).toFixed(3) + "\" "+ref);
            if(gps['degres_lon']<0)
                ref="W";
            else
                ref="E";
            $("#long").html(Math.abs(gps['degres_lon']) + "° " + Math.abs(gps['minutes_lon']) + "' " + Math.abs(gps['seconds_lon']).toFixed(3) + "\" "+ref);
            $("#alt").html(gps['altitude'] + "m");
            $("#nogps").hide();
            $("#signalgps").show();
        } else {
            $("#nogps").show();
            $("#signalgps").hide();
        }
    }

    function handleInstruments(instruments) {
        console.log("INSTRUMENTS " + instruments['status']);
        if (instruments['status'] == "Ok") {
            $("#body_yaw").html(instruments['body_yaw'].toFixed(1) + "°");
            draw_compass(instruments['body_yaw'].toFixed(0), "body_compass");
            $("#body_pitch").html(instruments['body_pitch'].toFixed(1) + "°");
            if (instruments['body_roll'].toFixed(0) < 90 && instruments['body_roll'].toFixed(0) > -90)
                draw_compass(parseInt(instruments['body_pitch'].toFixed(0)), "body_pitch_a");
            else if (instruments['body_pitch'].toFixed(0) < 0)
                draw_compass(parseInt(instruments['body_pitch'].toFixed(0)) + 180, "body_pitch_a");
            else
                draw_compass(parseInt(instruments['body_pitch'].toFixed(0)) - 180, "body_pitch_a");
            $("#body_roll").html(instruments['body_roll'].toFixed(1) + "°");
            draw_compass(instruments['body_roll'].toFixed(0), "body_roll_a");
            if (instruments['sunshine_yaw'] != "none") {
                $("#sunshine_yaw").html(instruments['sunshine_yaw'].toFixed(1) + "°");
                draw_compass(instruments['sunshine_yaw'].toFixed(0), "sunshine_compass");
                $("#sunshine_pitch").html(instruments['sunshine_pitch'].toFixed(1) + "°");
                if (instruments['sunshine_roll'].toFixed(0) < 90 && instruments['sunshine_roll'].toFixed(0) > -90)
                    draw_compass(parseInt(instruments['sunshine_pitch'].toFixed(0)), "sunshine_pitch_a");
                else if (instruments['sunshine_pitch'].toFixed(0) < 0)
                    draw_compass(parseInt(instruments['sunshine_pitch'].toFixed(0)) + 180, "sunshine_pitch_a");
                else
                    draw_compass(parseInt(instruments['sunshine_pitch'].toFixed(0)) - 180, "sunshine_pitch_a");
                $("#sunshine_roll").html(instruments['sunshine_roll'].toFixed(1) + "°");
                draw_compass(instruments['sunshine_roll'].toFixed(0), "sunshine_roll_a");
				$("#sunshine_instruments").show();
            } else
				$("#sunshine_instruments").hide();
        } else {
			$("#sunshine_instruments").hide();
        }
    }

    function handleSunshine(sunshine) {
        console.log("SUNSHINE " + sunshine['status']);
        if (sunshine['status'] == 'Ok') {
            $("#sunshine_panel").show();
            $("#green").html(sunshine['green_0']);
            draw_sunshine(sunshine['green_0'], "sunshine_green");
            $("#red").html(sunshine['red_0']);
            draw_sunshine(sunshine['red_0'], "sunshine_red");
            $("#rededge").html(sunshine['red_edge_0']);
            draw_sunshine(sunshine['red_edge_0'], "sunshine_rededge");
            $("#nearir").html(sunshine['near_infrared_0']);
            draw_sunshine(sunshine['near_infrared_0'], "sunshine_nearinfrared");

            $("#green_1").html(sunshine['green_1']);
            draw_sunshine(sunshine['green_1'], "sunshine_green_1");
            $("#red_1").html(sunshine['red_1']);
            draw_sunshine(sunshine['red_1'], "sunshine_red_1");
            $("#rededge_1").html(sunshine['red_edge_1']);
            draw_sunshine(sunshine['red_edge_1'], "sunshine_rededge_1");
            $("#nearir_1").html(sunshine['near_infrared_1']);
            draw_sunshine(sunshine['near_infrared_1'], "sunshine_nearinfrared_1");
        } else {
            $("#sunshine_panel").hide();
        }
    }

    function handleTemperature(temperature) {
        console.log("TEMPERATURE " + temperature['status']);
        if (temperature['status'] == 'Ok') {
            $("#p7").html(temperature['body_p7'] + "°c");
            draw_sunshine(parseInt(temperature['body_p7']), "p7_a");
            $("#p7mu").html(temperature['body_p7mu'] + "°c");
            draw_sunshine(parseInt(temperature['body_p7mu']), "p7mu_a");
            $("#ddr3").html(temperature['body_ddr3'] + "°c");
            draw_sunshine(parseInt(temperature['body_ddr3']), "ddr3_a");
            $("#wifi").html(temperature['body_wifi'] + "°c");
            draw_sunshine(parseInt(temperature['body_wifi']), "wifi_a");
            $("#bodyimu").html(temperature['body_imu'].toFixed(0) + "°c");
            draw_sunshine(parseInt(temperature['body_imu']), "imu_body_a");
            $("#sunshineimu").html(temperature['sunshine_imu'].toFixed(0) + "°c");
            draw_sunshine(parseInt(temperature['sunshine_imu']), "imu_sunshine_a");
            if (temperature['sunshine_imu'] != "none" && temperature['sunshine_imu'].toFixed(0) != -999)
				$(".sunshine_temp").show();
            else
				$(".sunshine_temp").hide();
        } else {

        }
    }



});
