// --- XÁC THỰC NGƯỜI DÙNG (CHẾ ĐỘ KHÁCH) ---
window.isGuest = true;

async function checkAuth() {
    let savedUser = localStorage.getItem('currentUser');
    let profileBtn = document.getElementById('userProfileName');
    if(!profileBtn) return;

    if(savedUser) {
        let userObj = JSON.parse(savedUser);
        // Hiển thị Profile thay vì redirect ngay lập tức (theo yêu cầu hiện tên/ava trên index)
        profileBtn.innerHTML = `<img src="${userObj.avatar || userObj.aveta || 'meo.jpg'}" alt="Avatar" onerror="this.src='meo.jpg'"> ${userObj.acc} <i class="fa-solid fa-right-from-bracket" style="padding: 0 4px;" title="Chuyển sang App"></i>`;
        profileBtn.onclick = () => window.location.href = "app.html"; 
    } else {
        profileBtn.innerHTML = `
            <img src="meo.jpg" alt="Guest" onerror="this.src='meo.jpg'">
            Đăng Nhập / Đăng Ký
        `;
        profileBtn.onclick = () => window.openAuthModal();
    }
}
checkAuth();

// Logic mở/đóng Modal Auth
window.openAuthModal = () => {
    let modal = document.getElementById('authModalOverlay');
    if(modal) modal.style.display = 'flex';
};
window.closeAuthModal = () => {
    let modal = document.getElementById('authModalOverlay');
    if(modal) modal.style.display = 'none';
};

let danhSachGoc = []; 
let currentSongIndex = -1;
let isPlaying = false;
let daNghe = {}; 
let lastSkipDirection = 'next';

const audio = document.getElementById('mainAudio');
const btnPlayPause = document.getElementById('btnPlayPause');
const progressBar = document.getElementById('progressBar');
const progressThumb = document.getElementById('progressThumb');
const timeCurrent = document.getElementById('timeCurrent');
const timeTotal = document.getElementById('timeTotal');

window.loadMusic = async () => {
    try {
        let [songRes, accRes] = await Promise.all([
            fetch(API_URL),
            fetch(ACCOUNTS_API)
        ]);
        
        danhSachGoc = await songRes.json();
        let allUsers = await accRes.json();
        
        // Đếm like cho từng bài hát từ tất cả user
        let likeCounts = {};
        allUsers.forEach(u => {
            if(u.like && Array.isArray(u.like)) {
                u.like.forEach(sid => {
                    likeCounts[sid] = (likeCounts[sid] || 0) + 1;
                });
            }
        });

        // Tính điểm: Nghe * 1 + Thích * 3
        danhSachGoc.forEach(s => {
            s.totalLikes = likeCounts[s.id] || 0;
            s.rankingScore = (Number(s.listens) || 0) + (s.totalLikes * 3);
        });

        danhSachGoc.sort((a, b) => (Number(b.listens) || 0) - (Number(a.listens) || 0));
        window.renderNhac(danhSachGoc); 
        window.renderRanking(danhSachGoc);
    } catch (error) {
        document.getElementById('songGrid').innerHTML = `<h3 style="color:var(--accent-pink);">Lỗi tải nhạc: ${error}</h3>`;
    }
}

window.renderRanking = (songs) => {
    const rankingList = document.getElementById('rankingList');
    const rankingSection = document.getElementById('rankingSection');
    if(!rankingList || !rankingSection) return;

    // Lấy top 5 dựa trên rankingScore
    const top5 = [...songs].sort((a,b) => b.rankingScore - a.rankingScore).slice(0, 5);
    
    if(top5.length > 0) rankingSection.style.display = 'block';

    let html = '';
    top5.forEach((s, i) => {
        let rank = i + 1;
        let rankIcon = rank <= 3 ? `<i class="fa-solid fa-trophy"></i>` : rank;
        let isNonstop = (s.classify || s.category || "").toLowerCase().includes('nonstop');
        let badgeTxt = isNonstop ? 'NONSTOP' : 'TRACK';

        html += `
        <div class="ranking-item rank-${rank}" onclick="window.playSong(${danhSachGoc.findIndex(x => x.id === s.id)})" style="cursor:pointer;">
            <div class="rank-number">${rankIcon}</div>
            <img src="${s.aveta || 'meo.jpg'}" onerror="this.src='meo.jpg'">
            <div class="rank-info">
                <div class="rank-name">${s.name}</div>
                <div class="rank-artist">${s.artist}</div>
            </div>
            <div class="rank-meta">
                <span class="rank-badge">${badgeTxt}</span>
            </div>
            <div class="rank-stats">
                <div class="stat-points">${s.rankingScore} pts</div>
                <div style="display:flex; gap:10px;">
                    <span class="stat-item"><i class="fa-solid fa-play"></i>${s.listens}</span>
                    <span class="stat-item"><i class="fa-solid fa-heart"></i>${s.totalLikes}</span>
                </div>
            </div>
        </div>`;
    });
    rankingList.innerHTML = html;
}

let hienThiCheDo = 'trangchu';
let customPlaylistQueue = [];
let currentQueueType = 'goc';

function setActiveNav(navId) {
    ['nav-home', 'nav-fav', 'nav-playlist', 'nav-history', 'nav-library', 'nav-search'].forEach(id => {
        let el = document.getElementById(id);
        if(el) el.classList.remove('active');
    });
    if(navId) {
        let el = document.getElementById(navId);
        if(el) el.classList.add('active');
    }
}

window.hienThiTimKiem = () => {
    hienThiCheDo = 'search';
    setActiveNav('nav-search');
    const rankingSection = document.getElementById('rankingSection');
    if(rankingSection) rankingSection.style.display = 'none';

    let title = document.getElementById('pageTitle');
    if(title) title.innerText = 'Tìm kiếm giai điệu';
    window.timKiem();
};

window.hienThiTrangChu = () => {
    hienThiCheDo = 'trangchu';
    setActiveNav('nav-home');
    const rankingSection = document.getElementById('rankingSection');
    if(rankingSection) rankingSection.style.display = 'block';

    window.currentTabType = 'playlists';
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        if (b.innerText.trim() === 'Playlists') b.classList.add('active');
    });
    let title = document.getElementById('pageTitle');
    if(title) title.innerText = 'Gợi Ý Cho Bạn';
    window.timKiem(); 
};

window.hienThiYeuThich = () => { showToast("Bạn chưa đăng nhập. Nhấn vào đây để cùng H-MUSIC lưu giữ giai điệu nhé! ❤️", "info", 5000, () => window.openAuthModal()); };
window.hienThiMyPlaylist = () => { showToast("Đăng nhập để tự tạo danh sách phát của riêng bạn! 🎧", "info", 5000, () => window.openAuthModal()); };
window.hienThiThuVien = () => { showToast("Thư viện của bạn đang chờ... Đăng nhập ngay! 📚", "info", 5000, () => window.openAuthModal()); };

window.hienThiLichSu = () => {
    hienThiCheDo = 'history';
    setActiveNav('nav-history');
    let title = document.getElementById('pageTitle');
    if(title) title.innerText = 'Lịch Sử Nghe Gần Đây (Khách)';
    window.timKiem();
};

window.addToPlaylist = (songId) => { showToast("Hãy đăng nhập để thêm bài hát vào danh sách phát nhé! ➕", "info", 5000, () => window.openAuthModal()); };
window.toggleLike = (songId) => { showToast("Thả tim để lưu bài hát yêu thích nào! Bạn cần đăng nhập nhé. ❤️", "info", 5000, () => window.openAuthModal()); };
window.toggleLikeMobile = () => { showToast("Đăng nhập để thả tim bài hát này! 💓", "info", 5000, () => window.openAuthModal()); };
window.toggleLikeDesk = () => { showToast("Nhấn để đăng nhập và lưu bài hát này vào yêu thích! ✨", "info", 5000, () => window.openAuthModal()); };
window.isLiked = (songId) => { return false; };

window.recordHistory = (songId) => {
    let guestHistory = JSON.parse(localStorage.getItem('hmusic_guest_history') || "[]");
    let idStr = songId.toString();
    let idx = guestHistory.indexOf(idStr);
    if(idx > -1) guestHistory.splice(idx, 1);
    guestHistory.unshift(idStr);
    if(guestHistory.length > 30) guestHistory.pop();
    localStorage.setItem('hmusic_guest_history', JSON.stringify(guestHistory));
};

window.renderNhac = (mangNhac) => {
    const grid = document.getElementById('songGrid');
    grid.style.display = '';
    grid.style.flexDirection = '';
    grid.style.gap = '';
    
    let html = "";
    
    // Thêm thanh tìm kiếm mobile CHỈ khi ở tab Search và trên Mobile
    if (hienThiCheDo === 'search' && window.innerWidth <= 768) {
        let currentVal = document.getElementById('mobileSearchInput')?.value || "";
        html += `
        <div class="mobile-search-form" style="grid-column: 1/-1;">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="mobileSearchInput" placeholder="Tìm bài hát, nghệ sĩ..." 
                   value="${currentVal}" oninput="window.timKiemDelay()" autofocus>
        </div>`;
    }

    if (mangNhac.length === 0) {
        grid.innerHTML = html + `<div style="grid-column: 1/-1; text-align:center; color:var(--text-secondary); font-weight:bold; padding: 40px 0;">😢 Không tìm thấy kết quả nào...</div>`;
        return;
    }

    mangNhac.forEach((item) => {
        let realIndex = danhSachGoc.findIndex(x => x.id === item.id);
        let classifyVal = item.classify || item.category || 'Track';
        let isNonstop = classifyVal.toLowerCase().includes('nonstop');
        let badgeTxt = isNonstop ? 'NONSTOP' : classifyVal.toUpperCase();
        let badgeClass = isNonstop ? 'badge-nonstop' : 'badge-track';
        
        html += `
        <div class="card" onclick="window.playSong(${realIndex})">
            <div class="card-img-wrapper" style="position:relative;">
                <img src="${item.aveta || 'meo.jpg'}" alt="cover" onerror="this.src='meo.jpg'">
                <button class="play-btn-card"><i class="fa-solid fa-play"></i></button>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-top:12px;">
                <div style="overflow:hidden; flex:1; padding-right:10px;">
                    <div class="card-title" title="${item.name}">${item.name}</div>
                    <div class="card-desc">${item.artist}</div>
                </div>
                <div style="display: flex; align-items: center;">
                    <div class="song-badge ${badgeClass}">${badgeTxt}</div>
                    <button class="add-btn" onclick="event.stopPropagation(); window.addToPlaylist(${item.id})" style="background:none; border:none; cursor:pointer; color: var(--text-secondary); font-size:18px; margin-right:8px;">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                    <button class="like-btn" onclick="event.stopPropagation(); window.toggleLike(${item.id})" style="background:none; border:none; cursor:pointer; color: var(--text-secondary); font-size:18px;">
                        <i class="fa-regular fa-heart"></i>
                    </button>
                </div>
            </div>
        </div>`;
    });
    grid.innerHTML = html;
}

// Logic Tìm kiếm
window.currentTabType = 'playlists';
window.filterTab = (type, btn) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    window.currentTabType = type;
    hienThiCheDo = 'trangchu';
    setActiveNav('nav-home');
    let title = document.getElementById('pageTitle');
    if(title) {
        if (type === 'playlists') title.innerText = 'Gợi Ý Cho Bạn';
        else if (type === 'artists') title.innerText = 'Nghệ Sĩ';
        else if (type === 'albums') title.innerText = 'Thể Loại';
    }
    window.timKiem();
};

let searchTimeout;
window.timKiemDelay = () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => { window.timKiem(); }, 600);
};

window.timKiem = () => {
    let desktopInput = document.getElementById('searchInput');
    let mobileInput = document.getElementById('mobileSearchInput');
    let tuKhoa = "";
    
    if (mobileInput && window.innerWidth <= 768 && hienThiCheDo === 'search') {
        tuKhoa = mobileInput.value.toLowerCase();
    } else if (desktopInput) {
        tuKhoa = desktopInput.value.toLowerCase();
    }

    let baseList = [...danhSachGoc];
    
    if(hienThiCheDo === 'history') {
        let guestHist = JSON.parse(localStorage.getItem('hmusic_guest_history') || "[]");
        baseList = [];
        guestHist.forEach(idStr => {
            let s = danhSachGoc.find(x => x.id.toString() === idStr);
            if(s) baseList.push(s);
        });
    } else if(hienThiCheDo === 'trangchu') {
        if (window.currentTabType === 'playlists') baseList.sort((a, b) => (Number(b.listens) || 0) - (Number(a.listens) || 0));
        else if (window.currentTabType === 'artists') baseList.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
        else if (window.currentTabType === 'albums') baseList.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    } else if(hienThiCheDo === 'search') {
        baseList = [...danhSachGoc];
    }

    let ketQua = baseList.filter(bai => 
        bai.name.toLowerCase().includes(tuKhoa) || 
        bai.artist.toLowerCase().includes(tuKhoa)
    );
    window.renderNhac(ketQua); 
}

// ENGINE CƠ BẢN

// [KHỞI TẠO BIẾN TOÀN CỤC] (KHÔNG ĐỔI)
window.syncDesktopFS = (song) => {
    const fsImgDesk = document.getElementById('fsImageDesk');
    if(fsImgDesk) { fsImgDesk.src = song.aveta || 'meo.jpg'; fsImgDesk.onerror = () => fsImgDesk.src = 'meo.jpg'; }
    document.getElementById('fsTitleDesk').innerText = song.name;
    document.getElementById('fsArtistDesk').innerText = song.artist;
    
    const fsMiniImgDesk = document.getElementById('fsMiniImageDesk');
    if(fsMiniImgDesk) { fsMiniImgDesk.src = song.aveta || 'meo.jpg'; fsMiniImgDesk.onerror = () => fsMiniImgDesk.src = 'meo.jpg'; }
    document.getElementById('fsMiniTitleDesk').innerText = song.name;
    document.getElementById('fsMiniArtistDesk').innerText = song.artist;
    
    let deskLyrics = document.getElementById('fsLyricsDesk');
    if(deskLyrics) deskLyrics.innerText = (song.lyrics && song.lyrics.trim() !== '') ? song.lyrics : 'Không có lời bài hát';
    window.renderFSPlaylistDesk();
}

window.renderFSPlaylistDesk = () => {
    let pContainer = document.getElementById('fsPlaylistDesk');
    if(!pContainer) return;
    let html = '';
    danhSachGoc.forEach((s, i) => {
        let isPlaying = i === currentSongIndex;
        html += `<li class="${isPlaying ? 'playing' : ''}" onclick="window.playSong(${i})">
            <img src="${s.aveta || 'meo.jpg'}" style="width:40px;height:40px;border-radius:4px;" onerror="this.src='meo.jpg'">
            <div class="song-info">
                <h4 style="color:${isPlaying ? 'var(--accent-pink)' : '#fff'}">${s.name}</h4>
                <p>${s.artist}</p>
            </div>
        </li>`;
    });
    pContainer.innerHTML = html;
}

window.togglePlay = () => {
    if (audio.src === "" || audio.src === window.location.href) {
        if(danhSachGoc.length > 0) window.playSong(0);
        return;
    }
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
    } else {
        audio.play();
        isPlaying = true;
        btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
    }
    // Sync all play icons
    ['fsBtnPlayPauseDesk', 'fsBtnPlayPauseMobile', 'fsBtnPlayPause'].forEach(id => {
        let el = document.getElementById(id);
        if(el) el.innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
    });
}

window.playNext = () => {
    lastSkipDirection = 'next';
    let nextIdx = (currentSongIndex + 1) % danhSachGoc.length;
    window.playSong(nextIdx);
}
window.playPrev = () => {
    lastSkipDirection = 'prev';
    let prevIdx = currentSongIndex - 1;
    if(prevIdx < 0) prevIdx = danhSachGoc.length - 1;
    window.playSong(prevIdx);
}

// Audio events
audio.addEventListener('timeupdate', () => {
    let curr = audio.currentTime;
    let total = audio.duration;
    if(!total) return;
    let percent = (curr / total) * 100;
    progressBar.style.width = percent + "%";
    progressThumb.style.left = percent + "%";
    
    // Sync other progress bars
    ['fsProgressRangeDesk', 'fsProgressBarMobile'].forEach(id => {
        let el = document.getElementById(id);
        if(el) { if(el.type === 'range') el.value = percent; else el.style.width = percent + "%"; }
    });
    
    // Sync times
    let timeTxt = (isNaN(curr) ? "0:00" : Math.floor(curr/60) + ":" + (Math.floor(curr%60)<10?"0":"") + Math.floor(curr%60));
    ['timeCurrent', 'fsTimeCurrentDesk', 'fsTimeCurrentMobile'].forEach(id => {
        let el = document.getElementById(id);
        if(el) el.innerText = timeTxt;
    });
});

audio.addEventListener('loadedmetadata', () => {
    let dur = audio.duration;
    let timeTxt = (isNaN(dur) ? "0:00" : Math.floor(dur/60) + ":" + (Math.floor(dur%60)<10?"0":"") + Math.floor(dur%60));
    ['timeTotal', 'fsTimeTotalDesk', 'fsTimeTotalMobile'].forEach(id => {
        let el = document.getElementById(id);
        if(el) el.innerText = timeTxt;
    });
});

audio.addEventListener('ended', () => { window.playNext(); });

window.seekAudio = (e) => {
    if(!audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
}
window.seekAudioRangeDesk = (val) => { if(audio.duration) audio.currentTime = (val/100)*audio.duration; };

window.seekVolume = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let percent = (e.clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    audio.volume = percent;
    document.getElementById('volumeBar').style.width = (percent * 100) + "%";
}
window.seekVolumeRangeDesk = (val) => {
    audio.volume = val/100;
    document.getElementById('volumeBar').style.width = val + "%";
};

window.tangLuotNghe = async (id) => {
    if (daNghe[id]) return; 
    daNghe[id] = true; 
    try {
        await fetch(`${API_URL}/${id}`, { 
            method: 'PUT', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ listens: 1 }) // Mẫu tăng view
        });
    } catch (e) {}
}

window.playSong = (index) => {
    if (index < 0 || index >= danhSachGoc.length) return;
    currentSongIndex = index;
    let song = danhSachGoc[index];

    // UI Bottom
    const npImg = document.getElementById('npImage');
    if(npImg) { npImg.src = song.aveta || 'meo.jpg'; npImg.onerror = () => npImg.src = 'meo.jpg'; }
    document.getElementById('npTitle').innerText = song.name;
    document.getElementById('npArtist').innerText = song.artist;

    // FS Mobile Animation
    let fsImgMob = document.getElementById('fsImageMobile');
    if (fsImgMob) {
        fsImgMob.src = song.aveta || 'meo.jpg';
        fsImgMob.onerror = () => fsImgMob.src = 'meo.jpg';
        let animClass = (lastSkipDirection === 'next') ? 'animate-next' : 'animate-prev';
        fsImgMob.classList.remove('animate-next', 'animate-prev');
        void fsImgMob.offsetWidth;
        fsImgMob.classList.add(animClass);
    }
    document.getElementById('fsTitleMobile').innerText = song.name;
    document.getElementById('fsArtistMobile').innerText = song.artist;
    document.getElementById('fsBgBlur').style.backgroundImage = `url('${song.aveta || ''}')`;

    // Lyrics
    let txt = (song.lyrics && song.lyrics.trim() !== '') ? song.lyrics : 'Không có lời bài hát';
    let lMob = document.getElementById('fsLyricsMobile'); if(lMob) lMob.innerText = txt;

    if(window.syncDesktopFS) window.syncDesktopFS(song);

    document.querySelector('.now-playing-bar').classList.add('active');
    audio.src = song.link;
    audio.play();
    isPlaying = true;
    
    ['btnPlayPause', 'fsBtnPlayPause', 'fsBtnPlayPauseMobile', 'fsBtnPlayPauseDesk'].forEach(id => {
        let el = document.getElementById(id);
        if(el) el.innerHTML = '<i class="fa-solid fa-pause"></i>';
    });

    window.recordHistory(song.id);
}

// Mobile specific
window.toggleLyricsMobile = () => {
    let overlay = document.getElementById('fsLyricsOverlayMobile');
    if(overlay) overlay.style.display = (overlay.style.display==='none'?'flex':'none');
}
window.seekAudioMobile = (e) => { window.seekAudio(e); }

window.initSwipeGestures = () => {
    let touchStartX = 0; let touchStartY = 0;
    const fsPlayer = document.getElementById('fsPlayer');
    const albumArt = document.getElementById('fsImageMobile');
    if(!fsPlayer || !albumArt) return;

    fsPlayer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX; touchStartY = e.changedTouches[0].screenY;
    }, {passive:true});

    fsPlayer.addEventListener('touchend', (e) => {
        let dx = e.changedTouches[0].screenX - touchStartX;
        let dy = e.changedTouches[0].screenY - touchStartY;
        if (dy > 100 && Math.abs(dy) > Math.abs(dx)*1.5) fsPlayer.classList.remove('active');
    }, {passive:true});

    albumArt.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX; touchStartY = e.changedTouches[0].screenY;
    }, {passive:true});

    albumArt.addEventListener('touchend', (e) => {
        let dx = e.changedTouches[0].screenX - touchStartX;
        let dy = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(dx) > 70 && Math.abs(dy) < 60) {
            if (dx < 0) window.playNext(); else window.playPrev();
        }
    }, {passive:true});
};
window.initSwipeGestures();

// Khởi chạy
window.loadMusic();

// COMMENT SYSTEM (GUEST VIEW)
window.toggleCommentsMobile = () => {
    let overlay = document.getElementById('fsCommentsOverlayMobile');
    if(overlay) {
        let isOpening = overlay.style.display === 'none';
        overlay.style.display = isOpening ? 'flex' : 'none';
        if(isOpening) window.renderBinhLuan();
    }
}

window.renderBinhLuan = async () => {
    let song = danhSachGoc[currentSongIndex];
    if(!song) return;
    
    let listDesk = document.getElementById('commentListDesk');
    let listMob = document.getElementById('commentListMobile');
    if(!listDesk && !listMob) return;

    let allUsers = [];
    try {
        let res = await fetch(ACCOUNTS_API);
        allUsers = await res.json();
    } catch(e) {}

    let cms = [];
    try {
        cms = Array.isArray(song.comment_ext) ? song.comment_ext : (song.comment_ext ? JSON.parse(song.comment_ext) : []);
    } catch(e) { cms = []; }

    let html = cms.length === 0 ? `<div style="text-align:center; color:var(--text-secondary); padding:20px; font-size:13px;">Chưa có bình luận nào. Hãy là người đầu tiên! 🎤</div>` : "";
    
    [...cms].sort((a,b) => new Date(b.time) - new Date(a.time)).forEach(c => {
        let user = allUsers.find(u => u.id === c.uid || u.acc === c.uid);
        let userName = user ? (user.acc || user.user || "Người dùng ẩn danh") : "Tài khoản không tồn tại";
        let userAva = user ? (user.avatar || user.aveta || "meo.jpg") : "meo.jpg";
        let timeStr = new Date(c.time).toLocaleString('vi-VN', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'});

        html += `
        <div class="comment-item">
            <img src="${userAva}" class="comment-avatar" onerror="this.src='meo.jpg'">
            <div class="comment-content">
                <div class="comment-info">
                    <span class="comment-user">${userName}</span>
                    <span class="comment-time">${timeStr}</span>
                </div>
                <div class="comment-text">${c.text}</div>
            </div>
        </div>`;
    });

    if(listDesk) listDesk.innerHTML = html;
    if(listMob) listMob.innerHTML = html;
}

window.guiBinhLuan = async (type) => {
    showToast("Bạn cần đăng nhập để bình luận bài hát nhé! 😊", "info", 5000, () => window.openAuthModal());
}

window.fsSwitchSideTabDesk = (tab, el) => {
    let p = document.getElementById('fsPlaylistDesk');
    let l = document.getElementById('fsLyricsContainerDesk');
    let c = document.getElementById('fsCommentsContainerDesk');
    if(!p || !l || !c) return;
    let tabs = el.parentElement.querySelectorAll('span');
    tabs.forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    
    p.style.display = (tab === 'upnext' ? 'block' : 'none');
    l.style.display = (tab === 'lyrics' ? 'flex' : 'none');
    c.style.display = (tab === 'comments' ? 'flex' : 'none');
    
    if(tab === 'comments') window.renderBinhLuan();
}
