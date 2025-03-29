const canvas = document.getElementById('game');
        const ctx = canvas.getContext('2d');
        const scoreElement = document.getElementById('score');
        const gameOverElement = document.getElementById('game-over');
        const finalScoreElement = document.getElementById('final-score');
        const restartBtn = document.getElementById('restart-btn');
        
        // Game variables
        let score = 0;
        let gameSpeed = 5;
        let isGameOver = false;
        let animationId;
        
        // Dino variables
        const dino = {
            x: 50,
            y: 150,
            width: 40,
            height: 50,
            velocityY: 0,
            gravity: 0.8,
            jumpForce: -15,
            isJumping: false,
            frame: 0
        };
        
        // Cactus variables
        const cacti = [];
        let cactusSpawnTimer = 0;
        const cactusSpawnInterval = 1500; // milliseconds
        
        // Ground variables
        const ground = {
            x: 0,
            y: 180,
            width: canvas.width,
            height: 20
        };
        
        // Game loop
        function gameLoop() {
            if(isGameOver) return;
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Update and draw ground
            ground.x -= gameSpeed;
            if(ground.x <= -canvas.width) ground.x = 0;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(ground.x, ground.y, ground.width, ground.height);
            ctx.fillRect(ground.x + ground.width, ground.y, ground.width, ground.height);
            
            // Update and draw dino
            dino.y += dino.velocityY;
            dino.velocityY += dino.gravity;
            
            // Ground collision
            if(dino.y >= 150) {
                dino.y = 150;
                dino.velocityY = 0;
                dino.isJumping = false;
            }
            
            // Draw dino
            ctx.fillStyle = '#333';
            ctx.fillRect(dino.x, dino.y, dino.width, dino.height);
            
            // Draw eye (to make it cute)
            ctx.fillStyle = 'white';
            ctx.fillRect(dino.x + 25, dino.y + 10, 8, 8);
            
            // Spawn cacti
            cactusSpawnTimer += 16; // approx 60fps
            if(cactusSpawnTimer >= cactusSpawnInterval) {
                spawnCactus();
                cactusSpawnTimer = 0;
                
                // Increase game speed slightly
                gameSpeed += 0.1;
            }
            
            // Update and draw cacti
            for(let i = 0; i < cacti.length; i++) {
                cacti[i].x -= gameSpeed;
                
                // Draw cactus
                ctx.fillStyle = '#2e8b57';
                ctx.fillRect(cacti[i].x, cacti[i].y, cacti[i].width, cacti[i].height);
                
                // Collision detection
                if(
                    dino.x < cacti[i].x + cacti[i].width &&
                    dino.x + dino.width > cacti[i].x &&
                    dino.y < cacti[i].y + cacti[i].height &&
                    dino.y + dino.height > cacti[i].y
                ) {
                    gameOver();
                }
                
                // Remove cacti that are off screen
                if(cacti[i].x + cacti[i].width < 0) {
                    cacti.splice(i, 1);
                    i--;
                    score++;
                    scoreElement.textContent = score;
                }
            }
            
            animationId = requestAnimationFrame(gameLoop);
        }
        
        function spawnCactus() {
            const height = 30 + Math.random() * 30;
            cacti.push({
                x: canvas.width,
                y: ground.y - height,
                width: 20,
                height: height
            });
        }
        
        function jump() {
            if(!dino.isJumping) {
                dino.velocityY = dino.jumpForce;
                dino.isJumping = true;
            }
        }
        
        function gameOver() {
            isGameOver = true;
            cancelAnimationFrame(animationId);
            finalScoreElement.textContent = `Score: ${score}`;
            gameOverElement.style.display = 'block';
        }
        
        function restartGame() {
            isGameOver = false;
            score = 0;
            gameSpeed = 5;
            cacti.length = 0;
            cactusSpawnTimer = 0;
            dino.y = 150;
            dino.velocityY = 0;
            dino.isJumping = false;
            scoreElement.textContent = '0';
            gameOverElement.style.display = 'none';
            gameLoop();
        }
        
        // Event listeners
        document.addEventListener('keydown', (e) => {
            if(e.code === 'Space') {
                e.preventDefault();
                jump();
            }
        });
        
        canvas.addEventListener('click', jump);
        restartBtn.addEventListener('click', restartGame);
        
        // Start game
        gameLoop();