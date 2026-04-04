var exec = require('cordova/exec');

window.cursorElementId = "cordovacursor";
window.pointerSpeed = 6.0
window.frameTime = 1.0 / 60.0;

// Can override for remapping inputs
document.cursorMap = {
    "up": 38,
    "down": 40,
    "left": 37,
    "right": 39,

    "button":  13, 
}

// Input state
document.input = {
    "up": false,
    "down": false,
    "left": false,
    "right": false,

    "buttonDown": false,
    "buttonClicked": false,
}

// Initialise start position
document.cursorPos = {"x": 0, "y": 0};
document.cursorCurrentPos = {"x": 0, "y": 0};

document.getElementOffset = function (element) {
    var bodyRect = document.body.getBoundingClientRect();
    var elementRect = element.getBoundingClientRect();
    
    var yOffset  = elementRect.top - bodyRect.top;
    var xOffset  = elementRect.left - bodyRect.left;

    return {"x": xOffset, "y": yOffset};
}

document.preventDefault = function (e) {
    e = e || window.event;
    if (e.preventDefault)
        e.preventDefault();
    e.returnValue = false;  
}

document.update = function() {
    var cursor = document.getElementById(window.cursorElementId)
    var cursorPos = document.cursorPos;
    var cursorInput = document.input;

    if (cursorInput.up )
    {
        cursorPos.y -= window.pointerSpeed;
        if (cursorPos.y < 0) cursorPos.y = 0;
    }
    if (cursorInput.down )
    {
        cursorPos.y += window.pointerSpeed;
        if (cursorPos.y > window.innerHeight) cursorPos.y = window.innerHeight;
    }
    if (cursorInput.left )
    {
        cursorPos.x -= window.pointerSpeed;
        if (cursorPos.x < 0) cursorPos.x = 0;
    }
    if (cursorInput.right )
    {
        cursorPos.x += window.pointerSpeed;
        if (cursorPos.x > window.innerWidth) cursorPos.x = window.innerWidth;
    }

    var xDiff =  cursorPos.x - document.cursorCurrentPos.x;
    var yDiff =  cursorPos.y - document.cursorCurrentPos.y;

    var deltaX = (xDiff * 9.2) * window.frameTime;
    var deltaY = (yDiff * 9.2) * window.frameTime;

    document.cursorCurrentPos.x += deltaX;
    document.cursorCurrentPos.y += deltaY;

    cursor.style.left = document.cursorCurrentPos.x + "px";
    cursor.style.top = document.cursorCurrentPos.y + "px";

    document.cursorPos = cursorPos;

    // Click handling
    if (cursorInput.buttonClicked) {

        document.cursorPos.x = document.cursorCurrentPos.x;
        document.cursorPos.y = document.cursorCurrentPos.y;

        document.checkClick(function(clientPos, cursorPos, target) {
            return new MouseEvent("click", {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: clientPos.x,
                clientY: clientPos.y,
                screenX: cursorPos.x,
                screenY: cursorPos.y,
            });
        });
    }
    cursorInput.buttonClicked = false;
}

document.checkClick = function(eventFactory) {
    var cursorPos = document.cursorPos;
    var elements = document.elementsFromPoint(cursorPos.x, cursorPos.y);

    if (elements == null || elements.length == 0) {
        return;
    }

    var mouseOver = null;

    if (elements[0].id == window.cursorElementId)
    {
        if (elements.length == 1) {
            return;
        }
        mouseOver = elements[1];
    }
    else
    {
        mouseOver = elements[0]
    }

    var clientX = cursorPos.x;
    var clientY = cursorPos.y;
    var clientPos = {'x': clientX, 'y': clientY};

    var event = eventFactory(clientPos, cursorPos, mouseOver);
    if (event != null) {
        // console.log("Send event to: ");
        // console.log(event);
        mouseOver.dispatchEvent(event);
    }
}

document.onkeyup = function(event) {
    var cursorInput = document.input;		

    if (event.keyCode == document.cursorMap.up)
    {
        cursorInput.up = false;
    }
    if (event.keyCode == document.cursorMap.down)
    {
        cursorInput.down = false;
    }
    if (event.keyCode == document.cursorMap.left)
    {
        cursorInput.left = false;
    }
    if (event.keyCode == document.cursorMap.right)
    {
        cursorInput.right = false;
    }
    if (event.keyCode == document.cursorMap.button)
    {
        cursorInput.buttonDown = false;

        document.checkClick(function(clientPos, cursorPos, target) {

            return new MouseEvent("mouseup", {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: clientPos.x,
                clientY: clientPos.y,
                screenX: cursorPos.x,
                screenY: cursorPos.y,
            });
        });
    }
    document.input = cursorInput;
}
document.onkeydown = function(event) {
    var cursorInput = document.input;

    if (event.keyCode == document.cursorMap.up)
    {
        cursorInput.up = true;
        document.preventDefault(event);
    }
    if (event.keyCode == document.cursorMap.down)
    {
        cursorInput.down = true;
        document.preventDefault(event);
    }
    if (event.keyCode == document.cursorMap.left)
    {
        cursorInput.left = true;
        document.preventDefault(event);
    }
    if (event.keyCode == document.cursorMap.right)
    {
        cursorInput.right = true;
        document.preventDefault(event);
    }
    if (event.keyCode == document.cursorMap.button)
    {
        if (cursorInput.buttonDown == false) {
            cursorInput.buttonClicked = true;
        }
        cursorInput.buttonDown = true;

        document.checkClick(function(clientPos, cursorPos, target) {

            return new MouseEvent("mousedown", {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: clientPos.x,
                clientY: clientPos.y,
                screenX: cursorPos.x,
                screenY: cursorPos.y,
            });
            return eventObject;
        });
    }
    document.input = cursorInput;
}; 


// Add handler to install the cursor
var cursorElem = document.createElement("img");
cursorElem.setAttribute("id", window.cursorElementId);
cursorElem.setAttribute("src", "cursor.png");
cursorElem.style.cssText = "position: absolute; top: 0px; left: 0px; z-index: 10000;";


var body = document.getElementsByTagName("BODY")[0];
body.appendChild(cursorElem);

setInterval(document.update, window.frameTime * 1000.0);