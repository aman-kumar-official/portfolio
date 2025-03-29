// DOM elements
const gridContainer = document.getElementById('pixel-grid');
const colorPicker = document.getElementById('color-picker');
const gridSizeSelect = document.getElementById('grid-size');
const brushSizeSelect = document.getElementById('brush-size');
const fillBtn = document.getElementById('fill-btn');
const clearBtn = document.getElementById('clear-btn');
const saveBtn = document.getElementById('save-btn');

// Current settings
let currentColor = colorPicker.value;
let currentBrushSize = parseInt(brushSizeSelect.value);
let isDrawing = false;

// Initialize grid
function createGrid(size) {
    gridContainer.innerHTML = '';
    gridContainer.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    
    for(let i = 0; i < size * size; i++) {
        const pixel = document.createElement('div');
        pixel.className = 'pixel';
        pixel.dataset.colored = 'false';
        
        // Drawing events
        pixel.addEventListener('mousedown', startDrawing);
        pixel.addEventListener('mouseenter', draw);
        pixel.addEventListener('mouseup', stopDrawing);
        
        // For touch devices
        pixel.addEventListener('touchstart', startDrawing);
        pixel.addEventListener('touchmove', handleTouchMove);
        
        gridContainer.appendChild(pixel);
    }
}

// Drawing functions
function startDrawing(e) {
    e.preventDefault();
    isDrawing = true;
    draw(e);
}

function draw(e) {
    if(!isDrawing) return;
    
    let pixel;
    if(e.type.includes('touch')) {
        const touch = e.touches[0];
        pixel = document.elementFromPoint(touch.clientX, touch.clientY);
    } else {
        pixel = e.target;
    }
    
    if(pixel && pixel.classList.contains('pixel')) {
        const size = currentBrushSize;
        const index = Array.from(gridContainer.children).indexOf(pixel);
        const gridSize = parseInt(gridSizeSelect.value);
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        
        // Color pixels based on brush size
        for(let r = Math.max(0, row - Math.floor(size/2)); r <= Math.min(gridSize-1, row + Math.floor(size/2)); r++) {
            for(let c = Math.max(0, col - Math.floor(size/2)); c <= Math.min(gridSize-1, col + Math.floor(size/2)); c++) {
                const pixelIndex = r * gridSize + c;
                const pixelToColor = gridContainer.children[pixelIndex];
                pixelToColor.style.backgroundColor = currentColor;
                pixelToColor.dataset.colored = 'true';
            }
        }
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const pixel = document.elementFromPoint(touch.clientX, touch.clientY);
    if(pixel && pixel.classList.contains('pixel')) {
        draw({...e, target: pixel});
    }
}

function stopDrawing() {
    isDrawing = false;
}

// Tool functions
function fillAll() {
    const pixels = document.querySelectorAll('.pixel');
    pixels.forEach(pixel => {
        pixel.style.backgroundColor = currentColor;
        pixel.dataset.colored = 'true';
    });
}

function clearGrid() {
    const pixels = document.querySelectorAll('.pixel');
    pixels.forEach(pixel => {
        pixel.style.backgroundColor = '';
        pixel.dataset.colored = 'false';
    });
}

function saveAsPNG() {
    // Create a temporary canvas
    const canvas = document.createElement('canvas');
    const size = parseInt(gridSizeSelect.value);
    const pixelSize = 25; // Match CSS pixel size
    canvas.width = size * pixelSize;
    canvas.height = size * pixelSize;
    const ctx = canvas.getContext('2d');
    
    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw each pixel
    const pixels = document.querySelectorAll('.pixel');
    pixels.forEach((pixel, index) => {
        if(pixel.dataset.colored === 'true') {
            const row = Math.floor(index / size);
            const col = index % size;
            ctx.fillStyle = pixel.style.backgroundColor || 'white';
            ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
        }
    });
    
    // Create download link
    const link = document.createElement('a');
    link.download = 'pixel-art.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Event listeners
colorPicker.addEventListener('input', () => {
    currentColor = colorPicker.value;
});

gridSizeSelect.addEventListener('change', () => {
    createGrid(parseInt(gridSizeSelect.value));
});

brushSizeSelect.addEventListener('change', () => {
    currentBrushSize = parseInt(brushSizeSelect.value);
});

fillBtn.addEventListener('click', fillAll);
clearBtn.addEventListener('click', clearGrid);
saveBtn.addEventListener('click', saveAsPNG);

// Prevent scrolling on touch devices
document.addEventListener('touchmove', (e) => {
    if(isDrawing) e.preventDefault();
}, { passive: false });

// Initialize
createGrid(16);