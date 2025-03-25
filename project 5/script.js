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
    }, 250)
}

function userFlash(btn) {
    btn.classList.add("flash");
    setTimeout(function () {
        btn.classList.remove("flash");
    }, 250)
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
    if(userSeq[idx] === gameSeq[idx])
        {
            if(userSeq.length == gameSeq.length) {
                setTimeout(levelUp, 500);
            }
        }
    else 
        {
            h2.innerHTML = `Game Over! Your score was <b>${level}</b> <br> Press any key to start`;
            document.querySelector("body").style.backgroundColor = "red";
            setTimeout(function() {
                document.querySelector("body").style.backgroundColor = "white";
            }, 150);
            reset();
        }
}

function btnPress() {
    let btn = this;
    gameFls(btn);
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