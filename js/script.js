console.log('Lets write JavaScript');
let currentSong = new Audio();
let songs;
let currFolder;

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

let getSongs = async function(folder) {
    currFolder = folder;
    try {
        // First try to get tracks.json
        let response = await fetch(`${folder}/tracks.json`);
        if (response.ok) {
            songs = await response.json();
            return songs;
        }
        
        // If tracks.json doesn't exist, try to get directory listing
        let a = await fetch(`${folder}/?_=${Date.now()}`, { 
            cache: 'no-store',
            headers: {
                'Accept': 'text/html'
            }
        });
        let response2 = await a.text();
        let div = document.createElement("div");
        div.innerHTML = response2;
        let as = div.getElementsByTagName("a");
        songs = [];
        for (let index = 0; index < as.length; index++) {
            const element = as[index];
            if (element.href.endsWith(".mp3")) {
                songs.push(element.href.split(`${folder}/`)[1]);
            }
        }
        return songs;
    } catch (error) {
        console.error('Error loading songs:', error);
        return [];
    }
};

// Store meta info for all playlists for quick access
window.playlistMeta = {};
// Store recently played playlists in order
window.recentPlaylists = [];

let playMusic = async (track, pause = false) => {
    try {
        currentSong.pause();
        currentSong.currentTime = 0;
        currentSong.src = `${currFolder}/${track}`;
        currentSongFile = track;
        
        if (!pause) {
            try {
                await currentSong.play();
                play.src = "img/pause.svg";
            } catch (playError) {
                console.warn('Initial play failed, retrying...', playError);
                // Retry once after a short delay
                setTimeout(async () => {
                    try {
                        await currentSong.play();
                        play.src = "img/pause.svg";
                    } catch (retryError) {
                        console.error('Play retry failed:', retryError);
                    }
                }, 1000);
            }
        }
        
        document.querySelector(".songinfo").innerHTML = decodeURIComponent(track).replace(/\.mp3$/, '');
        document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
        // --- Save session after song starts playing ---
        if (typeof saveSession === 'function' && typeof currFolder !== 'undefined' && typeof currentSongFile !== 'undefined' && typeof currentSong !== 'undefined') {
            saveSession(currFolder, currentSongFile, currentSong.currentTime);
        }
    } catch (err) {
        console.error('Audio play error:', err);
    }
};

// Helper to update sidebar playlists
function updateSidebarPlaylists() {
    const playlistsContainer = document.querySelector('.playlists');
    const recentlyPlayedSection = document.querySelector('.recently-played-section');
    playlistsContainer.innerHTML = '';
    if (window.recentPlaylists.length === 0) {
        recentlyPlayedSection.style.display = 'none';
        return;
    } else {
        recentlyPlayedSection.style.display = '';
    }
    window.recentPlaylists.forEach(folder => {
        const meta = window.playlistMeta[folder];
        if (!meta) return;
        const cover = meta.cover || 'cover.jpg';
        const title = meta.title || folder;
        const description = meta.description || '';
        playlistsContainer.innerHTML += `<div class="playlistItem" data-folder="songs/${folder}">
            <img src="songs/${folder}/${cover}" alt="${title} cover">
            <div class="info">
                <div class="title">${title}</div>
                <div class="description">${description}</div>
            </div>
        </div>`;
    });
    // Add click handlers for new playlist items
    Array.from(document.getElementsByClassName("playlistItem")).forEach(e => {
        e.addEventListener("click", async () => {
            const folder = e.dataset.folder;
            // If the same playlist is clicked twice, toggle play/pause
            if (currFolder === folder) {
                if (!currentSong.paused) {
                    currentSong.pause();
                    play.src = "img/play.svg";
                } else {
                    currentSong.play();
                    play.src = "img/pause.svg";
                }
                return;
            }
            currentSong.pause();
            songs = await getSongs(folder);
            highlightActivePlaylist(folder);
            if (songs.length) {
                await playMusic(songs[0], false);
                currentSongFile = songs[0];
                currentPlaylistSongs = songs;
            }
        });
    });
}

async function displayAlbums() {
    console.log("Displaying albums");
    let cardContainer = document.querySelector(".cardContainer");
    let playlistsContainer = document.querySelector(".playlists");
    cardContainer.innerHTML = "";
    playlistsContainer.innerHTML = "";

    // Show loading state
    cardContainer.innerHTML = '<div style="color:#b3b3b3;font-size:1.2rem;padding:40px;text-align:center;width:100%">Loading playlists...</div>';

    // Fetch the playlist index
    let anchors = [];
    try {
        let res = await fetch('songs/playlists.json');
        if (!res.ok) throw new Error('Failed to load playlists.json');
        anchors = await res.json();
    } catch (e) {
        console.error('Error loading playlists:', e);
        cardContainer.innerHTML = `<div style='color:#b3b3b3;font-size:1.2rem;padding:40px;text-align:center;width:100%'>No playlists found. Add folders to songs/ to create playlists!</div>`;
        return;
    }

    if (!anchors.length) {
        cardContainer.innerHTML = `<div style='color:#b3b3b3;font-size:1.2rem;padding:40px;text-align:center;width:100%'>No playlists found. Add folders to songs/ to create playlists!</div>`;
        return;
    }

    // Clear loading state
    cardContainer.innerHTML = "";
    playlistsContainer.innerHTML = "";

    for (const folder of anchors) {
        try {
            const metaRes = await fetch(`songs/${folder}/info.json`);
            if (!metaRes.ok) throw new Error('Missing info.json');
            const meta = await metaRes.json();
            const cover = meta.cover || 'cover.jpg';
            window.playlistMeta[folder] = meta;
            const title = meta.title || folder;
            const description = meta.description || '';

            // Add to main card container
            cardContainer.innerHTML += `<div data-folder="songs/${folder}" class="card playlistCard">
                <img src="songs/${folder}/${cover}" alt="${title} cover" class="playlist-cover">
                <div class="card-content">
                  <h2 class="playlist-title">${title}</h2>
                  <p class="playlist-desc">${description}</p>
                </div>
            </div>`;
        } catch (error) {
            console.warn(`Skipping folder "${folder}": ${error.message}`);
        }
    }

    // Add click handlers for cards
    Array.from(document.getElementsByClassName("playlistCard")).forEach(e => {
        e.addEventListener("click", async () => {
            e.classList.add("clicked");
            setTimeout(() => e.classList.remove("clicked"), 200);
            const folder = e.dataset.folder.replace('songs/', '');
            // If the same playlist is clicked twice, toggle play/pause
            if (currFolder === e.dataset.folder) {
                if (!currentSong.paused) {
            currentSong.pause();
                    play.src = "img/play.svg";
                } else {
                    currentSong.play();
                    play.src = "img/pause.svg";
                }
                return;
            }
            currentSong.pause();
            songs = await getSongs(e.dataset.folder);
            highlightActivePlaylist(e.dataset.folder);
            if (songs.length) {
                await playMusic(songs[0], false);
                currentSongFile = songs[0];
                currentPlaylistSongs = songs;
                // Add to recent playlists (top, no duplicates)
                window.recentPlaylists = [folder, ...window.recentPlaylists.filter(f => f !== folder)];
                updateSidebarPlaylists();
            }
        });
    });
}

// Add create playlist functionality
const createBtn = document.querySelector(".createPlaylistBtn");
if (createBtn) {
    createBtn.addEventListener("click", () => {
    // Here you would typically show a modal or form to create a new playlist
    // For now, we'll just log a message
    console.log("Create playlist clicked");
});
}

function highlightActivePlaylist(folder) {
    Array.from(document.getElementsByClassName('playlistItem')).forEach(e => {
        if (e.dataset.folder === folder) {
            e.classList.add('active');
        } else {
            e.classList.remove('active');
        }
    });
}

async function main() {
    let currentPlaylistSongs = [];
    let currentSongFile = '';
    await displayAlbums();

    // Playlist spotlight modal logic
    const playlistListBtn = document.querySelector('.playlist-list-btn');
    const playlistSpotlightOverlay = document.querySelector('.playlist-spotlight-overlay');
    const playlistSpotlightModal = document.querySelector('.playlist-spotlight-modal');
    const playlistSpotlightList = document.querySelector('.playlist-spotlight-list');
    const closePlaylistSpotlightBtn = document.querySelector('.close-playlist-spotlight');

    function showPlaylistSpotlightModal() {
        if (!currentPlaylistSongs.length) return;
        playlistSpotlightOverlay.style.display = 'block';
        playlistSpotlightModal.style.display = 'flex';
        setTimeout(() => {
            playlistSpotlightModal.style.opacity = 1;
            playlistSpotlightOverlay.style.opacity = 1;
        }, 10);
        renderPlaylistSpotlightList();
    }
    function hidePlaylistSpotlightModal() {
        playlistSpotlightModal.style.opacity = 0;
        playlistSpotlightOverlay.style.opacity = 0;
        setTimeout(() => {
            playlistSpotlightOverlay.style.display = 'none';
            playlistSpotlightModal.style.display = 'none';
        }, 200);
    }
    function renderPlaylistSpotlightList() {
        playlistSpotlightList.innerHTML = currentPlaylistSongs.map(song =>
            `<li class="${song === currentSongFile ? 'active' : ''}" data-file="${song}">
                <span>${decodeURIComponent(song).replace(/\.mp3$/, '')}</span>
            </li>`
        ).join('');
        Array.from(playlistSpotlightList.querySelectorAll('li')).forEach(li => {
            li.addEventListener('click', async function() {
                await playMusic(li.dataset.file, false);
                currentSongFile = li.dataset.file;
                renderPlaylistSpotlightList();
                hidePlaylistSpotlightModal();
            });
        });
    }
    if (playlistListBtn && playlistSpotlightOverlay && playlistSpotlightModal && playlistSpotlightList && closePlaylistSpotlightBtn) {
        playlistListBtn.addEventListener('click', showPlaylistSpotlightModal);
        closePlaylistSpotlightBtn.addEventListener('click', hidePlaylistSpotlightModal);
        playlistSpotlightOverlay.addEventListener('click', hidePlaylistSpotlightModal);
        document.addEventListener('keydown', function(e) {
            if (playlistSpotlightModal.style.display === 'flex' && e.key === 'Escape') hidePlaylistSpotlightModal();
        });
    }

    // Override getSongs and playMusic at the end, then call for default playlist
    const originalPlayMusic = playMusic;
    playMusic = async function(track, pause = false) {
        currentSongFile = track;
        await originalPlayMusic(track, pause);
        renderPlaylistSpotlightList();
    };
    const originalGetSongs = getSongs;
    getSongs = async function(folder) {
        const result = await originalGetSongs(folder);
        currentPlaylistSongs = result;
        return result;
    };

    play.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play();
            play.src = "img/pause.svg";
        } else {
            currentSong.pause();
            play.src = "img/play.svg";
        }
    });

    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
        document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
    });

    document.querySelector(".seekbar").addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = (currentSong.duration * percent) / 100;
        // Save session after seeking
        if (typeof saveSession === 'function' && typeof currFolder !== 'undefined' && typeof currentSongFile !== 'undefined' && typeof currentSong !== 'undefined') {
            saveSession(currFolder, currentSongFile, currentSong.currentTime);
        }
    });

    const sidebarBackdrop = document.querySelector('.sidebar-backdrop');

    function openSidebar() {
        document.querySelector('.left').classList.add('open');
        document.body.classList.add('menu-open');
        sidebarBackdrop.classList.add('active');
        document.querySelector('.playbar').classList.add('hide-on-sidebar');
    }
    function closeSidebar() {
        document.querySelector('.left').classList.remove('open');
        document.body.classList.remove('menu-open');
        sidebarBackdrop.classList.remove('active');
        document.querySelector('.playbar').classList.remove('hide-on-sidebar');
    }

    // Hamburger toggles sidebar open/close
    const hamburger = document.querySelector('.hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', function(e) {
            e.stopPropagation();
            const sidebar = document.querySelector('.left');
            const sidebarBackdrop = document.querySelector('.sidebar-backdrop');
            const playbar = document.querySelector('.playbar');
            const isOpen = sidebar.classList.contains('open');
            if (isOpen) {
                sidebar.classList.remove('open');
                document.body.classList.remove('menu-open');
                sidebarBackdrop.classList.remove('active');
                playbar.classList.remove('hide-on-sidebar');
            } else {
                sidebar.classList.add('open');
                document.body.classList.add('menu-open');
                sidebarBackdrop.classList.add('active');
                playbar.classList.add('hide-on-sidebar');
            }
        });
    }

    // Also allow clicking the backdrop to close the sidebar
    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', function() {
            const sidebar = document.querySelector('.left');
            const playbar = document.querySelector('.playbar');
            sidebar.classList.remove('open');
            document.body.classList.remove('menu-open');
            sidebarBackdrop.classList.remove('active');
            playbar.classList.remove('hide-on-sidebar');
        });
    }

    previous.addEventListener("click", () => {
        let index = songs.indexOf(currentSongFile);
        if (index > 0) {
            playMusic(songs[index - 1]);
        } else {
            playMusic(songs[songs.length - 1]); // Loop to last song
        }
        // Save session after skipping
        if (typeof saveSession === 'function' && typeof currFolder !== 'undefined' && typeof currentSongFile !== 'undefined' && typeof currentSong !== 'undefined') {
            saveSession(currFolder, currentSongFile, currentSong.currentTime);
        }
    });

    next.addEventListener("click", () => {
        let index = songs.indexOf(currentSongFile);
        if (index < songs.length - 1) {
            playMusic(songs[index + 1]);
        } else {
            playMusic(songs[0]); // Loop to first song
        }
        // Save session after skipping
        if (typeof saveSession === 'function' && typeof currFolder !== 'undefined' && typeof currentSongFile !== 'undefined' && typeof currentSong !== 'undefined') {
            saveSession(currFolder, currentSongFile, currentSong.currentTime);
        }
    });

    document.querySelector(".range input").addEventListener("change", (e) => {
        currentSong.volume = parseInt(e.target.value) / 100;
        if (currentSong.volume > 0) {
            document.querySelector(".volume>img").src = document.querySelector(".volume>img").src.replace("mute.svg", "volume.svg");
        }
    });

    document.querySelector(".volume>img").addEventListener("click", e => {
        if (e.target.src.includes("volume.svg")) {
            e.target.src = e.target.src.replace("volume.svg", "mute.svg");
            currentSong.volume = 0;
            document.querySelector(".range input").value = 0;
        } else {
            e.target.src = e.target.src.replace("mute.svg", "volume.svg");
            currentSong.volume = 0.1;
            document.querySelector(".range input").value = 10;
        }
    });

    document.getElementById('homeBtn').addEventListener('click', function() {
        const mainContent = document.querySelector('.right');
        mainContent.classList.remove('main-fade-in');
        mainContent.classList.add('main-fade-out');
        setTimeout(() => {
            window.location.reload();
        }, 400);
    });

    // Seek 5s back/forward buttons
    const seekBackBtn = document.getElementById('seekback');
    const seekForwardBtn = document.getElementById('seekforward');
    if (seekBackBtn) {
        seekBackBtn.addEventListener('click', () => {
            currentSong.currentTime = Math.max(0, currentSong.currentTime - 5);
            // Save session after seeking
            if (typeof saveSession === 'function' && typeof currFolder !== 'undefined' && typeof currentSongFile !== 'undefined' && typeof currentSong !== 'undefined') {
                saveSession(currFolder, currentSongFile, currentSong.currentTime);
            }
        });
    }
    if (seekForwardBtn) {
        seekForwardBtn.addEventListener('click', () => {
            currentSong.currentTime = Math.min(currentSong.duration, currentSong.currentTime + 5);
            // Save session after seeking
            if (typeof saveSession === 'function' && typeof currFolder !== 'undefined' && typeof currentSongFile !== 'undefined' && typeof currentSong !== 'undefined') {
                saveSession(currFolder, currentSongFile, currentSong.currentTime);
            }
        });
    }

    // --- Swipe gesture for sidebar (mobile) ---
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let isSidebarOpen = false;

    function handleGesture() {
        const sidebar = document.querySelector('.left');
        const sidebarBackdrop = document.querySelector('.sidebar-backdrop');
        const playbar = document.querySelector('.playbar');
        // Only consider horizontal swipes
        if (Math.abs(touchEndX - touchStartX) > 40 && Math.abs(touchEndY - touchStartY) < 60) {
            // Swipe right from left edge to open
            if (touchStartX < 30 && touchEndX - touchStartX > 40 && !sidebar.classList.contains('open')) {
                sidebar.classList.add('open');
                document.body.classList.add('menu-open');
                sidebarBackdrop.classList.add('active');
                playbar.classList.add('hide-on-sidebar');
            }
            // Swipe left from sidebar edge to close
            if (sidebar.classList.contains('open') && touchStartX > 200 && touchStartX < window.innerWidth && touchStartX - touchEndX > 40) {
                sidebar.classList.remove('open');
                document.body.classList.remove('menu-open');
                sidebarBackdrop.classList.remove('active');
                playbar.classList.remove('hide-on-sidebar');
            }
        }
    }

    document.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    });
    document.addEventListener('touchend', function(e) {
        if (e.changedTouches.length === 1) {
            touchEndX = e.changedTouches[0].clientX;
            touchEndY = e.changedTouches[0].clientY;
            handleGesture();
        }
    });

    // Spotlight search modal logic
    const sidebarSearch = document.getElementById('sidebarSearch');
    const spotlightOverlay = document.querySelector('.spotlight-overlay');
    const spotlightModal = document.querySelector('.spotlight-modal');
    const spotlightSearch = document.getElementById('spotlightSearch');
    const spotlightResults = document.querySelector('.spotlight-results');

    // Open spotlight modal when sidebar search is focused/clicked
    if (sidebarSearch) {
        sidebarSearch.addEventListener('focus', openSpotlight);
        sidebarSearch.addEventListener('click', openSpotlight);
    }
    function openSpotlight() {
        spotlightOverlay.style.display = 'block';
        spotlightModal.style.display = 'flex';
        spotlightSearch.value = '';
        spotlightSearch.focus();
        renderSpotlightResults('');
    }
    function closeSpotlight() {
        spotlightOverlay.style.display = 'none';
        spotlightModal.style.display = 'none';
    }
    if (spotlightOverlay) {
        spotlightOverlay.addEventListener('click', closeSpotlight);
    }
    document.addEventListener('keydown', function(e) {
        if ((spotlightModal.style.display === 'flex' || spotlightModal.classList.contains('active')) && e.key === 'Escape') closeSpotlight();
    });
    if (spotlightSearch) {
        spotlightSearch.addEventListener('input', function() {
            renderSpotlightResults(spotlightSearch.value);
        });
    }
    function renderSpotlightResults(query) {
        // If query is empty, show prompt
        if (!query.trim()) {
            spotlightResults.innerHTML = '<div style="padding:16px;color:#b3b3b3;">Type here to search.</div>';
            return;
        }
        // Get all playlists from window.playlistMeta
        const playlists = Object.entries(window.playlistMeta || {});
        const results = playlists.filter(([folder, meta]) => {
            const title = (meta.title || '').toLowerCase();
            const desc = (meta.description || '').toLowerCase();
            return title.includes(query.toLowerCase()) || desc.includes(query.toLowerCase());
        });
        if (results.length === 0) {
            spotlightResults.innerHTML = '<div style="padding:16px;color:#b3b3b3;">No matching playlists found.</div>';
            return;
        }
        spotlightResults.innerHTML = results.map(([folder, meta]) => `
            <div class="spotlight-result-item" data-folder="${folder}">
                <img src="songs/${folder}/${meta.cover || 'cover.jpg'}" alt="${meta.title} cover" style="width:38px;height:38px;border-radius:8px;object-fit:cover;background:#232323;margin-right:10px;">
                <div>
                    <div style="font-weight:600;">${meta.title}</div>
                    <div style="font-size:0.98rem;color:#b3b3b3;">${meta.description}</div>
                </div>
            </div>
        `).join('');
        Array.from(spotlightResults.querySelectorAll('.spotlight-result-item')).forEach(item => {
            item.addEventListener('click', async function() {
                closeSpotlight();
                // Simulate clicking the playlist card
                const folder = item.getAttribute('data-folder');
                songs = await getSongs(folder);
                highlightActivePlaylist(folder);
                if (songs.length) await playMusic(songs[0], false);
            });
        });
    }

    // Make the search icon/label focus the search input or open spotlight
    const searchLi = document.querySelector('li img[alt="search"]')?.parentElement;
    if (searchLi) {
        searchLi.style.cursor = 'pointer';
        searchLi.addEventListener('click', function() {
            openSpotlight();
        });
    }

    // Show contact-ref only when scrolled down
    const contactRef = document.querySelector('.contact-ref');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            contactRef.classList.add('show-contact-ref');
        } else {
            contactRef.classList.remove('show-contact-ref');
        }
    });

    // Ensure sidebar is empty at start
    document.querySelector('.playlists').innerHTML = '';

    // Add click handler for Your Library button to go to library.html
    const libraryBtn = document.querySelector('.library-btn');
    if (libraryBtn) {
        libraryBtn.addEventListener('click', function() {
            window.location.href = 'library.html';
        });
    }
}

function isIndexPage() {
    return window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '';
}

// Only run main() and displayAlbums on index.html
if (isIndexPage()) {
document.addEventListener('DOMContentLoaded', function() {
    main();
});
}

// --- Library Page Playlist List with Dropdowns ---
if (window.location.pathname.endsWith('library.html')) {
    document.addEventListener('DOMContentLoaded', async function() {
        // Playbar controls: add null checks for all elements
        const playBtn = document.getElementById('play');
        const prevBtn = document.getElementById('previous');
        const nextBtn = document.getElementById('next');
        const seekBackBtn = document.getElementById('seekback');
        const seekForwardBtn = document.getElementById('seekforward');
        const rangeInput = document.querySelector('.range input');
        const volumeImg = document.querySelector('.volume>img');
        const songTime = document.querySelector('.songtime');
        const songInfo = document.querySelector('.songinfo');
        const circle = document.querySelector('.circle');
        const seekbar = document.querySelector('.seekbar');

        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (currentSong.paused) {
                    currentSong.play();
                    playBtn.src = "img/pause.svg";
                } else {
                    currentSong.pause();
                    playBtn.src = "img/play.svg";
                }
            });
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                let index = songs.indexOf(currentSongFile);
                if (index > 0) {
                    playMusic(songs[index - 1]);
                } else {
                    playMusic(songs[songs.length - 1]);
                }
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                let index = songs.indexOf(currentSongFile);
                if (index < songs.length - 1) {
                    playMusic(songs[index + 1]);
                } else {
                    playMusic(songs[0]);
                }
            });
        }
        if (seekBackBtn) {
            seekBackBtn.addEventListener('click', () => {
                currentSong.currentTime = Math.max(0, currentSong.currentTime - 5);
            });
        }
        if (seekForwardBtn) {
            seekForwardBtn.addEventListener('click', () => {
                currentSong.currentTime = Math.min(currentSong.duration, currentSong.currentTime + 5);
            });
        }
        if (rangeInput) {
            rangeInput.addEventListener('change', (e) => {
                currentSong.volume = parseInt(e.target.value) / 100;
                if (currentSong.volume > 0 && volumeImg) {
                    volumeImg.src = volumeImg.src.replace("mute.svg", "volume.svg");
                }
            });
        }
        if (volumeImg) {
            volumeImg.addEventListener('click', e => {
                if (e.target.src.includes("volume.svg")) {
                    e.target.src = e.target.src.replace("volume.svg", "mute.svg");
                    currentSong.volume = 0;
                    if (rangeInput) rangeInput.value = 0;
                } else {
                    e.target.src = e.target.src.replace("mute.svg", "volume.svg");
                    currentSong.volume = 0.1;
                    if (rangeInput) rangeInput.value = 10;
                }
            });
        }
        if (seekbar && circle) {
            seekbar.addEventListener("click", e => {
                let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
                circle.style.left = percent + "%";
                currentSong.currentTime = (currentSong.duration * percent) / 100;
            });
        }
        if (currentSong && songTime && songInfo && circle) {
            currentSong.addEventListener("timeupdate", () => {
                songTime.innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
                circle.style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
            });
        }

        // Playlist dropdown logic (unchanged)
        const playlistListDb = document.querySelector('.playlist-list-db');
        if (!playlistListDb) return;
        // Fetch playlists
        let playlists = [];
        try {
            let res = await fetch('songs/playlists.json');
            if (!res.ok) throw new Error('Failed to load playlists.json');
            playlists = await res.json();
        } catch (e) {
            playlistListDb.innerHTML = '<li style="color:#b3b3b3;padding:24px;">No playlists found in the database.</li>';
            return;
        }
        // Fetch meta for all playlists
        let metaMap = {};
        await Promise.all(playlists.map(async folder => {
            try {
                let metaRes = await fetch(`songs/${folder}/info.json`);
                if (!metaRes.ok) throw new Error('Missing info.json');
                metaMap[folder] = await metaRes.json();
            } catch {
                metaMap[folder] = {};
            }
        }));
        // Render playlists as visually rich list items
        playlistListDb.innerHTML = playlists.map(folder => {
            const meta = metaMap[folder] || {};
            const cover = meta.cover || 'cover.jpg';
            const title = meta.title || folder.replace(/_/g, ' ');
            return `
            <li class="db-playlist-item" data-folder="${folder}" style="padding:14px 0 0 0;">
                <div class="db-playlist-title" style="cursor:pointer;display:flex;align-items:center;gap:16px;font-weight:600;font-size:1.08rem;color:#fff;padding:10px 18px;border-radius:12px;background:#232323;transition:background 0.18s;box-shadow:0 2px 8px 0 rgba(0,0,0,0.10);">
                    <img src="songs/${folder}/${cover}" alt="${title} cover" style="width:54px;height:54px;border-radius:10px;object-fit:cover;background:#232323;">
                    <span style="flex:1;vertical-align:middle;">${title}</span>
                    <span class="dropdown-arrow" style="margin-left:10px;transition:transform 0.18s;font-size:1.3em;">&#9662;</span>
                </div>
                <ul class="db-song-list" style="display:none;margin:0 0 0 70px;padding:0 0 0 18px;border-left:2px solid #1db954;background:rgba(30,215,96,0.04);border-radius:0 0 8px 8px;"></ul>
            </li>
            `;
        }).join('');
        // Add click handlers for dropdowns
        Array.from(document.querySelectorAll('.db-playlist-title')).forEach(titleDiv => {
            titleDiv.addEventListener('click', async function() {
                const li = titleDiv.parentElement;
                const folder = li.getAttribute('data-folder');
                const songList = li.querySelector('.db-song-list');
                // Close any other open dropdowns
                document.querySelectorAll('.db-song-list').forEach(ul => {
                    if (ul !== songList) {
                        ul.style.display = 'none';
                        ul.parentElement.querySelector('.dropdown-arrow').style.transform = 'rotate(0deg)';
                    }
                });
                // Toggle this dropdown
                if (songList.style.display === 'block') {
                    songList.style.display = 'none';
                    titleDiv.querySelector('.dropdown-arrow').style.transform = 'rotate(0deg)';
                    return;
                }
                // Fetch songs for this playlist
                songList.innerHTML = '<li style="color:#b3b3b3;padding:10px;">Loading...</li>';
                songList.style.display = 'block';
                titleDiv.querySelector('.dropdown-arrow').style.transform = 'rotate(180deg)';
                let songsArr = [];
                try {
                    // Try to fetch tracks.json first
                    let response = await fetch(`songs/${folder}/tracks.json`);
                    if (response.ok) {
                        songsArr = await response.json();
                    } else {
                        // Fallback: fetch directory listing
                        let a = await fetch(`songs/${folder}/?_=${Date.now()}`, { 
                            cache: 'no-store',
                            headers: { 'Accept': 'text/html' }
                        });
                        let response2 = await a.text();
                        let div = document.createElement("div");
                        div.innerHTML = response2;
                        let as = div.getElementsByTagName("a");
                        songsArr = [];
                        for (let index = 0; index < as.length; index++) {
                            const element = as[index];
                            if (element.href.endsWith(".mp3")) {
                                songsArr.push(element.href.split(`${folder}/`)[1]);
                            }
                        }
                    }
                } catch (error) {
                    songList.innerHTML = '<li style="color:#b3b3b3;padding:10px;">Error loading songs.</li>';
                    return;
                }
                if (!songsArr.length) {
                    songList.innerHTML = '<li style="color:#b3b3b3;padding:10px;">No songs found in this playlist.</li>';
                    return;
                }
                songList.innerHTML = songsArr.map((song, idx) => `<li class="db-song-item" data-folder="${folder}" data-song="${song}" style="color:#fff;padding:7px 0;font-size:1.01rem;cursor:pointer;">${idx+1}. ${decodeURIComponent(song).replace(/\.mp3$/, '')}</li>`).join('');
                // Add click handlers for song items to play them
                Array.from(songList.querySelectorAll('.db-song-item')).forEach(songLi => {
                    songLi.addEventListener('click', async function(e) {
                        e.stopPropagation(); // Prevent dropdown from toggling
                        const folder = songLi.getAttribute('data-folder');
                        const song = songLi.getAttribute('data-song');
                        // Set current playlist and play the selected song
                        currFolder = `songs/${folder}`;
                        songs = songsArr;
                        currentSongFile = song;
                        currentPlaylistSongs = songsArr;
                        if (songInfo) songInfo.innerHTML = decodeURIComponent(song).replace(/\.mp3$/, '');
                        if (songTime) songTime.innerHTML = "00:00 / 00:00";
                        currentSong.pause();
                        currentSong.currentTime = 0;
                        currentSong.src = `${currFolder}/${song}`;
                        try {
                            await currentSong.play();
                            if (playBtn) playBtn.src = "img/pause.svg";
                        } catch (err) {
                            if (playBtn) playBtn.src = "img/play.svg";
                        }
                    });
                });
            });
        });
    });
}