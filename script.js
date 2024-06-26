var webSocket;
var isConnected = false;
var isError = false;
var messageTimeout;
var connectionTimeout;
var connectionTimeoutDuration = 3000; // 5 seconds

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var container = document.getElementById('canvasContainer');

// Get the canvas and context
var gridcanvas = document.getElementById('gridCanvas');
var gctx = gridcanvas.getContext('2d');

// Grid dimensions
const cols = 5;
const rows = 50;
const cellWidth = 100;
const cellHeight = 10;

// Store the values in a queue
var valueQueue = [];

// Position and orientation of the car
var x = canvas.width / 2;
var y = canvas.height / 2;
var theta = 0; // Orientation in radians

// Previous encoder values
var prevEncoderLeft = 0;
var prevEncoderRight = 0;

// Distance between the wheels (wheelbase)
var wheelBase = 400; // Adjust as needed

function toggleWebSocket() {
    if (isConnected) {
        // Close the WebSocket connection
        isError = false;
        webSocket.close();
        
    } else {
        // Open the WebSocket connection
        startWebSocket();
    }
}

function startWebSocket() {
    // Connect to the WebSocket server
    webSocket = new WebSocket("ws://192.168.0.102:81");

    connectionTimeout = setTimeout(function() {
        if (webSocket.readyState !== WebSocket.OPEN) {
            console.log("WebSocket connection timeout.");
            isConnected = false;
            updateStatus(true);
            webSocket.close();
        }
    }, connectionTimeoutDuration);

    // Handle incoming messages
    webSocket.onmessage = function(event) {
        var data = JSON.parse(event.data);
        // document.getElementById("value1").innerText = data.value1;
        // document.getElementById("value2").innerText = data.value2;
        // document.getElementById("value3").innerText = data.value3;
        // document.getElementById("value4").innerText = data.value4;
        // document.getElementById("value5").innerText = data.value5;
        // document.getElementById("value6").innerText = data.value6;
        document.getElementById("Encoder1").innerText = data.Encoder1;
        document.getElementById("Encoder2").innerText = data.Encoder2;
        
        if (data.value1 !== undefined) valueQueue.push(data.value1);
        if (data.value2 !== undefined) valueQueue.push(data.value2);
        if (data.value4 !== undefined) valueQueue.push(data.value4);
        if (data.value5 !== undefined) valueQueue.push(data.value5);
        if (data.value6 !== undefined) valueQueue.push(data.value6);

        // Maintain the queue size to fit within the grid
        while (valueQueue.length > cols * rows) {
            valueQueue.shift();
        }

        

        if (data.Encoder1 !== undefined && data.Encoder2 !== undefined) {
            updatePosition(data.Encoder1, data.Encoder2);
        }

        resetMessageTimeout();

        // Update the grid
        updateGrid();
    };

    // Handle connection open event
    webSocket.onopen = function() {
        console.log("WebSocket connection opened.");
        isConnected = true;
        clearTimeout(connectionTimeout); // Clear the connection timeout
        updateStatus();
        resetMessageTimeout(); // Start the timeout when the connection is opened
    };

    // Handle connection close event
    webSocket.onclose = function() {
        console.log("WebSocket connection closed.");
        isConnected = false;
        updateStatus();
        clearTimeout(messageTimeout); // Clear the timeout when the connection is closed
        clearTimeout(connectionTimeout); // Clear the connection timeout
    };

    // Handle connection error event
    webSocket.onerror = function() {
        console.log("WebSocket connection error.");
        isConnected = false;
        isError = true;
        updateStatus();
        clearTimeout(messageTimeout); // Clear the timeout when there is an error
        clearTimeout(connectionTimeout); // Clear the connection timeout
    };
}

function resetMessageTimeout() {
    // Clear any existing timeout
    clearTimeout(messageTimeout);
    // Set a new timeout to trigger if no message is received within 5 seconds
    messageTimeout = setTimeout(function() {
        console.log("No message received in 5 seconds. Connection failed.");
        isError = true;
        isConnected = false;
        updateStatus(true);
        webSocket.close();
    }, 5000); // 5 seconds
}

function updateStatus() {
    var statusElement = document.getElementById("status");
    var buttonElement = document.getElementById("toggleButton");
    if (isConnected) {
        statusElement.innerText = "Connected";
        buttonElement.innerText = "Disconnect";
    } else {
        if(isError == true){
            statusElement.innerText = "Connection Failed";
            buttonElement.innerText = "Retry";
            
        }
        else{
            statusElement.innerText = "Disconnected";
            buttonElement.innerText = "Connect";
            isError = false;
            
        }
        
    }
}

function updatePosition(encoderLeft, encoderRight) {
    // Calculate the distance traveled by each wheel
    var dL = encoderLeft - prevEncoderLeft;
    var dR = encoderRight - prevEncoderRight;

    // Update the previous encoder values
    prevEncoderLeft = encoderLeft;
    prevEncoderRight = encoderRight;

    // Calculate the change in orientation
    var dTheta = (dR - dL) / wheelBase;

    // Calculate the average distance traveled
    var d = (dR + dL) / 2;

    // Update the orientation
    theta += dTheta;

    // Update the position
    x += d * Math.cos(theta);
    y += d * Math.sin(theta);

    // Ensure canvas size is sufficient
    adjustCanvasSize();

    // Center the canvas on the car's position
    centerCanvas();

    // Example: Set cursor color to black
    ctx.strokeStyle = 'blue'; // Example for stroke color
    ctx.fillStyle = 'red';   // Example for fill color
    // Draw a dot at the new position
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 2 * Math.PI, true); // Draw a small circle (dot)
    ctx.fill();
}

function adjustCanvasSize() {
    var minX = Math.min(x, canvas.width / 2);
    var minY = Math.min(y, canvas.height / 2);
    var maxX = Math.max(x, canvas.width / 2);
    var maxY = Math.max(y, canvas.height / 2);

    if (maxX > canvas.width) {
        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        canvas.width = maxX * 2;
        ctx.putImageData(imageData, 0, 0);
    }

    if (maxY > canvas.height) {
        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        canvas.height = maxY * 2;
        ctx.putImageData(imageData, 0, 0);
    }
}

function centerCanvas() {
    var containerCenterX = container.clientWidth / 2;
    var containerCenterY = container.clientHeight / 2;

    var canvasCenterX = x;
    var canvasCenterY = y;

    var offsetX = canvasCenterX - containerCenterX;
    var offsetY = canvasCenterY - containerCenterY;

    container.scrollLeft = offsetX;
    container.scrollTop = offsetY;
}

// Function to normalize the value to a 0-255 range
function normalizeValue(value) {
    return Math.floor((value / 4000) * 255);
}

function updateGrid() {
    // Clear the canvas
    ctx.clearRect(0, 0, gridcanvas.width, gridcanvas.height);

    // Iterate over the queue and draw the cells
    for (let i = 0; i < valueQueue.length; i++) {
        let col = i % cols;
        let row = Math.floor(i / cols);

        let intensity = normalizeValue(valueQueue[i]);
        let color = `rgb(${intensity}, ${intensity}, ${intensity})`;

        // Fill the cell with the calculated color
        gctx.fillStyle = color;
        gctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);

        // Draw the value in the center of the cell
        // gctx.fillStyle = 'black';
        // gctx.font = '20px Arial';
        // gctx.textAlign = 'center';
        // gctx.textBaseline = 'middle';
        // gctx.fillText(valueQueue[i], col * cellWidth + cellWidth / 2, row * cellHeight + cellHeight / 2);
    }
}


document.getElementById("toggleButton").addEventListener("click", toggleWebSocket);

document.getElementById("clearButton").addEventListener("click", function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    x = canvas.width / 2;
    y = canvas.height / 2;
    theta = 0;
    prevEncoderLeft = 0;
    prevEncoderRight = 0;
    centerCanvas();
});

document.getElementById("exportButton").addEventListener("click", function() {
    var tempCanvas = document.createElement('canvas');
    var tempCtx = tempCanvas.getContext('2d');
    
    // Set the dimensions of the temporary canvas
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    // Fill the temporary canvas with the desired background color
    tempCtx.fillStyle = 'white'; // Replace 'white' with your desired background color
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw the current canvas content onto the temporary canvas
    setTimeout(function() {
        tempCtx.drawImage(canvas, 0, 0);

        // Export the temporary canvas as JPEG
        var dataURL = tempCanvas.toDataURL("image/jpeg");
        var a = document.createElement('a');
        a.href = dataURL;
        a.download = 'canvas.jpeg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, 100); // Adjust delay as needed
});


// Initialize canvas
ctx.beginPath();
centerCanvas();