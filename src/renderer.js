const { ipcRenderer } = require('electron');

// UI Elements
const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const albumArt = document.getElementById('album-art');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');
const themeToggle = document.getElementById('theme-toggle');

// Visualizer setup
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
let isPlaying = false;
let currentPosition = 0;
let totalDuration = 1;
let lastKnownTitle = '';

// Initialize Canvas
function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const progCanvas = document.getElementById('progress-bar');
    if (progCanvas) {
        progCanvas.width = progCanvas.offsetWidth;
        progCanvas.height = progCanvas.offsetHeight;
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Progress Bar Setup
const progCanvas = document.getElementById('progress-bar');
const pCtx = progCanvas.getContext('2d');
let wavePhase = 0;

let serverPosition = 0;
let lastUpdateTime = Date.now();

function drawProgressBar() {
    pCtx.clearRect(0, 0, progCanvas.width, progCanvas.height);
    
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    const activeColor = isLightMode ? 'rgba(29, 185, 84, 0.8)' : 'rgba(29, 185, 84, 0.9)';
    const inactiveColor = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)';
    
    // Accurate client-side interpolation: take the last known server position and
    // add the real elapsed time since that update (only when playing).
    // We skip the slow ease factor so the bar stays in sync with the actual player.
    let estimatedPosition = serverPosition;
    if (isPlaying) {
        estimatedPosition += (Date.now() - lastUpdateTime) / 1000;
    }
    // Snap directly to the estimated position — no lazy ease
    currentPosition = estimatedPosition;
    if (currentPosition < 0) currentPosition = 0;
    if (currentPosition > totalDuration) currentPosition = totalDuration;

    const progressRatio = totalDuration > 0 ? (currentPosition / totalDuration) : 0;
    const progressWidth = progCanvas.width * progressRatio;
    
    if (isPlaying) wavePhase += 0.15;
    
    const amplitude = 3;
    const frequency = 0.1;
    
    // Helper to get Y coordinate for sine wave
    const getY = (x) => (progCanvas.height / 2) + (isPlaying ? Math.sin((x * frequency) + wavePhase) * amplitude : 0);
    const endY = getY(progressWidth);

    // Draw the green played wave
    pCtx.beginPath();
    pCtx.strokeStyle = activeColor;
    pCtx.lineWidth = 2;
    for (let x = 0; x <= Math.floor(progressWidth); x++) {
        const y = getY(x);
        if (x === 0) pCtx.moveTo(x, y);
        else pCtx.lineTo(x, y);
    }
    pCtx.lineTo(progressWidth, endY);
    pCtx.stroke();
    
    // Draw the gray unplayed wave
    pCtx.beginPath();
    pCtx.strokeStyle = inactiveColor;
    pCtx.moveTo(progressWidth, endY);
    for (let x = Math.ceil(progressWidth); x <= progCanvas.width; x++) {
        pCtx.lineTo(x, getY(x));
    }
    pCtx.stroke();
    
    // Draw the dot
    pCtx.beginPath();
    pCtx.fillStyle = isLightMode ? 'rgba(29, 185, 84, 1)' : 'rgba(29, 185, 84, 1)';
    pCtx.arc(progressWidth, endY, 4, 0, Math.PI * 2);
    pCtx.fill();
    
    requestAnimationFrame(drawProgressBar);
}
drawProgressBar();

// Simulated Audio Visualizer (Bars)
const numBars = 12;
const bars = Array.from({ length: numBars }, () => ({
    targetHeight: Math.random() * 100,
    currentHeight: 10,
    speed: Math.random() * 0.1 + 0.05
}));

function drawVisualizer() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = (canvas.width / numBars) - 1;
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    ctx.fillStyle = isLightMode ? 'rgba(29, 185, 84, 0.8)' : 'rgba(29, 185, 84, 0.9)'; // Spotify Green
    
    for (let i = 0; i < numBars; i++) {
        const bar = bars[i];
        
        if (isPlaying) {
            // Update target randomly if playing
            if (Math.abs(bar.currentHeight - bar.targetHeight) < 5) {
                bar.targetHeight = Math.random() * canvas.height;
            }
        } else {
            // Settle to low level when paused
            bar.targetHeight = 2;
        }
        
        // Smooth transition
        bar.currentHeight += (bar.targetHeight - bar.currentHeight) * bar.speed;
        
        // Draw
        const x = i * (barWidth + 1);
        const y = canvas.height - bar.currentHeight;
        
        // Rounded top
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, bar.currentHeight, [2, 2, 0, 0]);
        ctx.fill();
    }
    
    requestAnimationFrame(drawVisualizer);
}
drawVisualizer();

let lastClickTime = 0;

// IPC Listeners
ipcRenderer.on('media-update', (event, mediaData) => {
    trackTitle.textContent = mediaData.title || 'Unknown Title';
    trackArtist.textContent = mediaData.artist || 'Unknown Artist';
    
    if (mediaData.albumArt) {
        albumArt.src = mediaData.albumArt;
    } else {
        albumArt.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2NjY2NjIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTkgMThWNWwxMi0ydjEzIi8+PGNpcmNsZSBjeD0iNiIgY3k9IjE4IiByPSIzIi8+PGNpcmNsZSBjeD0iMTgiIGN5PSIxNiIgcj0iMyIvPjwvc3ZnPg==";
    }
    
    // Only update play state if a click didn't happen in the last 1500ms
    if (Date.now() - lastClickTime > 1500) {
        // 4 = Playing
        isPlaying = mediaData.status === 4;
        
        if (isPlaying) {
            iconPlay.style.display = 'none';
            iconPause.style.display = 'block';
        } else {
            iconPlay.style.display = 'block';
            iconPause.style.display = 'none';
        }
    }
    
    // Sync position and duration from server.
    // If the track changed, reset interpolation state to avoid stale position bleeding.
    if (mediaData.title !== lastKnownTitle) {
        lastKnownTitle = mediaData.title;
        serverPosition = 0;
        currentPosition = 0;
        lastUpdateTime = Date.now();
    }
    if (mediaData.duration) totalDuration = mediaData.duration;
    if (mediaData.position !== undefined) {
        // Only accept the server value if it is close to our local estimate
        // (within 3 seconds), otherwise snap immediately to correct drift.
        const localEstimate = serverPosition + (Date.now() - lastUpdateTime) / 1000;
        const diff = Math.abs(mediaData.position - localEstimate);
        if (diff > 3) {
            // Big jump: snap immediately (seek happened or first update)
            currentPosition = mediaData.position;
        }
        serverPosition = mediaData.position;
        lastUpdateTime = Date.now();
    }
});

// Control Events
btnPlayPause.addEventListener('click', () => {
    lastClickTime = Date.now();
    ipcRenderer.send('media-control', 'play-pause');
    // Optimistic UI update
    isPlaying = !isPlaying;
    iconPlay.style.display = isPlaying ? 'none' : 'block';
    iconPause.style.display = isPlaying ? 'block' : 'none';
});

btnPrev.addEventListener('click', () => {
    ipcRenderer.send('media-control', 'prev');
});

btnNext.addEventListener('click', () => {
    ipcRenderer.send('media-control', 'next');
});

// Theme Toggle
const themes = ['dark', 'light', 'translucent', 'transparent'];
themeToggle.addEventListener('click', () => {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme');
    const nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
    root.setAttribute('data-theme', themes[nextIndex]);
});

// Mute Toggle
const btnMute = document.getElementById('btn-mute');
const iconVolUp = document.getElementById('icon-vol-up');
const iconVolMute = document.getElementById('icon-vol-mute');
let isMuted = false;

btnMute.addEventListener('click', () => {
    ipcRenderer.send('media-control', 'mute');
    isMuted = !isMuted;
    iconVolUp.style.display = isMuted ? 'none' : 'block';
    iconVolMute.style.display = isMuted ? 'block' : 'none';
});

// Close Button
const btnClose = document.getElementById('btn-close');
btnClose.addEventListener('click', () => {
    ipcRenderer.send('quit-app');
});
