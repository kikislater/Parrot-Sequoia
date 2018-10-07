var refreshSD;
var isSD;
var refreshMemoryInfo;
var downloadMacgyver;

$(function () {
	var base_address_url = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port;
	var address = base_address_url + "/sd";
	var address_version = base_address_url + "/version";
	var addressGallery = base_address_url + "/gallery/";
	var address_storage = base_address_url + "/storage";
	var address_gpsfix = base_address_url + "/gpsfix";
	var address_eject = base_address_url + "/eject";
	//var timer = setInterval(refresh, 2000);

	$(document).ready(function () {
		$("#unmount").hide();

		getVersion();
		refreshSD();
		getGPS();
		$(document).on('click', '#unmount', function () {
			sendUnmountSD();
			$(".mem").removeClass('active');
			$("#im").addClass('active');
			refreshMemoryInfo = 1;
		});
		$(document).on('click', '#powerOff', function () {
			powerOff("EN");
		});
		$(document).on('click', '#powerOfffr', function () {
			powerOff("FR");
		});
		$(document).on('click', '#cancelShutdown', function () {
			$("#shutdownConfirm").replaceWith("");
			$(".modal-backdrop").replaceWith("");
		});
		$(document).on('click', '#shutdown', function () {
			launchShutdown();
		});
	});

	function getGPS() {
		$.ajax({
			url: address_gpsfix,
			type: "GET",
			dataType: "json",
			timeout: 5000,
			cache: false,
			success: function (result) {
			}
		});
	}

	function getVersion() {
		$.ajax({
			url: address_version,
			type: "GET",
			dataType: "json",
			timeout: 5000,
			cache: false,
			success: function (result) {
				$('#version').html(result['version']);
				$('#serialnumber').html(result['serial_number']);
			},
			error: function (xhr, ajaxOptions, thrownError) {
				//console.log("req err : "+xhr.responseText);
				//console.log(thrownError);
			}
		});
	}

	refreshSD = function () {
		$.ajax({
			url: address_storage,
			type: "GET",
			dataType: "json",
			timeout: 5000,
			cache: false,
			success: function (result) {
				//console.log("sd : "+result);
				if (result['sd']) {
					$("#unmount").show();
				} else {
					$("#unmount").hide();
				}
			},
			error: function (xhr, ajaxOptions, thrownError) {
				console.error("req err : " + xhr.responseText);
				console.error(thrownError);
			}
		});
	}

	function powerOff(language) {
		//console.log("shutting down !");
		if (language == "FR") {
			$('body').append(
				'<div class="modal fade" id="shutdownConfirm" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">\
			  <div class="modal-dialog modal-xs" role="document">\
				<div class="modal-content">\
				  <div class="modal-header">\
				<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>\
				<h4 class="modal-title" id="myModalLabel">Confirmation d\'extinction</h4>\
				  </div>\
				  <div class="modal-body" id="photoZoom">\
					  <div class="row">Etes-vous sûr de vouloir éteindre votre Sequoia</div>\
						<br>\
					  <div class="row">\
						<button type="button" id="cancelShutdown" class="btn btn-primary" data-dismiss="modal">Annuler&nbsp;&nbsp;<span class="glyphicon glyphicon-remove" aria-hidden="true"></span></button>\
						<button type="button" id="shutdown" class="btn btn-danger" data-dismiss="modal">Confirmer&nbsp;&nbsp;<span class="glyphicon glyphicon-ok" aria-hidden="true"></span></button>\
					  </div>\
				  </div>\
				</div>\
			  </div>\
			</div>'
			);
		} else {
			$('body').append(
				'<div class="modal fade" id="shutdownConfirm" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">\
			  <div class="modal-dialog modal-xs" role="document">\
				<div class="modal-content">\
				  <div class="modal-header">\
				<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>\
				<h4 class="modal-title" id="myModalLabel">Shutdown Confirmation</h4>\
				  </div>\
				  <div class="modal-body" id="photoZoom">\
					  <div class="row">Do you want to shutdown your Sequoia</div>\
						<br>\
					  <div class="row">\
						<button type="button" id="cancelShutdown" class="btn btn-primary" data-dismiss="modal">Cancel&nbsp;&nbsp;<span class="glyphicon glyphicon-remove" aria-hidden="true"></span></button>\
						<button type="button" id="shutdown" class="btn btn-danger" data-dismiss="modal">Confirm&nbsp;&nbsp;<span class="glyphicon glyphicon-ok" aria-hidden="true"></span></button>\
					  </div>\
				  </div>\
				</div>\
			  </div>\
			</div>'
			);
		}
		$("#shutdownConfirm").modal('show');
	}

	function launchShutdown() {
		var navbar = {
			action: "shutdown"
		}
		$.ajax({
			url: address,
			type: "POST",
			dataType: "text",
			contentType: "json",
			data: JSON.stringify(navbar),
			timeout: 5000,
			cache: false,
			success: function (result) {
				//console.log(result);
				if (result != "KO") {
					$('body').removeClass("modal-open");
					$('body').css('height', '100%');
					$('body').html('<div id="disp" style="text-align: center;vertical-align:center"></div>');
					$("#disp").append('<h1 >Sequoia OFF</h1>');
				}
			},
			error: function (xhr, ajaxOptions, thrownError) {
				//console.log("req err : "+xhr.responseText);
				//console.log(thrownError);
			}
		});
	}



	function sendUnmountSD() {
		$.ajax({
			url: address_eject,
			type: "GET",
			timeout: 5000,
			dataType: "json",
			cache: false,
			success: function (result) {
				//console.log(result);
				if (result['status'] == "ok") {
					$("#unmount").hide();
				} else {
					$("#unmount").show();
				}
			},
			error: function (xhr, ajaxOptions, thrownError) {
				//console.log("req err : "+xhr.responseText);
				//console.log(thrownError);
			}
		});
	}
    
    downloadMacgyver = function(name) {
        console.info(base_address_url+"/macgyver/"+name);
        window.location = base_address_url+"/macgyver/"+name;
    }

});
