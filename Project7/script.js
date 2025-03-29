// DOM elements
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const modeBtns = document.querySelectorAll('.mode-btn');
const particlesContainer = document.getElementById('particles');

// Audio context variables
let audioContext;
let analyser;
let microphone;
let dataArray;
let isVisualizing = false;
let animationId;
let currentMode = 'bars';

// Particle variables
let particles = [];
const PARTICLE_COUNT = 100;

// Resize canvas to fit container
function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

// Initialize audio context
async function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        startBtn.disabled = true;
        stopBtn.disabled = false;
        isVisualizing = true;
        
        visualize();
    } catch(error) {
        console.error('Error accessing microphone:', error);
        alert('Could not access microphone. Please ensure you have granted permission.');
    }
}

// Stop audio visualization
function stopAudio() {
    if(microphone && audioContext) {
        microphone.disconnect();
        cancelAnimationFrame(animationId);
        if(audioContext.state !== 'closed') {
            audioContext.close();
        }
    }
    
    startBtn.disabled = false;
    stopBtn.disabled = true;
    isVisualizing = false;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Create particles
function createParticles() {
    particles = [];
    for(let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 1,
            speed: Math.random() * 2 + 1,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            frequencyIndex: Math.floor(Math.random() * 32)
        });
    }
}

// Visualization functions
function drawBars() {
    const barWidth = canvas.width / dataArray.length * 2.5;
    let x = 0;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for(let i = 0; i < dataArray.length; i++) {
        const barHeight = dataArray[i] / 255 * canvas.height;
        
        const hue = i / dataArray.length * 360;
        ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
        
        ctx.fillRect(
            x, 
            canvas.height - barHeight, 
            barWidth, 
            barHeight
        );
        
        x += barWidth + 1;
    }
}

function drawWave() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#6c63ff';
    ctx.beginPath();
    
    const sliceWidth = canvas.width / dataArray.length;
    let x = 0;
    
    for(let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 255;
        const y = v * canvas.height;
        
        if(i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
    }
    
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
}

function drawCircle() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.4;
    
    ctx.lineWidth = 2;
    
    for(let i = 0; i < dataArray.length; i++) {
        const amplitude = dataArray[i] / 255;
        const angle = (i / dataArray.length) * Math.PI * 2;
        const hue = i / dataArray.length * 360;
        
        ctx.strokeStyle = `hsl(${hue}, 80%, 50%)`;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + Math.cos(angle) * radius * (1 + amplitude * 0.5),
            centerY + Math.sin(angle) * radius * (1 + amplitude * 0.5)
        );
        ctx.stroke();
    }
}

function drawParticles() {
    analyser.getByteFrequencyData(dataArray);
    
    // Clear with semi-transparent background for trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(particle => {
        const amplitude = dataArray[particle.frequencyIndex] / 255;
        
        // Update particle position
        particle.x += particle.speed;
        particle.y += (amplitude - 0.5) * 5;
        
        // Wrap around screen
        if(particle.x > canvas.width) particle.x = 0;
        if(particle.x < 0) particle.x = canvas.width;
        if(particle.y > canvas.height) particle.y = 0;
        if(particle.y < 0) particle.y = canvas.height;
        
        // Draw particle
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(
            particle.x, 
            particle.y, 
            particle.size * (1 + amplitude), 
            0, 
            Math.PI * 2
        );
        ctx.fill();
    });
}

// Main visualization loop
function visualize() {
    if(!isVisualizing) return;
    
    analyser.getByteFrequencyData(dataArray);
    
    switch(currentMode) {
        case 'bars':
            drawBars();
            break;
        case 'wave':
            drawWave();
            break;
        case 'circle':
            drawCircle();
            break;
        case 'particles':
            drawParticles();
            break;
    }
    
    animationId = requestAnimationFrame(visualize);
}

// Event listeners
startBtn.addEventListener('click', initAudio);
stopBtn.addEventListener('click', stopAudio);

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        
        if(currentMode === 'particles') {
            createParticles();
        }
    });
});

window.addEventListener('resize', () => {
    resizeCanvas();
    if(currentMode === 'particles') {
        createParticles();
    }
});

// Initialize
resizeCanvas();
createParticles();