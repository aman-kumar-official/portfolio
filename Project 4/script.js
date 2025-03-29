const cards = ['🍎', '🍌', '🍒', '🍓', '🍊', '🍋', '🍉', '🍇'];
const gameBoard = document.getElementById('game-board');
const movesDisplay = document.getElementById('moves');
const timeDisplay = document.getElementById('time');
const restartBtn = document.getElementById('restart-btn');

let hasFlippedCard = false;
let lockBoard = false;
let firstCard, secondCard;
let moves = 0;
let matchedPairs = 0;
let startTime;
let timer;

// Duplicate cards to create pairs
const gameCards = [...cards, ...cards];

function shuffleCards() {
    return gameCards.sort(() => Math.random() - 0.5);
}

function createBoard() {
    const shuffledCards = shuffleCards();
    
    gameBoard.innerHTML = '';
    shuffledCards.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.dataset.card = card;
        cardEl.dataset.index = index;
        
        cardEl.innerHTML = `
            <div class="card-face card-front">${card}</div>
            <div class="card-face card-back"></div>
        `;
        
        cardEl.addEventListener('click', flipCard);
        gameBoard.appendChild(cardEl);
    });
}

function flipCard() {
    if(lockBoard) return;
    if(this === firstCard) return;
    
    this.classList.add('flipped');
    
    if(!hasFlippedCard) {
        // First click
        hasFlippedCard = true;
        firstCard = this;
        return;
    }
    
    // Second click
    secondCard = this;
    moves++;
    movesDisplay.textContent = moves;
    
    checkForMatch();
}

function checkForMatch() {
    const isMatch = firstCard.dataset.card === secondCard.dataset.card;
    
    if(isMatch) {
        disableCards();
        matchedPairs++;
        
        if(matchedPairs === cards.length) {
            clearInterval(timer);
            celebrateWin();
        }
    } else {
        unflipCards();
    }
}

function disableCards() {
    firstCard.removeEventListener('click', flipCard);
    secondCard.removeEventListener('click', flipCard);
    firstCard.classList.add('matched');
    secondCard.classList.add('matched');
    
    resetBoard();
}

function unflipCards() {
    lockBoard = true;
    
    setTimeout(() => {
        firstCard.classList.remove('flipped');
        secondCard.classList.remove('flipped');
        
        resetBoard();
    }, 1000);
}

function resetBoard() {
    [hasFlippedCard, lockBoard] = [false, false];
    [firstCard, secondCard] = [null, null];
}

function startTimer() {
    startTime = Date.now();
    timer = setInterval(() => {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        timeDisplay.textContent = elapsedTime;
    }, 1000);
}

function celebrateWin() {
    document.querySelectorAll('.card').forEach(card => {
        card.classList.add('celebrate');
    });
}

function restartGame() {
    clearInterval(timer);
    moves = 0;
    matchedPairs = 0;
    movesDisplay.textContent = '0';
    timeDisplay.textContent = '0';
    resetBoard();
    createBoard();
    startTimer();
}

restartBtn.addEventListener('click', restartGame);

// Initialize game
createBoard();
startTimer();