document.addEventListener('DOMContentLoaded', function() {
    // Audio player
    const audioPlayer = new Audio();
    let currentSongIndex = 0;
    let isPlaying = false;
    
    // Song data - using free sample audio files
    const songs = [
        {
            title: "Top 50 - Global",
            artist: "Various Artists",
            cover: "./assets/card1img.jpeg",
            file: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        },
        {
            title: "Mahiye jinna Sohna",
            artist: "Darshan Raval",
            cover: "./assets/card2img.jpeg",
            file: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
        },
        {
            title: "Mere paas tum ho",
            artist: "Arijit Singh",
            cover: "./assets/card3img.jpeg",
            file: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
        },
        {
            title: "Night Changes",
            artist: "One Direction",
            cover: "./assets/album_picture.jpeg",
            file: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
        }
    ];

    // DOM Elements - using more reliable selectors
    const playPauseBtn = document.querySelector('.play-control-icon[src*="player_icon3"]');
    const prevBtn = document.querySelector('.play-control-icon[src*="player_icon2"]');
    const nextBtn = document.querySelector('.play-control-icon[src*="player_icon4"]');
    const progressBar = document.querySelector('.progress-bar');
    const currentTimeEl = document.querySelector('.curr-time');
    const totalTimeEl = document.querySelector('.tot-time');
    const albumImg = document.querySelector('.album-img');
    const albumTitle = document.querySelector('.album-title');
    const albumArtist = document.querySelector('.album-des');
    const cards = document.querySelectorAll('.card');
    const volumeBar = document.querySelector('.vol-bar');

    // Debugging: Log elements to console
    console.log('Player elements:', {
        playPauseBtn,
        prevBtn,
        nextBtn,
        progressBar,
        currentTimeEl,
        totalTimeEl,
        albumImg,
        albumTitle,
        albumArtist,
        cards,
        volumeBar
    });

    // Initialize player
    function loadSong(index) {
        if (index < 0 || index >= songs.length) return;
        
        currentSongIndex = index;
        const song = songs[index];
        
        console.log('Loading song:', song);
        
        audioPlayer.src = song.file;
        if (albumImg) albumImg.src = song.cover;
        if (albumTitle) albumTitle.textContent = song.title;
        if (albumArtist) albumArtist.textContent = song.artist;
        
        // Update active card
        cards.forEach((card, i) => {
            card.classList.toggle('active', i === index);
        });
    }

    // Play/Pause toggle
    function togglePlay() {
        if (isPlaying) {
            pauseSong();
        } else {
            playSong();
        }
    }

    function playSong() {
        if (audioPlayer.src) {
            isPlaying = true;
            audioPlayer.play()
                .then(() => {
                    // Just add visual feedback without changing icon
                    playPauseBtn.style.opacity = "1";
                    playPauseBtn.style.boxShadow = "0 0 10px #1DB954";
                });
        }
    }

    function pauseSong() {
        isPlaying = false;
        audioPlayer.pause();
        // Return to normal state
        playPauseBtn.style.opacity = "0.8";
        playPauseBtn.style.boxShadow = "none";
    }


    // Next song
    function nextSong() {
        loadSong((currentSongIndex + 1) % songs.length);
        if (isPlaying) playSong();
    }

    // Previous song
    function prevSong() {
        loadSong((currentSongIndex - 1 + songs.length) % songs.length);
        if (isPlaying) playSong();
    }

    // Update progress bar
    function updateProgress() {
        const { currentTime, duration } = audioPlayer;
        const progressPercent = duration ? (currentTime / duration) * 100 : 0;
        if (progressBar) progressBar.value = progressPercent;
        
        // Update time display
        if (currentTimeEl) currentTimeEl.textContent = formatTime(currentTime);
        if (totalTimeEl && duration) totalTimeEl.textContent = formatTime(duration);
    }

    // Set progress when user clicks on progress bar
    function setProgress(e) {
        if (!progressBar) return;
        
        const width = progressBar.clientWidth;
        const clickX = e.offsetX;
        const duration = audioPlayer.duration;
        
        if (duration) {
            audioPlayer.currentTime = (clickX / width) * duration;
        }
    }

    // Format time in mm:ss
    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // Set volume
    function setVolume() {
        if (volumeBar && audioPlayer) {
            audioPlayer.volume = volumeBar.value / 100;
        }
    }

    // Event listeners with checks
    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlay);
    if (nextBtn) nextBtn.addEventListener('click', nextSong);
    if (prevBtn) prevBtn.addEventListener('click', prevSong);
    
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', nextSong);
    audioPlayer.addEventListener('error', (e) => {
        console.error('Audio error:', e);
    });
    
    if (progressBar) progressBar.addEventListener('click', setProgress);
    if (volumeBar) volumeBar.addEventListener('input', setVolume);

    // Card click events
    cards.forEach((card, index) => {
        card.addEventListener('click', () => {
            loadSong(index);
            playSong();
        });
    });

    // Initialize with first song
    loadSong(0);
    
    // Debugging: Expose player to console
    window.player = {
        audioPlayer,
        songs,
        currentSongIndex,
        isPlaying,
        playSong,
        pauseSong,
        nextSong,
        prevSong,
        loadSong
    };
});