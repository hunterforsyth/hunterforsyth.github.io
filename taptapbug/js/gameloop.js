/* CSC309 - Assignment 2         */
/* By: Hunter Forsyth (c3forsyt) */

// Engine variables: 
const w = 400;
const h = 640; // Viewport is 400x600 with 40px additional vertical space for the info bar.
const targetFps = 60;
var ctx;
var gameLoopTimer;
var canvas;
var deltaTime, startTime;  // deltaTime is time since last frame (as a fraction of a second).
                           // Now, object movement can be specified in terms of px/sec vs px/frame.

// Images:
const foodImg = new Image();
foodImg.src = "images/food.png"; // Image from:
                                 // https://www.iconfinder.com/icons/416371/carrot_food_vegetables_vegetarian_icon#size=128

const pauseImg = new Image();
pauseImg.src = "images/pause.png"; // Image from:
                                  // http://www.flaticon.com/free-icon/pause-bars_17270#term=pause&page=1&position=3

const playImg = new Image();
playImg.src = "images/play.png"; // Image from:
                                 // http://www.flaticon.com/free-icon/play-arrow_60813#term=play&page=1&position=9

// High scores:
var highscore1, currentscore1;
var highscore2, currentscore2;

// Game variables:
const NUM_FOODS = 5;
const FOOD_WIDTH = 32;
const MOUSE_KILL_RADIUS = 30;
var score, timeRemaining, gameLevel, nextBugEntryTime;
var food = [];
var bugs = [];
var mouseX, mouseY, mouseDown;
var clickX, clickY;
var currentKillRadius;
var gameTimer;
var pause = false;
var loadGameFinished, loadGameOver;
var levelAnimation;

// Classes:
const BLACK_BUG = 3;
const RED_BUG = 2;
const ORANGE_BUG = 1;

var Bug = function(type, xpos, ypos){
    this.xpos = xpos;
    this.ypos = ypos;
    this.rotation = 0;
    this.type = type;
    this.alive = true;
    this.timeKilled = 0;
    switch(this.type){
        case BLACK_BUG:
            this.speed = 150;
            this.speed2 = 200;
            this.scoreVal = 5;
            this.color = "#000000"
            break;
        case RED_BUG:
            this.speed = 75;
            this.speed2 = 100;
            this.scoreVal = 3;
            this.color = "#FF0000"
            break;
        case ORANGE_BUG:
            this.speed = 60;
            this.speed2 = 80;
            this.scoreVal = 1;
            this.color = "#FF5500"
            break;
    }
    this.legPositions = [14, 14, 8, 8, 0, 0]; // For leg animation.
    this.legPositionsMax = [17, 17, 11, 11, 3, 3];
    this.legPositionsMin = [11, 11, 5, 5, -3, -3];
    this.animationStage = 0;
};

/* Draw the bug on the screen. */
Bug.prototype.draw = function(){
    // Only draw the bug if it is alive or has recently been killed.
    if (this.alive || this.timeKilled + 2000 > Date.now()){
        ctx.save(); // Save the current context so we can draw the bug with rotation.
        ctx.translate(this.xpos, this.ypos); // Set origin to the bug's coords.

        if (!this.alive && this.timeKilled + 1000 < Date.now()){
            ctx.globalAlpha = 1.0 - (Date.now() - this.timeKilled - 1000) / 1000;
        }

        ctx.beginPath(); // Draw the body + head.
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = "#000000";
        ctx.ellipse(0, 0, 6, 16, 0, 0, 2*Math.PI);
        ctx.arc(0, -9, 7, 0, 2*Math.PI);
        ctx.stroke();
        ctx.fill();

        quickQuadCurve(5, 12, 14, this.legPositions[0]); // Draw legs on right side.
        quickQuadCurve(6, 6, 18, this.legPositions[2]);
        quickQuadCurve(6, 0, 16, this.legPositions[4]);

        quickQuadCurve(-5, 12, -14, this.legPositions[1]); // Draw legs on left side.
        quickQuadCurve(-6, 6, -18, this.legPositions[3]);
        quickQuadCurve(-6, 0, -16, this.legPositions[5]);

        // Draw the eyes:
        circle(6, -9, 4, "#FFFFFF", true);
        circle(-6, -9, 4, "#FFFFFF", true);
        if (!this.alive){ // Draw dead eyes.
            line(-4, -7, -8, -11, "#000000");
            line(-8, -7, -4, -11, "#000000");
            line(8, -7, 4, -11, "#000000");
            line(4, -7, 8, -11, "#000000");
        } else { // Draw alive eyes.    
            circle(7, -10, 1, "#000000", true);
            circle(-7, -10, 1, "#000000", true);
        }

        ctx.restore(); // Restore previous context state.
    }
}

/* Check if the bug is within the bounds the clicked mouse and potentially kill it. */
Bug.prototype.killDetection = function(){
    if (this.alive && currentKillRadius > 0){
        // Compute distance to mouse cursor:
        var dist = (clickX - this.xpos)*(clickX - this.xpos) + 
                    (clickY - this.ypos)*(clickY - this.ypos);
        if (dist < MOUSE_KILL_RADIUS * MOUSE_KILL_RADIUS){ // Math.sqrt() is expensive.
            this.alive = false;
            this.timeKilled = Date.now();

            switch(this.type){
                case BLACK_BUG:
                    score += 5;
                    break;
                case RED_BUG:
                    score += 3;
                    break;
                case ORANGE_BUG:
                    score += 1;
                    break;
            }
        }
    }
}

/* Move towards the nearest piece of food. */
Bug.prototype.move = function(){
    if (this.alive){
        var curSmallestIndex = 0;
        var curShortestDist = Number.MAX_SAFE_INTEGER;

        // Find the nearest food item:
        for (var i = 0; i < NUM_FOODS; i++){
            if (!food[i].eaten){
                var dist = Math.sqrt((food[i].xpos - this.xpos)*(food[i].xpos - this.xpos) + 
                    (food[i].ypos - this.ypos)*(food[i].ypos - this.ypos));
                if (dist < curShortestDist){
                    curShortestDist = dist;
                    curSmallestIndex = i;
                }
            }
        }

        // Compute vector components:
        var xComponentNorm = (food[curSmallestIndex].xpos - this.xpos) / curShortestDist;
        var yComponentNorm = (food[curSmallestIndex].ypos - this.ypos) / curShortestDist;

        // Calculate rotation:
        var dirRads = Math.atan2((food[curSmallestIndex].xpos - this.xpos), (food[curSmallestIndex].ypos - this.ypos));
        this.rotation = Math.PI - dirRads;

        // Determine speed:
        var spd;
        if (gameLevel == 1){
            spd = this.speed;
        } else if (gameLevel == 2){
            spd = this.speed2;
        }

        // Animate the bug:
        if (this.animationStage < 6){ // Move legs forward sequentially.
            this.legPositions[this.animationStage] += spd * 2 * deltaTime;
            if (this.legPositions[this.animationStage] >= this.legPositionsMax[this.animationStage]){
                this.legPositions[this.animationStage] = this.legPositionsMax[this.animationStage];
                this.animationStage++;
            }
        } else if (this.animationStage < 12){ // Move legs backward sequentially.
            this.legPositions[11 - this.animationStage] -= spd * 2 * deltaTime;
            if (this.legPositions[11 - this.animationStage] <= this.legPositionsMin[11 - this.animationStage]){
                this.legPositions[11 - this.animationStage] = this.legPositionsMin[11 - this.animationStage];
                this.animationStage++;
            }
        } else if (this.animationStage >= 12){
            this.animationStage = 0;
        }

        // Eat the food if it's close enough:
        if (curShortestDist < FOOD_WIDTH){
            food[curSmallestIndex].eaten = true;
        }

        // Don't overlap with other bugs:
        // Find the closest bug and see if it's close enough to pass or stall behind:
        curSmallestIndex = 0;
        curShortestDist = Number.MAX_SAFE_INTEGER;
        for (var i = 0; i < bugs.length; i++){
            if (bugs[i].alive && bugs[i] != this){
                var dist = Math.sqrt((bugs[i].xpos - this.xpos)*(bugs[i].xpos - this.xpos) + 
                    (bugs[i].ypos - this.ypos)*(bugs[i].ypos - this.ypos));
                if (dist < curShortestDist){
                    curShortestDist = dist;
                    curSmallestIndex = i;
                }
            }
        }

        // Determine if another bug is closer than 36px and what to do about it.
        var waitBug = false;
        var passBug = false;
        var passDirection = -3.0;
        if (curShortestDist < 36){
            // Calculate rotation:
            dirRads = Math.atan2((bugs[curSmallestIndex].xpos - this.xpos), (bugs[curSmallestIndex].ypos - this.ypos));
                // There is a close bug in front of the current one.
                if (bugs[curSmallestIndex].type <= this.type){
                    // Bug is of the same or slower speed, so pass it.
                    if (bugs[curSmallestIndex].xpos < this.xpos){
                        passDirection = 4.0;
                    }
                    passBug = true;
                } else {
                    // Bug is faster, so this bug should wait.
                    waitBug = true;
                }
        }

        // Move the bug:
        if (!waitBug && !passBug){
            this.xpos += xComponentNorm * spd * deltaTime;
            this.ypos += yComponentNorm * spd * deltaTime;
        } else if (passBug){ // Move perpendicular to current direction.
            if (Math.abs(yComponentNorm) > Math.abs(xComponentNorm)){
                this.xpos += yComponentNorm * spd * deltaTime * passDirection;
                this.ypos += xComponentNorm * spd * deltaTime;
            } else {
                this.xpos += yComponentNorm * spd * deltaTime;
                this.ypos += xComponentNorm * spd * deltaTime * passDirection * -1.0;
            }
        }
    }
}

var Food = function(xpos, ypos){
    this.xpos = xpos;
    this.ypos = ypos;
    this.eaten = false;
}

/* Draw the food on the screen. */
Food.prototype.draw = function(){
    if (!this.eaten){
       ctx.drawImage(foodImg, this.xpos - FOOD_WIDTH/2, this.ypos - FOOD_WIDTH/2)
    }
}

/* Initialize the canvas element and the game variables. */
function initGame(){
    canvas = document.getElementById("main-canvas");
    canvas.addEventListener("mousedown", mouseDownListener); // Mouse detection.
    canvas.addEventListener("mouseup", mouseUpListener);     //
    canvas.addEventListener("mousemove",mouseMoveListener);  //
    canvas.addEventListener("touchstart", touchStartListener); // Touch detection.
    canvas.addEventListener("touchend", touchEndListener);     // 
    canvas.addEventListener("touchmove",touchMoveListener);    // 
    ctx = canvas.getContext("2d");
    startTime = Date.now();
    deltaTime = 0;
    currentscore1 = 0;
    currentscore2 = 0;
    currentKillRadius = 0;
    loadGameFinished = false;
    loadGameOver = false;
    mouseDown = false;

    // Load highscores from storage:
    highscore1 = localStorage.getItem("highscore1");
    highscore2 = localStorage.getItem("highscore2");

    startLevel(1);
    gameLoopTimer = setInterval(gameloop, 1000 / targetFps); // Run the game loop.
    return gameLoopTimer;
}

/* Assign/reset game variables based on level. */
function startLevel(level){
    levelAnimation = 0;
    score = 0;
    timeRemaining = 60;
    clearInterval(gameTimer);
    gameTimer = setInterval(timerFunction, 10);
    gameLevel = level;
    bugs = [];
    nextBugEntryTime = Date.now() + randInRange(1000, 3000); // 1-3 seconds from present.

    // Create the food:
    for (var i = 0; i < NUM_FOODS; i++){
        // Spawn food randomly on bottom 80% of viewport:
        food[i] = new Food(randInRange(10, w-10), randInRange(((h-40)/5) + 40, h-10));
    }
}

/* Handle each timer event, use 0.01 second increments for smoother counter. */
function timerFunction(){
    if (timeRemaining == 0){
        updateHighscore();
        if (gameLevel == 1){
            startLevel(2);
        } else if (gameLevel == 2){
            loadGameFinished = true;   
        }
    } else {
        if (!pause){
            timeRemaining-=0.01;
            timeRemaining = timeRemaining.toFixed(2);
        }
    }
}

/* This function is called if the user finishes level 2. */
function gameFinished(){
    $('.main-game').hide();
    $('.game-finished').show();
    $('#game-finished-scores').html(function(){
        return "Level 1 score: "+currentscore1+" (high: "+highscore1+")<br>"+
               "Level 2 score: "+currentscore2+" (high: "+highscore2+")<br><br><br>";
    });
    clearInterval(gameLoopTimer);
    clearInterval(gameTimer);
}

/* This function is called if all pieces of food are eaten by the bugs. */
function gameOver(){
    updateHighscore();
    $('.main-game').hide();
    $('.game-over').show();
    $('#game-over-scores').html(function(){
        return "Level 1 score: "+currentscore1+" (high: "+highscore1+")<br>"+
               "Level 2 score: "+currentscore2+" (high: "+highscore2+")<br><br><br>";
    });
    clearInterval(gameLoopTimer);
    clearInterval(gameTimer);
}

/* Update the highscore if applicable and save to local storage. */
function updateHighscore(){
        if (gameLevel == 1){
            currentscore1 = score;
            highscore1 = Math.max(highscore1, score);
            localStorage.setItem('highscore1', JSON.stringify(highscore1));
        } else if (gameLevel == 2){
            currentscore2 = score;
            highscore2 = Math.max(highscore2, score);
            localStorage.setItem('highscore2', JSON.stringify(highscore2));
        }
}

/* Draw a rectangle at x,y with width w, height h, and color c. */
function rect(x, y, w, h, c){
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.rect(x,y,w,h);
    ctx.closePath();
    ctx.fill();
}

/* Draw a circle with a black border iff border = true, at coords x,y,
   with radius r and color c. */
function circle(x, y, r, c, border){
    ctx.beginPath();
    ctx.fillStyle = c;
    ctx.strokeStyle = "#000000";
    ctx.arc(x, y, r, 0, 2*Math.PI);
    ctx.arc(x, y, r, 0, 2*Math.PI);
    if (border)
        ctx.stroke();
    ctx.fill();
}

/* Draw a black quadratic curve with a vertical bend from x,y to x2,y2. */
function quickQuadCurve(x, y, x2, y2){
    ctx.beginPath();
    ctx.strokeStyle = "#000000";
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x, y-5, x2, y2);
    ctx.stroke();
}

/* Draw a line of color c from x1,y1, to x2,y2. */
function line(x1, y1, x2, y2, c){
    ctx.beginPath();
    ctx.strokeStyle = c;
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
}

/* Draw text str at x,y, with size s, and color c. */
function text(str, x, y, s, c){
    ctx.fillStyle = c;
    ctx.font = s+"px Roboto";
    ctx.fillText(str, x, y);
}

/* Return a random integer between min and max inclusive.
   from: http://stackoverflow.com/questions/1527803/generating-random-numbers-in-javascript-in-a-specific-range */
function randInRange(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function mouseDownListener(event){
        event.preventDefault(); // Prevents the cursor from switching to the text selection one.
        mouseDown = true;
        clickX = mouseX;
        clickY = mouseY;
        currentKillRadius = 0;
}

function mouseUpListener(event){
    mouseDown = false;
}

function mouseMoveListener(event){
    var rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
}

function touchEndListener(event){
    event.preventDefault();
    // mouseDown = false;
}

function touchStartListener(event){
    event.preventDefault();
    currentKillRadius = 0;
    mouseDown = true;
    // Get coords:
    var rect = canvas.getBoundingClientRect();
    var touches = event.touches;
    for (var i = 0; i < touches.length; i++) {
        mouseX = touches[i].pageX - rect.left;
        mouseY = touches[i].pageY - rect.top;
    }
    clickX = mouseX;
    clickY = mouseY;
}

function touchMoveListener(event){
    event.preventDefault();
}

/* Clear the current frame, call before drawing. */
function clearScreen(){
    rect(0, 0, w, h, "#FFF");
}

/* The main game loop. */
function gameloop(){

    // Update deltaTime.
    var currentTime = Date.now();
    deltaTime = (currentTime - startTime) / 1000; // deltaTime is in seconds.
    startTime = currentTime;

    clearScreen();
    updateGame();
    renderFrame();

    if (loadGameFinished){
        gameFinished();
        clearScreen();  
    }
    if (loadGameOver){
        gameOver();
        clearScreen();     
    }
}

/* Do all processing for the game here: update positions, score, etc. */
function updateGame(){

    // Check for pause button clicks:
    if (mouseDown && mouseX > w/2 - 12 && mouseX < w/2 + 12 && mouseY > 8 && mouseY < 32){
        mouseDown = false;
        pause = !pause;
    }

    if (levelAnimation < 200){
        levelAnimation += 90 * deltaTime;
    }

    var foodsEaten = 0;
    for (var i = 0; i < NUM_FOODS; i++){
        if (food[i].eaten){
            foodsEaten++;
        }
    }
    if (foodsEaten >= NUM_FOODS){
        // All foods have been eaten, game over.
        loadGameOver = true;
    }

        if (mouseDown && currentKillRadius == 0 && mouseY > 40 && !pause){ // Animate the mouse click.
            currentKillRadius = Math.min(MOUSE_KILL_RADIUS, 200 * deltaTime);
        } else if (currentKillRadius > 0 && currentKillRadius < MOUSE_KILL_RADIUS + 20){
            var increaseRate = 400;
            if (currentKillRadius > MOUSE_KILL_RADIUS){
                increaseRate = 50;
            }
            currentKillRadius = Math.min(MOUSE_KILL_RADIUS + 20, currentKillRadius + (increaseRate * deltaTime));
        } else if (currentKillRadius >= MOUSE_KILL_RADIUS + 20){
            currentKillRadius = 0;
            mouseDown = false;
        }

    if (!pause){

        if (Date.now() >= nextBugEntryTime){ // Spawn a bug.
             // The next bug will spawn 1-3 seconds from now:
            nextBugEntryTime = Date.now() + randInRange(1000, 3000);

            // Choose the type of bug by probability:
            var selectNewBug = randInRange(1, 10);
            var newBugType;
            if (selectNewBug <= 3){        // Probability 0.3
                newBugType = BLACK_BUG;
            } else if (selectNewBug <= 6){ // Probability 0.3
                newBugType = RED_BUG;
            } else {                       // Probability 0.4
                newBugType = ORANGE_BUG; 
            }

            // Spawn bug randomly just off top of screen:
            // Viewport starts at 40px, so 10px is enough room for the bug to enter it smoothly.
            bugs.push(new Bug(newBugType, randInRange(10, 390), 10));
        }
        
        // Move all bugs:
        for (var i = 0; i < bugs.length; i++){
            bugs[i].move();
            bugs[i].killDetection();
        }

    }
}

/* Render the current frame. */
function renderFrame(){

    // Draw the food:
    for (var i = 0; i < NUM_FOODS; i++){
        food[i].draw();
    }

    // Draw the bugs:
    for (var i = 0; i < bugs.length; i++){
        bugs[i].draw();
    }

    // Draw mouse click:
    if (currentKillRadius > 0 && currentKillRadius < MOUSE_KILL_RADIUS){
        circle(clickX, clickY, currentKillRadius, "rgba(255, 0, 0, 0.5)", false);
    } else if (currentKillRadius >= MOUSE_KILL_RADIUS && currentKillRadius <= MOUSE_KILL_RADIUS + 20){
        circle(clickX, clickY, MOUSE_KILL_RADIUS, "rgba(255, 0, 0, "+ (50 - currentKillRadius) * 0.025 +")", false);
    }

    // Draw the info bar:
    rect(0, 0, w, 40, "#EEE");
    text("Score: " + score + "    Level: " + gameLevel, 10, 26, 18, "#000");
    text("Time: " + timeRemaining + "sec", w - 150, 26, 18, "#000");

    // Draw the pause button:
    if (!pause){
        ctx.drawImage(pauseImg, w/2 - 12, 8);
    } else {
        ctx.drawImage(playImg, w/2 - 12, 8);
    }

    // Draw the new level animation:
    if (levelAnimation < 50){
        text("Level " + gameLevel, -85 + levelAnimation*2, 78, 28, "rgb(240,0,0)");
    } else if (levelAnimation < 200){
        text("Level " + gameLevel, 15, 78, 28, "rgba(240,0,0," + (1.0 - (levelAnimation - 50)/150) + ")");
    }

}