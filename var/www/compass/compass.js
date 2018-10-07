// Global variable
var body_compass = {
    img: null,
	needle: null,
	ctx: null,
	degrees: 0
};

var sunshine_compass = {
    img: null,
	needle: null,
	ctx: null,
	degrees: 0
};

var body_pitch = {
    img: null,
	needle: null,
	ctx: null,
	degrees: 0
};

var sunshine_pitch = {
    img: null,
	needle: null,
	ctx: null,
	degrees: 0
};

var body_roll = {
    img: null,
	needle: null,
	ctx: null,
	degrees: 0
};

var sunshine_roll = {
    img: null,
	needle: null,
	ctx: null,
	degrees: 0
};

function clearCanvasCompass(data) {
	 // clear canvas
	data['ctx'].clearRect(0, 0, 80, 80);
    data['ctx'].beginPath();
}

function draw_compass(d, id, inv) {
    
    var data;
    if (id == "body_compass")
        data = body_compass;
    else if (id == "sunshine_compass")
        data = sunshine_compass;
    else if (id == "body_pitch_a")
        data = body_pitch;
    else if (id == "sunshine_pitch_a")
        data = sunshine_pitch;
    else if (id == "body_roll_a")
        data = body_roll;
    else if (id == "sunshine_roll_a")
        data = sunshine_roll;
    
	clearCanvasCompass(data);
    
    // Increment the angle of the needle by 5 degrees
    data['degrees'] = d;
    console.info(id+" "+d);
    
	// Draw the compass onto the canvas
	//if (id == "body_compass" || id == "sunshine_compass")
        data['ctx'].drawImage(data['img'], 0, 0, 80, 80);

	// Save the current drawing state
	data['ctx'].save();

	// Now move across and down half the 
	data['ctx'].translate(40, 40);

	// Rotate around this point
	data['ctx'].rotate(data['degrees'] * (Math.PI / 180));

	// Draw the image back and up
	data['ctx'].drawImage(data['needle'], -40, -40, 80, 80);

	// Restore the previous drawing state
	data['ctx'].restore();
}

function init_compass(id) {
	// Grab the compass element
	var canvas = document.getElementById(id);
    var data;
    
    if (id == "body_compass")
        data = body_compass;
    else if (id == "sunshine_compass")
        data = sunshine_compass;
    else if (id == "body_pitch_a")
        data = body_pitch;
    else if (id == "sunshine_pitch_a")
        data = sunshine_pitch;
    else if (id == "body_roll_a")
        data = body_roll;
    else if (id == "sunshine_roll_a")
        data = sunshine_roll;
    

    // Canvas supported?
    if (canvas.getContext('2d')) {
        data['ctx'] = canvas.getContext('2d');

        // Load the needle image
        data['needle'] = new Image();
        

        // Load the compass image
        data['img'] = new Image();
        
        if (id == "body_compass") {
            data['img'].src = '../compass/fond.png';
            data['needle'].src = '../compass/body_yaw.png';
        }
        else if (id == "sunshine_compass") {
            data['img'].src = '../compass/fond.png';
            data['needle'].src = '../compass/sunshine_yaw.png';
        }
        else if (id == "body_pitch_a") {
            data['img'].src = '../compass/fond.png';
            data['needle'].src = '../compass/body_pitch.png';
        }
        else if (id == "sunshine_pitch_a") {
            data['img'].src = '../compass/fond.png';
            data['needle'].src = '../compass/sunshine_pitch.png';
        }
        else if (id == "body_roll_a") {
            data['img'].src = '../compass/fond.png';
            data['needle'].src = '../compass/body_roll.png';
        }
        else if (id == "sunshine_roll_a") {
            data['img'].src = '../compass/fond.png';
            data['needle'].src = '../compass/sunshine_roll.png';
        }
    } else {
        alert("Canvas not supported!");
    }
    
}