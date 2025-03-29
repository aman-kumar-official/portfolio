let gameSeq = [];
let userSeq = [];
let btns = ["red", "yellow", "blue", "green"];

let start = false;
let level = 0;

let h2 = document.querySelector("h2");

document.addEventListener("keypress", function() {
    if (start == false) {
        console.log("Game Started"); 
        start = true;
        levelUp();
    }
});

function gameFls(btn) {
    btn.classList.add("userflash");
    setTimeout(function () {
        btn.classList.remove("userflash");
    }, 250);
    
    // Add sound effect
    playSound(btn.getAttribute("id"));
}

function userFlash(btn) {
    btn.classList.add("flash");
    setTimeout(function () {
        btn.classList.remove("flash");
    }, 250);
    
    // Add sound effect
    playSound(btn.getAttribute("id"));
}

function levelUp() {
    userSeq = [];
    level++;
    h2.innerText = `Level ${level}`;
    
    let rndmIdx = Math.floor(Math.random() * 4);
    let rndmColor = btns[rndmIdx];
    let rndmBtn = document.querySelector(`.${rndmColor}`);
    gameSeq.push(rndmColor);
    console.log(gameSeq);
    gameFls(rndmBtn);
}

function check(idx) {
    if(userSeq[idx] === gameSeq[idx]) {
        if(userSeq.length == gameSeq.length) {
            setTimeout(levelUp, 1000);
        }
    } else {
        h2.innerHTML = `Game Over! Your score was <b>${level}</b> <br> Press any key to restart`;
        document.querySelector("body").classList.add("game-over");
        document.querySelector("body").style.backgroundColor = "#ff3333";
        setTimeout(function() {
            document.querySelector("body").style.backgroundColor = "";
            document.querySelector("body").classList.remove("game-over");
        }, 500);
        playSound("wrong");
        reset();
    }
}

function btnPress() {
    if (!start) return;
    
    let btn = this;
    userFlash(btn);
    userColor = btn.getAttribute("id");
    userSeq.push(userColor);
    check(userSeq.length-1);
}

let allBtns = document.querySelectorAll(".btn");
for (btn of allBtns) {
    btn.addEventListener("click", btnPress);
}

function reset() {
    start = false;
    gameSeq = [];
    userSeq = [];
    level = 0;
}

function playSound(color) {
    let sound;
    switch(color) {
        case "red":
            sound = new Audio("https://www.soundjay.com/buttons/sounds/button-09.mp3");
            break;
        case "yellow":
            sound = new Audio("https://www.soundjay.com/buttons/sounds/button-10.mp3");
            break;
        case "green":
            sound = new Audio("https://www.soundjay.com/buttons/sounds/button-21.mp3");
            break;
        case "blue":
            sound = new Audio("https://www.soundjay.com/buttons/sounds/button-23.mp3");
            break;
        case "wrong":
            sound = new Audio("https://www.soundjay.com/buttons/sounds/button-08.mp3");
            break;
        default:
            return;
    }
    sound.volume = 0.3;
    sound.play();
}