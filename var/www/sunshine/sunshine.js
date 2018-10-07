var sunshine_green = {
    img: null,
	color: null,
	ctx: null,
	percent: 0,
    cadre: null
};

var sunshine_red = {
    img: null,
	color: null,
	ctx: null,
	percent: 0,
    cadre: null
};

var sunshine_rededge = {
    img: null,
	color: null,
	ctx: null,
	percent: 0,
    cadre: null
};

var sunshine_nearinfrared = {
    img: null,
	color: null,
	ctx: null,
	percent: 0,
    cadre: null
};

var sunshine_green_1 = {
    img: null,
	color: null,
	ctx: null,
	percent: 0,
    cadre: null
};

var sunshine_red_1 = {
    img: null,
	color: null,
	ctx: null,
	percent: 0,
    cadre: null
};

var sunshine_rededge_1 = {
    img: null,
	color: null,
	ctx: null,
	percent: 0,
    cadre: null
};

var sunshine_nearinfrared_1 = {
    img: null,
	color: null,
	ctx: null,
	percent: 0,
    cadre: null,
};

var p7 = {
    img: null,
	color: null,
	ctx: null,
	percent: 0,
    cadre: null,
    min: -35,
    max: 80
};

var p7mu = {
    img: null,
	color: null,
	ctx: null,
	percent: 0,
    cadre: null,
    min: -35,
    max: 80
};

var ddr3 = {
    img: null,
	color: null,
	ctx: null,
	percent: 0,
    cadre: null,
    min: -35,
    max: 90
};


var wifi = {
    img: null,
	color: null,
	ctx: null,
	percent: 0,
    cadre: null,
    min: -35,
    max: 90
};

var imu_body = {
    img: null,
	color: null,
	ctx: null,
	percent: 0,
    cadre: null,
    min: -35,
    max: 90
};

var imu_sunshine = {
    img: null,
	color: null,
	ctx: null,
	percent: 0,
    cadre: null,
    min: -35,
    max: 90
};

function clearCanvasSunshine(data) {
	 // clear canvas
	data['ctx'].clearRect(0, 0, 40, 80);
    data['ctx'].beginPath();
}


function draw_sunshine(d, id) {
    
    var data;
    if (id == "sunshine_green")
        data = sunshine_green;
    else if (id == "sunshine_red")
        data = sunshine_red;
    else if (id == "sunshine_rededge")
        data = sunshine_rededge;
    else if (id == "sunshine_nearinfrared")
        data = sunshine_nearinfrared;
    else if (id == "sunshine_green_1")
        data = sunshine_green_1;
    else if (id == "sunshine_red_1")
        data = sunshine_red_1;
    else if (id == "sunshine_rededge_1")
        data = sunshine_rededge_1;
    else if (id == "sunshine_nearinfrared_1")
        data = sunshine_nearinfrared_1;
    else if (id == "p7_a")
        data = p7;
    else if (id == "p7mu_a")
        data = p7mu;
    else if (id == "ddr3_a")
        data = ddr3;
    else if (id == "wifi_a")
        data = wifi;
    else if (id == "imu_body_a")
        data = imu_body;
    else if (id == "imu_sunshine_a")
        data = imu_sunshine;
    
    
	clearCanvasSunshine(data);
    
    if (id == "p7_a" || id == "p7mu_a" || id == "ddr3_a" || id == "wifi_a" || id == "imu_body_a" || id == "imu_sunshine_a") {
        data['percent'] = (parseInt(d)/100*80).toFixed(0);
    }
    else {
       // Increment the angle of the needle by 5 degrees
	   data['percent'] = ((Math.log(d+100)-Math.log(100))/Math.log(66535))*79; 
    }
    
    console.info("START > is == "+id+" value == "+d);
	// Draw the compass onto the canvas
	//data['ctx'].translate(0, 80);
    data['ctx'].drawImage(data['img'], 0, 0, 40, 80);

	// Save the current drawing state
	data['ctx'].save();
    
    if (id == "p7_a" || id == "p7mu_a" || id == "ddr3_a" || id == "wifi_a" || id == "imu_body_a" || id == "imu_sunshine_a") {
        if (d< data['min']) {
            data['color'].src = "../sunshine/blue_p.png";
            data['cadre'].src = "../sunshine/blue_r.png";
            console.info("blue");
        }
        else if (d < data['max']) {
            data['color'].src = "../sunshine/green_p.png";
            data['cadre'].src = "../sunshine/green_r.png";
            console.info("green");
        }
        else {
            data['color'].src = "../sunshine/red_p.png";
            data['cadre'].src = "../sunshine/red_r.png";
            console.info("red");
        }
        data['ctx'].drawImage(data['color'], 0, 80-data['percent'], 40, data['percent']);
        data['ctx'].restore();
        data['ctx'].drawImage(data['cadre'], 0, 0, 40, 80);
        console.info("TEMP > height "+data['percent']+" y = "+(80-data['percent']));
    }
    else {
        data['ctx'].drawImage(data['color'], 0, (78-data['percent']).toFixed(0), 40, (data['percent']).toFixed(0));
        data['ctx'].restore();
        data['ctx'].drawImage(data['cadre'], 0, 0, 40, 80);
        console.log("SUNSHINE > height "+(data['percent']).toFixed(0)+" y = "+(80-data['percent']).toFixed(0));
    }
	

	
}

function init_sunshine(id) {
	// Grab the compass element
	var canvas = document.getElementById(id);
    var data;
    
    if (id == "sunshine_green")
        data = sunshine_green;
    else if (id == "sunshine_red")
        data = sunshine_red;
    else if (id == "sunshine_rededge")
        data = sunshine_rededge;
    else if (id == "sunshine_nearinfrared")
        data = sunshine_nearinfrared;
    else if (id == "sunshine_green_1")
        data = sunshine_green_1;
    else if (id == "sunshine_red_1")
        data = sunshine_red_1;
    else if (id == "sunshine_rededge_1")
        data = sunshine_rededge_1;
    else if (id == "sunshine_nearinfrared_1")
        data = sunshine_nearinfrared_1;
    else if (id == "p7_a")
        data = p7;
    else if (id == "p7mu_a")
        data = p7mu;
    else if (id == "ddr3_a")
        data = ddr3;
    else if (id == "wifi_a")
        data = wifi;
    else if (id == "imu_body_a")
        data = imu_body;
    else if (id == "imu_sunshine_a")
        data = imu_sunshine;
    
    console.info(id);
    // Canvas supported?
    if (canvas.getContext('2d')) {
        data['ctx'] = canvas.getContext('2d');

        // Load the needle image
        data['color'] = new Image();
        data['img'] = new Image();
        data['cadre'] = new Image();
        
        if (id == "sunshine_green" || id == "sunshine_green_1" || id == "sunshine_red" || id == "sunshine_red_1" || id == "sunshine_rededge" || id == "sunshine_rededge_1" || id == "sunshine_nearinfrared" || id == "sunshine_nearinfrared_1") {
            data['img'].src = '../sunshine/fond_sunshine.png';
            data['cadre'].src = '../sunshine/cadre_sunshine.png';
        }
        if (id == "sunshine_green" || id == "sunshine_green_1")
            data['color'].src = '../sunshine/green_sunshine.png';
        else if (id == "sunshine_red" || id == "sunshine_red_1")
            data['color'].src = '../sunshine/red_sunshine.png';
        else if (id == "sunshine_rededge" || id == "sunshine_rededge_1")
            data['color'].src = '../sunshine/rededge_sunshine.png';
        else if (id == "sunshine_nearinfrared" || id == "sunshine_nearinfrared_1")
            data['color'].src = '../sunshine/nearinfrared_sunshine.png';
        else {
            data['img'].src = '../sunshine/fond_temp.png';
            data['cadre'].src = '../sunshine/green_r.png';
            data['color'].src = '../sunshine/green_p.png';
        }
       
    } else {
        alert("Canvas not supported!");
    }
    
}