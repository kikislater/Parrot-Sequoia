$(function () {
    var base_address_url = window.location.protocol + "//" + window.location.hostname;
    var addressGallery = base_address_url + "/gallery/";
    var addressCheckChange = base_address_url + "/checkChange/";
    var addressConnection = base_address_url + "/connection";
    var addressStorage = base_address_url + "/storage";
    var address_file = base_address_url + "/file";
    var address_capture = base_address_url + "/capture";
    var address_delete = base_address_url + "/delete";
    var address_download = base_address_url + "/download";
    var source = "internal";
    var folder = "0000";
    var sdShown = 0;
    var refreshFolders = 1;
    var listThumbs;
    var picByPage = 100;
    var currentPage = 1;
    var currentFolder = "empty";
    var disconnected = 0;
    var language;
    var nbPicInFolder = new Object();
    var refrPic = null;
    var deco;
    var decoTimeout;
    var picList;
    var picLoading = false;
    var capture_running = "ready";
    var sdReadOnly = 0;
    var sdCorrupted = 0;
    var picIdList;
    var socket;
    var picChangeTimer;
    var isOS = /iPad|iPhone|iPod/.test(navigator.platform);
    var f2d = null;

    setInterval(checkConnection, 4000);

    getStatus();
    getMemoryInfo();

    setTimeout(function () {
        socket = new WebSocket("ws://" + window.location.hostname + ":" + "80" + "/websocket");
        socket.onopen = function () {
            console.info("Socket opened");
        };

        socket.onclose = function () {
            console.info("Socket closed");
        };

        socket.onmessage = function (msg) {
            //console.info(msg); //Awesome!
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
                displayDisconnected()
                disconnected = 1;
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
                //console.log("Status : " + result['status']);

                if (result['status'] == "Snapshot running") {
                    capture_running = "running";
                } else {
                    capture_running = "ready";
                }

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

    $().ready(function () {
        language = "EN";
        if (!isOS)
            $('[data-toggle="tooltip"]').tooltip();
        //$('#loading').css('max-height', $(window).height() * 0.7);
        //console.log("windows height "+$( window ).height()*0.7);
        $(document).on('click', '.photo', function () {
            showPhoto($(this).attr('id'), $(this).parent().parent().parent().attr('id'));
        });
        $(document).on('click', '.fclick', function () {
            folder = $(this).attr('name');
            currentPage = 1;
            currentFolder = $(this).attr('name');
            $("#firstFolder").html(currentFolder);
            //$("#nbPic").html('<img class="img-responsive" src="../img/gallery/loading_spinner.gif" height=31px width=31px />');
            $("#nbPic").html('loading');
            getPicturesList("/" + source + "/" + $(this).attr('name'), false);
            //console.log($(this).attr('name') );
        });
        $(document).on('click', '#intmem', function () {
            source = "internal";
            refreshFolders = 1;
            $(".mem").removeClass('active');
            $("#im").addClass('active');
            $("#sm-mini").addClass('showi');
            $("#im-mini").removeClass('showi');
            getMemoryInfo();
        });
        $(document).on('click', '#sdmem', function () {

            if (sdShown) {
                source = "sd";
                refreshFolders = 1;
                $(".mem").removeClass('active');
                $("#sm").addClass('active');
                $("#sm-mini").removeClass('showi');
                $("#im-mini").addClass('showi');
                getMemoryInfo();
            }
        });

        $(document).on('click', '#im-mini', function () {
            source = "internal";
            refreshFolders = 1;
            $(".mem").removeClass('active');
            $("#im").addClass('active');
            $("#sm-mini").addClass('showi');
            $("#im-mini").removeClass('showi');
            getMemoryInfo();
        });
        $(document).on('click', '#sm-mini', function () {

            if (sdShown) {
                source = "sd";
                refreshFolders = 1;
                $(".mem").removeClass('active');
                $("#sm").addClass('active');
                $("#sm-mini").removeClass('showi');
                $("#im-mini").addClass('showi');
                getMemoryInfo();
            }
        });

        $(document).on('click', '#deleteallbtn', function () {
            $("#confirmDeleteAll").attr('source', source);
            if (source == "internal") {
                $("#textDeleteAllModal").text("Are you sur you want to delete all from internal storage?");
            } else {
                $("#textDeleteAllModal").text("Are you sur you want to delete all from SD card?");
            }
            $("#DeleteAllModal").modal('show');
        });

        $(document).on('click', '.xdelete', function () {
            //console.log("delete");
            if ($(".xdelete").attr('folder')  != "empty") {
                if ($(this).attr('element') == "folder") {
                    $("#textDeleteModal").text("Are you sure you want to delete this folder?");
                } else {
                    $("#textDeleteModal").text("Are you sure you want to delete this file?");
                }
                $("#confirmDelete").attr('folder', $(this).attr("folder"));
                $("#confirmDelete").attr('element', $(this).attr("element"));
                $("#confirmDelete").attr('source', $(this).attr("source"));
                $("#confirmDelete").attr('idPic', $(this).attr("id"));
                $("#modalDelete").modal('show');
            }
        });
        $(document).on('click', '.xdownload', function () {
            if ($(".xdownload").attr('folder')  != "empty") {
                if ($(this).attr('element') == "folder") {
                    window.location = address_download + "/" + $(this).attr("source") + "/" + $(this).attr("folder");
                    console.log("downloaaadd > " + address_download + "/" + $(this).attr("source") + "/" + $(this).attr("folder"));
                }
                console.log("done");
            }
        });
        $(document).on('click', '#confirmDelete', function () {
            deleteElement($(this).attr("folder"), $(this).attr("element"), $(this).attr("source"), $(this).attr("idPic"));
        });
        $(document).on('click', '#confirmDeleteAll', function () {
            deleteAll($(this).attr("source"));
        });
        $(document).on('click', '#all', function () {
            handleFilter("all");
        });
        $(document).on('click', '#rgb', function () {
            handleFilter("rgb");
        });
        $(document).on('click', '#gre', function () {
            handleFilter("gre");
        });
        $(document).on('click', '#red', function () {
            handleFilter("red");
        });
        $(document).on('click', '#reg', function () {
            handleFilter("reg");
        });
        $(document).on('click', '#nir', function () {
            handleFilter("nir");
        });
        $(document).on('click', '.page', function () {
            currentPage = this.id;
            handlePages((this.id));
        });
        $(document).on('click', '#delPic', function () {
            deleteElement($(this).attr("folder"), $(this).attr("element"), $(this).attr("source"), "mod" + $(this).attr("idPic"));
        });
        $('#dlpic').click(function (e) {
            downloadFile($("#photoZoom").attr('dl'));
        });
        $(document).on('click', "#dlbugreport", function (e) {
            console.info("click on download");
            downloadMacgyver($(this).attr('name'));
        })
        $(document).on('click', '#previous', function () {
            var id = parseInt($("#photoZoom").attr('picid'));
            id--;
            while (id > 0 && (!$("#all").hasClass('active') && !$('#' + ($("#" + id).attr('type'))).hasClass('active'))) {
                id--;
            }
            if (id > 0)
                showPhoto("/img/" + source + "/" + currentFolder + "/" + picIdList[id], id);
        });
        $(document).on('click', '#next', function () {
            var id = parseInt($("#photoZoom").attr('picid'));
            id++;
            while (id < picIdList.length && (!$("#all").hasClass('active') && !$('#' + ($("#" + id).attr('type'))).hasClass('active'))) {
                id++;
            }
            if (id < picIdList.length)
                showPhoto("/img/" + source + "/" + currentFolder + "/" + picIdList[id], id);
        });
    });


    function deleteElement(folder, element, source, id) {
        var address;
        if (element == "folder")
            address = address_delete + "/" + source + "/" + folder;
        else
            address = address_delete + "/" + source + "/" + folder + "/" + element;
        $.ajax({
            url: address,
            type: "GET",
            dataType: "json",
            timeout: 10000,
            cache: false,
            success: function (result) {
                console.info(result);
                if (element == "folder") {
                    if (result["/" + source + "/" + folder] == "deleted") {
                        if ($("#" + folder).parent().prev().is('li')) {
                            currentFolder = $("#" + folder).parent().prev().children('a').attr('id');
                            getPicturesList("/" + source + "/" + $("#" + folder).parent().prev().children('a').attr('id'), false);
                        } else if ($("#" + folder).parent().next().is('li')) {
                            currentFolder = $("#" + folder).parent().next().children('a').attr('id');
                            getPicturesList("/" + source + "/" + $("#" + folder).parent().next().children('a').attr('id'), false);
                        } else {
                            $("#dispPic").replaceWith('\
                                <div class="row" id="dispPic" style="margin-right:2px!important;margin-left:2px!important">\
                                </div>\
                            ');
                            $("#fisrtFolder").html('empty');
                        }
                        $('#' + folder).parent().replaceWith('');
                    }
                } else {
                    if (result["/" + source + "/" + folder + "/" + element] == "deleted")
                        $("#" + id.substr(3)).replaceWith('');
                }
                getMemoryInfo();
            }
        });
    }

    function deleteAll(source) {
        var address;
        address = address_delete + "/" + source;
        $.ajax({
            url: address,
            type: "GET",
            dataType: "json",
            timeout: 100000,
            cache: false,
            success: function (result) {
                console.info(result);
                if (result["/" + source] == "deleted") {
                    $("#dispPic").replaceWith('\
                        <div class="row" id="dispPic" style="margin-right:2px!important;margin-left:2px!important">\
                        </div>\
                    ');
                }
               refreshFolders = 1;
                getMemoryInfo();
            }
        });
    }

    function downloadFile(url) {
        window.location = address_download + url;

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
        $("#disp").append('<h1>Sequoia Disconnected</h1><p>Please check your connection</p>');

    }

    var cpt = 0;

    function handleChange(result) {
        var element;

        if (result['bug_report']) {
            $("#bugfilename").html(element['status'] + ".zip");
            $("#dlbugreport").attr('name', element['status']);
            $("#bugmodal").modal('show');
        }

        if (result['capture']) {
            capture_running = result['capture'];
        }

        if (result['storage_status']) {
            refreshSD();
            if (result['sd'] == "disconnected" && source == "sd")
                refreshFolders = 1;
            getMemoryInfo();
        }

        if (result['snapshot']) {
            if (cpt == 10) {
                getMemoryInfo();
                cpt = 0;
            } else
                cpt++;
        }
    }






    function isUpToDate(idClient, idEvent) {
        if (idClient < idEvent) {
            return false;
        } else {
            return true;
        }
    }


    function handleFilter(filter) {

        $(".filter").removeClass('active');
        $('#' + filter).addClass('active');

        if (filter == "all") {
            $(".rgb").each(function () {
                if ($("#" + this.id).hasClass("onPage")) {
                    $("#" + this.id).show();
                }
            });
            $(".red").each(function () {
                if ($("#" + this.id).hasClass("onPage")) {
                    $("#" + this.id).show();
                }
            });
            $(".gre").each(function () {
                if ($("#" + this.id).hasClass("onPage")) {
                    $("#" + this.id).show();
                }
            });
            $(".reg").each(function () {
                if ($("#" + this.id).hasClass("onPage")) {
                    $("#" + this.id).show();
                }
            });
            $(".nir").each(function () {
                if ($("#" + this.id).hasClass("onPage")) {
                    $("#" + this.id).show();
                }
            });
        } else {
            $(".pic").hide();
            $("." + filter).each(function () {
                if ($("#" + this.id).hasClass("onPage")) {
                    $("#" + this.id).show();
                }
            })
        }
    }

    function setPicturesWithFilters() {
        if ($('#all').hasClass('active')) {
            $(".pic").each(function () {
                if ($("#" + this.id).hasClass("onPage")) {
                    $("#" + this.id).show();
                }
            })
        }
        if ($('#rgb').hasClass('active')) {
            $(".rgb").each(function () {
                if ($("#" + this.id).hasClass("onPage")) {
                    $("#" + this.id).show();
                }
            })
        } else {
            $(".rgb").hide();
        }
        if ($('#red').hasClass('active')) {
            $(".red").each(function () {
                if ($("#" + this.id).hasClass("onPage")) {
                    $("#" + this.id).show();
                }
            })
        } else {
            $(".red").hide();
        }
        if ($('#gre').hasClass('active')) {
            $(".gre").each(function () {
                if ($("#" + this.id).hasClass("onPage")) {
                    $("#" + this.id).show();
                }
            })
        } else {
            $(".gre").hide();
        }
        if ($('#nir').hasClass('active')) {
            $(".nir").each(function () {
                if ($("#" + this.id).hasClass("onPage")) {
                    $("#" + this.id).show();
                }
            })
        } else {
            $(".nir").hide();
        }
        if ($('#reg').hasClass('active')) {
            $(".reg").each(function () {
                if ($("#" + this.id).hasClass("onPage")) {
                    $("#" + this.id).show();
                }
            })
        } else {
            $(".reg").hide();
        }
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

                if (pIM <= 75) {
                    $("#jaugeIM").removeClass('progress-bar-danger');
                    $("#jaugeIM").removeClass('progress-bar-warning');
                    $("#jaugeIM").addClass('progress-bar-success');
                }
                if (pIM > 75 && pIM <= 90) {
                    $("#jaugeIM").removeClass('progress-bar-success');
                    $("#jaugeIM").removeClass('progress-bar-danger');
                    $("#jaugeIM").addClass('progress-bar-warning');
                }
                if (pIM > 90) {
                    $("#jaugeIM").removeClass('progress-bar-warning');
                    $("#jaugeIM").removeClass('progress-bar-success');
                    $("#jaugeIM").addClass('progress-bar-danger');
                }

                if (result['sd'] && (result['sd'])['total'] > 0) {
                    sd = result['sd'];
                    $("#sd_used").html(((sd['total'] - sd['free']) / 1048576).toFixed(1));
                    $("#sd_avail").html((sd['free'] / 1048576).toFixed(1));
                    if (sd['read_only'] == "no" && sd['corrupted'] == "no") {
                        $("#sd").html("SD CARD");
                        $('.imgsd').show();
                        $('.imgnosd').hide();
                        sdReadOnly = 0;
                        sdCorrupted = 0;
                    } else if (sd['read_only'] == "yes" && sd['corrupted'] == "no") {
                        if ($("#language").attr('href') == "index.html") $("#sd").html("CARTE SD - LECTURE SEULE");
                        else $("#sd").html("SD CARD - READ ONLY");
                        $('.imgsd').show();
                        $('.imgnosd').hide();
                        sdReadOnly = 1;
                        sdCorrupted = 0;
                    } else {
                        if ($("#language").attr('href') == "index.html") $("#sd").html("CARTE SD - CORROMPUE");
                        else $("#sd").html("SD CARD - CORRUPTED");
                        $('.imgsd').hide();
                        $('.imgnosd').show();
                        sdCorrupted = 1;
                    }

                    $("#sd_info").show();


                    pSM = 100 - ((sd['free'] / sd['total']) * 100);

                    $("#jaugeSM").attr("aria-valuenow", pSM.toFixed(0));
                    $("#jaugeSM").attr("style", 'width:' + pSM.toFixed(0) + "%;min-width:10%;");
                    $("#jaugeSM").html(pSM.toFixed(0) + "%");


                    if (pSM <= 75) {
                        $("#jaugeSM").removeClass('progress-bar-danger');
                        $("#jaugeSM").removeClass('progress-bar-warning');
                        $("#jaugeSM").addClass('progress-bar-success');
                    }
                    if (pSM > 75 && pSM <= 90) {
                        $("#jaugeSM").removeClass('progress-bar-success');
                        $("#jaugeSM").removeClass('progress-bar-danger');
                        $("#jaugeSM").addClass('progress-bar-warning');
                    }
                    if (pSM > 90) {
                        $("#jaugeSM").removeClass('progress-bar-warning');
                        $("#jaugeSM").removeClass('progress-bar-success');
                        $("#jaugeSM").addClass('progress-bar-danger');
                    }
                    sdShown = 1;
                    refreshSD();

                } else {
                    $("#sd").html("NO SD CARD");
                    $('.imgsd').hide();
                    $("#sd_info").hide();
                    $('.imgnosd').show();
                    $("#sm").removeAttr('title');
                    sdShown = 0;
                    source = "internal";
                }
                if (f2d != "done")
                    f2d = GetURLParameter('source');
                if (f2d != null && f2d != "done") {
                    if (f2d == 1)
                        source = "internal";
                    else if (f2d == 2 && result['sd']) {
                        source = "sd";
                        $("#im").removeClass('active');
                        $("#sm").addClass('active');
                    }
                    console.log("param : " + f2d);
                }
                console.log("source : " + source);
                if (refreshFolders == 1)
                    getFoldersList(addressGallery, source);
                refreshFolders = 0;

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

    function showPhoto(srcThumb, idPic) {

        var src = srcThumb.replace('/.thumb', '');
        var type = src.substring(src.indexOf('.JPG') - 3, src.indexOf('.JPG'));
        if (type != "RGB")
            src = src.replace('.JPG', '.TIF');
        $("#pmb").replaceWith('\
            <div class="modal-body row" id="pmb">\
                <div class="row" id="modal-container">\
                    <div class="col-lg-1 col-md-1 col-sm-1 col-xs-1 navig_container"><img class="img-responsive navig center-block" id="previous" src="../img/gallery/empty.png"/></div>\
                    <div class="col-lg-10 col-md-10 col-sm-10 col-xs-10" id="photoZoom" picid="' + idPic + '" dl="' + src.replace("/img", "") + '">\
                        <img class="img-responsive thumbnail" src="/img/gallery/loading.gif" id="loading" alt>\
                    </div>\
                    <div class="col-lg-1 col-md-1 col-sm-1 col-xs-1 navig_container"><img class="img-responsive navig center-block" id="next" src="../img/gallery/empty.png"/></div>\
                </div>\
                <div class="row" style="text-align:center; padding-top:5px"><i>' + src.replace("/img", "") + '</i></div>\
            </div>\
            ');

        console.info("mqskjdfhg > " + idPic);

        $("#myModal").modal('show');
        if (type != "RGB") {
            loadPicture(src, idPic);
        } else {
            loadJPGModal(src, idPic);
        }
        //console.log("src >> "+src);
        $("#delPic").attr('source', src.split('/')[2]);
        $("#delPic").attr('folder', src.split('/')[3]);
        $("#delPic").attr('element', src.split('/')[4]);
        $("#delPic").attr('idPic', idPic);

    }

    function getFoldersList(addressGallery, source) {
        var listF;
        currentFolder = "empty";
        $.ajax({
            url: address_file + "/" + source,
            type: "GET",
            dataType: "json",
            timeout: 5000,
            cache: false,
            success: function (result) {
                displayFolders(result);
            }
        });
    }

    function getPicturesList(path, refresh) {
        $.ajax({
            url: address_file + path,
            type: "GET",
            dataType: "json",
            timeout: 5000,
            cache: false,
            success: function (result) {
                console.log(result);
                console.info(path);
                picList = result;
                if (refresh == false) {
                    IDs = [];
                    var folder = folder = path.substr(path.length - 4, 4);
                    $(".folder").removeClass('active');
                    $("#firstFolder").html(currentFolder);
                    $(".xdelete").attr('id', 'dosf' + currentFolder);
                    $(".xdelete").attr('element', 'folder');
                    $(".xdelete").attr('source', source);
                    $(".xdelete").attr('folder', currentFolder);
                    $(".xdownload").attr('id', 'dosf' + currentFolder);
                    $(".xdownload").attr('element', 'folder');
                    $(".xdownload").attr('source', source);
                    $(".xdownload").attr('folder', currentFolder);
                    $("#" + currentFolder).addClass('active');
                }
                displayPictures(result, refresh);
            }
        });
    }

    var numPic;
    var indexDisplay;
    var listD;
    var pageD;

    var IDs = new Array();

    function displayFolders(list) {
        $("#dispPic").replaceWith('<div class="panel-body" id="dispPic">\
							     </div>');
        $("#list").replaceWith('<ul class="dropdown-menu scrollable-menu" id="list">\
                                </ul>');

        var folder;
        var source;
        var pathPic = "null";
        nbPicInFolder = new Object();
        jQuery.each(list, function (path, nb) {
            if (path != "request") {
                path = "/var/www/img" + path;
                folder = path.substr(path.length - 4, 4);
                source = path.substr(path.indexOf('/', 10) + 1, path.length - 18);

                nbPicInFolder[folder] = nb;

                $("#list").append($('<li><a href="#" class="fclick pointer-cursor" id="' + folder + '" name="' + folder + '">' + folder + ' - ' + nb + ' pictures</span></a>'));
                if (pathPic == "null" && f2d != 1 && f2d != 2) {
                    pathPic = "/" + source + "/" + folder;
                    currentFolder = folder;
                }
                if (f2d != null && f2d != "done") {
                    pathPic = "/" + source + "/" + folder;
                    currentFolder = folder;

                }
            }
        });
        if (f2d != null && f2d != "done")
            f2d = "done";
        currentPage = 1;
        console.info("folder en cours " + pathPic + " : " + currentFolder);
        $("#firstFolder").html(currentFolder);
        $(".xdelete").attr('id', 'dosf' + currentFolder);
        $(".xdelete").attr('element', 'folder');
        $(".xdelete").attr('source', source);
        $(".xdelete").attr('folder', currentFolder);
        $(".xdownload").attr('id', 'dosf' + currentFolder);
        $(".xdownload").attr('element', 'folder');
        $(".xdownload").attr('source', source);
        $(".xdownload").attr('folder', currentFolder);
        $("#" + currentFolder).addClass('active');
        getPicturesList(pathPic, false);
    }

    function displayPictures(list, refresh) {
        if (refresh == false) {
            $("#dispPic").replaceWith('\
						<div class="row" id="dispPic" style="margin-right:2px!important;margin-left:2px!important">\
						</div>\
					');

        }
        $("#firstFolder").html(currentFolder);
        picIdList = new Array();
        var pagination = '<div id="pp" class="row"><ul id="pages"></ul></div>';
        picLoading = false;
        $("#pp").replaceWith(pagination);
        numPic = 0;
        IDs.splice(0, IDs.length);
        jQuery.each(picList, function (pic, size) {
            if (pic != "request" && (pic.indexOf(".TIF") >= 0 || pic.indexOf(".JPG") >= 0)) {
                pic = "/var/www/img" + pic;
                var folder = pic.substr(pic.length - 35, 4);
                if (numPic == 0) {
                    $("#nbPic").html(nbPicInFolder[folder]);

                }
                numPic++;
                var source = pic.substr(pic.indexOf('/', 11) + 1, pic.length - 49);
                var element = pic.substr(pic.length - 30, 30);

                /*console.warn(source + " " + folder + " " + element + " " + size + " " + numPic + " " + currentPage);*/
                if ((size != 0 || (size == 0 && capture_running == "running")) && numPic >= (currentPage - 1) * picByPage && numPic < ((currentPage - 1) * picByPage) + picByPage) {
                    //console.warn(element+" "+$("#"+pic).hasClass('loading'));
                    picIdList[numPic] = element;
                    element = element.replace(".TIF", ".JPG");
                    if (!document.getElementById(numPic))
                        loadJPG("/img/" + source + "/" + folder + "/.thumb/" + element, numPic, currentPage - 1, source, element, folder, "no");
                    else if ($("#" + numPic).hasClass('loading')) {
                        loadJPG("/img/" + source + "/" + folder + "/.thumb/" + element, numPic, currentPage - 1, source, element, folder, "no");
                    }
                } else if (size == 0 && numPic >= (currentPage - 1) * picByPage && numPic < ((currentPage - 1) * picByPage) + picByPage && !document.getElementById(numPic)) {
                    loadJPG("/img/" + source + "/" + folder + "/.thumb/" + element, numPic, currentPage - 1, source, element, folder, "broken");
                }
            }
        });
        $("#nbPic").html(numPic);
        if (numPic >= picByPage) {
            var n;
            if (numPic % picByPage != 0) {
                n = parseInt(numPic / picByPage) + 1
            } else {
                n = numPic / picByPage;
            }
            var options = {
                currentPage: currentPage,
                totalPages: n,
                bootstrapMajorVersion: 3,
                alignment: "center",
                itemContainerClass: function (type, page, current) {
                    return (page === current) ? "active" : "pointer-cursor";
                },
                onPageClicked: function (e, originalEvent, type, page) {
                    handlePages((page));
                }
            }
            $('#pages').bootstrapPaginator(options);
        }

        setTimeout(function () {
            checkPic(source, folder)
        }, 2000);

    }

    function checkPic(source, folder) {
        console.info("IN CHECK " + picLoading);
        if (picLoading == true) {
            setTimeout(function () {
                console.info(picList);

                getPicturesList("/" + source + "/" + folder, true);


            }, 2000);
        } else {
            console.info(IDs);
        }
    }

    var pageOnLoad;

    function getPicWidth() {
        w = $(window).width();
        w -= 4;
        width = 100 + ((w % 100) / parseInt(w / 100));
        if (w < 400)
            width = w / 4;
        return width;
    }

    function loadJPG(filename, num, page, source, element, firstFolder, broken) {
        var photoType;
        var orientation;
        var url;
        var tooltip;

        if (element.substr(element.length - 7, 3) != "RGB")
            url = element.replace(".JPG", ".TIF");
        else
            url = element;

        pageOnLoad = page;
        photoType = (filename.substr(filename.length - 7, 3).toLowerCase());
        if (photoType == "rgb") tooltip = "RGB";
        else if (photoType == "gre") tooltip = "Green";
        else if (photoType == "red") tooltip = "Red";
        else if (photoType == "reg") tooltip = "Red edge";
        else if (photoType == "nir") tooltip = "Near infra-red";

        var $elem = $('<div id="' + num + '" type="' + photoType + '" class="pic ' + photoType + ' onPage" data-toggle="tooltip" title="' + tooltip + '"></div>');
        if (!$("#" + photoType).hasClass('active') && !$("#all").hasClass('active')) {
            $elem.attr('style', "width:" + getPicWidth() + "px;display:none");
        } else {
            $elem.attr('style', "width:" + getPicWidth() + "px");
        }
        var $container = $('<div class="thumb" id="' + url + '"></div>');
        var $thumb = $('<a href="#myModal" class="thumbnail"></a>');
        if (!(source == "sd" && sdReadOnly == 1))
            var $remove = $('<a class="xcontaineri"><img src="../img/gallery/delete_old.png" id="pic' + num + '" source="' + source + '" folder="' + firstFolder + '" element="' + url + '" class="pointer-cursor xdelete" style="width: 30px;height:30px;z-index:4"/></a>');

        if (broken == "no") {
            var img = new Image();

            console.info(filename);

            function loaded() {
                EXIF.getData(img, function () {
                    orientation = EXIF.getTag(img, "Orientation");
                    var canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    canvas.className = "img-responsive photo";
                    canvas.setAttribute("id", filename);
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    if (orientation == 3) drawVHFlipped(ctx, canvas);
                    $thumb.append(canvas);
                    $container.append($thumb);
                    if (!isOS)
                        $container.append($remove);
                    $elem.append($container);
                    if (document.getElementById(num)) {
                        $("#" + num).replaceWith($elem);
                    } else {
                        var i = 0;
                        if (IDs.length == 0) {
                            //console.log("append "+num);
                            $('#dispPic').append($elem);
                            IDs.push(num);
                        } else if (num < IDs[0]) {
                            //console.log("page "+pageOnLoad+" insert before "+(IDs[0]));
                            $elem.insertBefore("#" + (IDs[0]));
                            IDs.unshift(num);
                        } else if (num > IDs[IDs.length - 1]) {
                            //console.log("page "+pageOnLoad+" insert after "+(IDs[IDs.length-1]));
                            $elem.insertAfter("#" + (IDs[IDs.length - 1]));
                            IDs.push(num);
                        } else {
                            while (i < IDs.length - 1) {
                                if (num > IDs[i] && num < IDs[i + 1]) {
                                    //console.log("page "+pageOnLoad+" insert after "+(IDs[i]));
                                    $elem.insertAfter("#" + (IDs[i]));
                                    IDs.splice(i + 1, 0, num);
                                    i = IDs.length;
                                }
                                i++;
                            }
                        }
                        $(".pic").css('width', getPicWidth() + "px");
                        if (!isOS)
                            $('[data-toggle="tooltip"]').tooltip();
                    }

                });
            }

            function error() {
                picLoading = true;
                if (!document.getElementById(num)) {

                    $not_loaded = $('<img src="../img/gallery/loading_spinner.gif" class="img-responsive photo" id="' + filename + '"/>');
                    $thumb.append($not_loaded);
                    $container.append($thumb);
                    if (!isOS)
                        $container.append($remove);
                    $elem.append($container);
                    $elem.addClass('loading');
                    var i = 0;
                    if (IDs.length == 0) {
                        //console.log("append "+num);
                        $('#dispPic').append($elem);
                        IDs.push(num);
                    } else if (num < IDs[0]) {
                        //console.log("page "+pageOnLoad+" insert before "+(IDs[0]));
                        $elem.insertBefore("#" + (IDs[0]));
                        IDs.unshift(num);
                    } else if (num > IDs[IDs.length - 1]) {
                        //console.log("page "+pageOnLoad+" insert after "+(IDs[IDs.length-1]));
                        $elem.insertAfter("#" + (IDs[IDs.length - 1]));
                        IDs.push(num);
                    } else {
                        while (i < IDs.length - 1) {
                            if (num > IDs[i] && num < IDs[i + 1]) {
                                //console.log("page "+pageOnLoad+" insert after "+(IDs[i]));
                                $elem.insertAfter("#" + (IDs[i]));
                                IDs.splice(i + 1, 0, num);
                                i = IDs.length;
                            }
                            i++;
                        }
                    }
                    $(".pic").css('width', getPicWidth() + "px");
                }
            }

            img.onload = loaded;
            img.onerror = error;
            img.src = filename;
        } else {
            $broken = $('<img src="../img/gallery/broken.png" class="img-responsive" id="' + filename + '"/>');
            $thumb.append($broken);
            $container.append($thumb);
            $container.append($remove);
            $elem.append($container);
            $elem.addClass('broken');
            var i = 0;
            if (IDs.length == 0) {
                //console.log("append "+num);
                $('#dispPic').append($elem);
                IDs.push(num);
            } else if (num < IDs[0]) {
                //console.log("page "+pageOnLoad+" insert before "+(IDs[0]));
                $elem.insertBefore("#" + (IDs[0]));
                IDs.unshift(num);
            } else if (num > IDs[IDs.length - 1]) {
                //console.log("page "+pageOnLoad+" insert after "+(IDs[IDs.length-1]));
                $elem.insertAfter("#" + (IDs[IDs.length - 1]));
                IDs.push(num);
            } else {
                while (i < IDs.length - 1) {
                    if (num > IDs[i] && num < IDs[i + 1]) {
                        //console.log("page "+pageOnLoad+" insert after "+(IDs[i]));
                        $elem.insertAfter("#" + (IDs[i]));
                        IDs.splice(i + 1, 0, num);
                        i = IDs.length;
                    }
                    i++;
                }
            }
            $(".pic").css('width', getPicWidth() + "px");
        }


    }

    function loadJPGModal(filename, id) {
        var orientation;
        var photoType = filename.substr(filename.length - 7, 3);
        var url = filename.replace('/img', '');
        var img = new Image();
        img.onload = loaded;
        img.src = filename;
        $("#photoTitle").html("Picture - RGB");

        function loaded() {
            EXIF.getData(img, function () {
                orientation = EXIF.getTag(img, "Orientation");
                var canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.className = "img-responsive thumbnail";
                canvas.setAttribute("id", filename);
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                if (orientation == 3) drawVHFlipped(ctx, canvas);
                if (canvas) {
                    $("#loading").hide();
                    $("#photoZoom").append(canvas);
                }
            });
        }
    }


    function handlePages(page) {
        currentPage = page;
        displayPictures(picList, false);

        $(".pic").each(function () {
            if (this.id >= p * picByPage && this.id < (p * picByPage) + picByPage) {
                $("#" + this.id).show();
                $("#" + this.id).addClass('onPage');
            } else {
                $("#" + this.id).hide();
                $("#" + this.id).removeClass('onPage');
            }
        });
        setPicturesWithFilters();
    }



    function loadPicture(filename, id) {
        var url = filename.replace('/img', '');
        var photoType = filename.substr(filename.length - 7, 3);
        var xhr = new XMLHttpRequest();
        xhr.open('GET', filename);
        xhr.responseType = 'arraybuffer';
        if (photoType == "RGB") photoType = "RGB";
        else if (photoType == "GRE") photoType = "Green";
        else if (photoType == "RED") photoType = "Red";
        else if (photoType == "REG") photoType = "Red edge";
        else if (photoType == "NIR") photoType = "Near infra-red";
        $("#photoTitle").html("Picture - " + photoType);
        xhr.onload = function (e) {
            var buffer = xhr.response;
            Tiff.initialize({
                TOTAL_MEMORY: 167772160
            });
            var tiff = new Tiff({
                buffer: buffer
            });
            var canvas = tiff.toCanvas();
            canvas.className = "img-responsive thumbnail";
            canvas.setAttribute("id", filename);
            var ctx = canvas.getContext('2d');
            //drawVHFlipped(ctx, canvas);

            //console.log("Size Canvas : "+canvas.width+" "+canvas.height);
            if (canvas) {
                $("#loading").hide();
                $("#photoZoom").append(canvas);
            }
        };
        xhr.send();
    };

    function drawVHFlipped(ctx, img) {
        ctx.save();
        // Multiply the y value by -1 to flip vertically
        ctx.scale(-1, -1);
        // Start at (0, -height), which is now the bottom-left corner

        ctx.drawImage(img, -img.width, -img.height);
        ctx.restore();
    }

    function GetURLParameter(sParam) {
        var sPageURL = window.location.search.substring(1);
        var sURLVariables = sPageURL.split('&');
        for (var i = 0; i < sURLVariables.length; i++) {
            var sParameterName = sURLVariables[i].split('=');
            if (sParameterName[0] == sParam) {
                return sParameterName[1];
            }
        }
    }
});
