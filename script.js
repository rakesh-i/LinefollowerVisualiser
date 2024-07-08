var webSocket;
var isConnected = false;
var isError = false;
var messageTimeout;
var connectionTimeout;
var connectionTimeoutDuration = 3000; // 5 seconds

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d',{ willReadFrequently: true});
var container = document.getElementById('canvasContainer');

// Get the canvas and context
var gridcanvas = document.getElementById('gridCanvas');
var gctx = gridcanvas.getContext('2d');

// Grid dimensions
const cols = 5;
const rows = 100;
const cellWidth = 100;
const cellHeight = 5;

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
var wheelBase = 575; // Adjust as needed

let path = [{x:x, y:y}];

var count = 0;

var E1 = 0;
var E2 = 0;
var initValueE1 = 0;
var initValueE2 = 0;

function toggleWebSocket() {
    var ip = document.getElementById("ipAddress").value;
    if (isConnected) {
        // Close the WebSocket connection
        isError = false;
        webSocket.close();
        count = 0;
        
    } else {
        // Open the WebSocket connection
        startWebSocket(ip);
    }
}

function startWebSocket(ip) {
    // Connect to the WebSocket server
    webSocket = new WebSocket(`ws://${ip}:81`);

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
        document.getElementById("Encoder1").innerText = data.Encoder1;
        document.getElementById("Encoder2").innerText = data.Encoder2;
        document.getElementById("curE1").innerText = E1;
        document.getElementById("curE2").innerText = E2;
   
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
            if(count==0){
                E1 = data.Encoder1 - initValueE1;
                E2 = data.Encoder2 - initValueE2;
                clear();
                count = 1;
            }
            E1 = data.Encoder1 - initValueE1;
            E2 = data.Encoder2 - initValueE2;
            
            updatePosition(E1, E2);
        }

        resetMessageTimeout();

        // Update the grid
        updateGrid();
    };

    // Handle connection open event
    webSocket.onopen = function() {
        console.log("WebSocket connection opened.");
        isConnected = true;
        clear();
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

    path.push({x: x, y: y});

    // Ensure canvas size is sufficient
    adjustCanvasSize();

    // Center the canvas on the car's position
    centerCanvas();

    // Example: Set cursor color to black
    ctx.strokeStyle = 'blue'; // Example for stroke color
    ctx.fillStyle = 'red';   // Example for fill color
    // Draw a dot at the new position
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
    // ctx.arc(x, y, 2, 0, 2 * Math.PI, true); // Draw a small circle (dot)
    // ctx.fill();
}

function adjustCanvasSize() {
    var minX = Math.min(x, canvas.width / 2);
    var minY = Math.min(y, canvas.height / 2);
    var maxX = Math.max(x, canvas.width / 2);
    var maxY = Math.max(y, canvas.height / 2);

    if(minX<0){
        let offsetX = 100;
        canvas.width += offsetX;
        x += offsetX;
        path.forEach(p => p.x += offsetX);
    }

    if (maxX > canvas.width) {
        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        canvas.width = maxX * 2;
        ctx.putImageData(imageData, 0, 0);
    }

    if(minY<0){
        let offsetY = 100;
        canvas.height += offsetY;
        y += offsetY;
        path.forEach(p => p.y += offsetY);
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
    return Math.floor((value / 1000) * 255);
}

function updateGrid() {
    // Clear the canvas
    gctx.clearRect(0, 0, gridcanvas.width, gridcanvas.height);

    // Iterate over the queue and draw the cells
    for (let i = 0; i < valueQueue.length; i++) {
        let col = i % cols;
        let row = rows-1-Math.floor(i / cols);

        let intensity = normalizeValue(valueQueue[i]);
        let color = `rgb(${255-intensity}, ${255-intensity}, ${255-intensity})`;

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

function clear(){
    console.log("clear");
    initValueE1 = Number(document.getElementById("Encoder1").textContent);
    initValueE2 = Number(document.getElementById("Encoder2").textContent);
    console.log(initValueE1, initValueE2);
    E1 = 0;
    E2 = 0;
    prevEncoderLeft = 0;
    prevEncoderRight = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    x = canvas.width / 2;
    y = canvas.height / 2;
    theta = 0;
    prevEncoderLeft = 0;
    prevEncoderRight = 0;
    path = [];
    path = [{x:x, y:y}];
    centerCanvas();
}


document.getElementById("toggleButton").addEventListener("click", toggleWebSocket);

document.getElementById("clearButton").addEventListener("click", clear);

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
clear();
