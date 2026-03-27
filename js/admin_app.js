
let baiHat = [];
let accounts = [];
let currentSongEditId = null;
let currentAccEditId = null;

// --- DYNAMIC VIEW ROUTING (SPA) ---
window.switchView = (viewId, el) => {
    document.querySelectorAll('.admin-view').forEach(v => {
        v.style.display = 'none';
        v.classList.remove('active');
    });
    
    let target = document.getElementById(viewId);
    if(target) {
        target.style.display = 'block';
        target.classList.add('active'); // trigger fade in if any
    }

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(nav => nav.classList.remove('active'));
    if(el) el.classList.add('active');

    const breadcrumb = document.getElementById('top-breadcrumb');
    if(viewId === 'view-dashboard') breadcrumb.innerText = 'Admin / Tổng quan';
    if(viewId === 'view-songs') breadcrumb.innerText = 'Admin / Quản lý bài hát';
    if(viewId === 'view-accounts') breadcrumb.innerText = 'Admin / Quản lý tài khoản';
    if(viewId === 'view-demo') breadcrumb.innerText = 'Admin / Trải nghiệm User';

    if(viewId === 'view-dashboard') window.loadDashboardStats();
    if(viewId === 'view-songs') window.loadSongs();
    if(viewId === 'view-accounts') window.loadAccounts();
}

// --- DASHBOARD LOGIC ---
window.loadDashboardStats = async () => {
    try {
        let res = await fetch(SONGS_API);
        let songs = await res.json();
        document.getElementById('totalSongs').innerText = songs.length;
        let tongNghe = songs.reduce((tong, bai) => tong + (Number(bai.listens) || 0), 0);
        document.getElementById('totalViews').innerText = tongNghe;
    } catch(e) {}
}

// --- SONGS LOGIC ---
window.loadSongs = async () => {
    let response = await fetch(SONGS_API);
    baiHat = await response.json();
    window.renderSongs();
}

window.renderSongs = (filteredList = null) => {
    let list = filteredList || baiHat;
    let dis = "";
    list.forEach(item => {
        dis += `<tr>
            <td style="padding:0; width:50px;"><img src="${item.aveta || './meo.jpg'}" style="width:40px; height:40px; border-radius:8px; display:block; margin:auto; object-fit:cover;"></td>
            <td><b style="color:var(--text-primary);">${item.name}</b><br><small style="color:var(--text-secondary);">${item.artist}</small></td>
            <td><span style="background:var(--bg-card-hover); padding:4px 8px; border-radius:4px; font-size:12px;">${item.category}</span></td>
            <td><span style="background:var(--bg-card-hover); padding:4px 8px; border-radius:4px; font-size:12px; color:var(--accent-pink);">${item.classify || '---'}</span></td>
            <td><i class="fa-solid fa-headphones" style="color:var(--accent-pink);"></i> ${item.listens}</td>
            <td><audio controls src="${item.link}" style="height:30px; width:150px;"></audio></td>
            <td>
                <button class="edit-btn" onclick="window.editSong('${item.id}')">Sửa</button>
                <button class="del-btn" onclick="window.delSong('${item.id}')">Xóa</button>
            </td>
        </tr>`;
    });
    document.getElementById('songTable').innerHTML = dis;
}

window.filterSongsAdmin = () => {
    let kw = document.getElementById('searchSongAdmin') ? document.getElementById('searchSongAdmin').value.toLowerCase() : '';
    let filtered = baiHat.filter(b => 
        (b.name || '').toLowerCase().includes(kw) || 
        (b.artist || '').toLowerCase().includes(kw) || 
        (b.category || '').toLowerCase().includes(kw) || 
        (b.classify || '').toLowerCase().includes(kw)
    );
    window.renderSongs(filtered);
}

window.saveMus = async () => {
    let name = document.getElementById('title').value;
    let artist = document.getElementById('artist').value;
    let link = document.getElementById('link').value;
    let aveta = document.getElementById('aveta').value;
    let category = document.getElementById('category').value;
    let classify = document.getElementById('classify').value;
    let listens = document.getElementById('listens').value;
    let lyricsEl = document.getElementById('lyrics');
    let lyrics = lyricsEl ? lyricsEl.value : '';

    if (!name || !artist) { showToast("Thiếu tên bài hoặc ca sĩ!", "error"); return; }
    let payload = { name, artist, link, aveta, category, classify, listens: Number(listens) || 0, lyrics };

    if (currentSongEditId) {
        await fetch(`${SONGS_API}/${currentSongEditId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        currentSongEditId = null;
        document.querySelector('#view-songs .btn-primary').innerText = '+ Lưu Bài Hát';
    } else {
        await fetch(SONGS_API, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
    }
    
    document.querySelectorAll('#view-songs input, #view-songs textarea, #view-songs select').forEach(el => el.value = '');
    window.loadSongs();
}

window.editSong = (id) => {
    let song = baiHat.find(b => b.id === id);
    if (song) {
        document.getElementById('title').value = song.name || '';
        document.getElementById('artist').value = song.artist || '';
        document.getElementById('category').value = song.category || '';
        document.getElementById('classify').value = song.classify || '';
        document.getElementById('link').value = song.link || '';
        document.getElementById('aveta').value = song.aveta || '';
        document.getElementById('listens').value = song.listens || 0;
        let lEl = document.getElementById('lyrics'); if (lEl) lEl.value = song.lyrics || '';
        currentSongEditId = id;
        document.querySelector('#view-songs .btn-primary').innerText = 'Cập Nhật';
    }
}

window.delSong = async (id) => {
    if(confirm("Xóa bài này thật nhé? 🥺")) {
        await fetch(`${SONGS_API}/${id}`, { method: 'DELETE' });
        window.loadSongs();
    }
}

// --- ACCOUNTS LOGIC ---
window.loadAccounts = async () => {
    let response = await fetch(ACC_API);
    accounts = await response.json();
    window.renderAccounts(); 
}

window.renderAccounts = () => {
    let dis = "";
    accounts.forEach(item => {
        dis += `<tr>
            <td style="font-weight:bold; color:var(--text-secondary);">#${item.id}</td>
            <td><b style="color:var(--accent-pink);">${item.acc}</b></td>
            <td>${item.email || 'Chưa co'}</td>
            <td>
                <span id="pass-txt-${item.id}">***</span>
                <i class="fa-solid fa-eye" style="cursor:pointer; margin-left:8px; color:var(--text-secondary);" onclick="window.togglePass('${item.id}', '${item.pass}', this)" title="Hiện/Ẩn"></i>
            </td>
            <td>
                <button class="edit-btn" onclick="window.editAcc('${item.id}')">Sửa</button>
                <button class="del-btn" onclick="window.delAcc('${item.id}')">Xóa</button>
            </td>
        </tr>`;
    });
    document.getElementById('accountTable').innerHTML = dis;
}

window.togglePass = (id, realPass, iconEl) => {
    let el = document.getElementById(`pass-txt-${id}`);
    if (el.innerText === '***') {
        el.innerText = realPass;
        iconEl.classList.remove('fa-eye');
        iconEl.classList.add('fa-eye-slash');
    } else {
        el.innerText = '***';
        iconEl.classList.remove('fa-eye-slash');
        iconEl.classList.add('fa-eye');
    }
}

window.saveAcc = async () => {
    let acc = document.getElementById('acc').value.trim();
    let email = document.getElementById('email').value.trim();
    let pass = document.getElementById('pass').value.trim();

    if (!acc || !pass) { showToast("Thiếu tên đăng nhập hoặc mật khẩu!", "error"); return; }
    let payload = { acc, email, pass };

    if (currentAccEditId) {
        await fetch(`${ACC_API}/${currentAccEditId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        currentAccEditId = null;
        document.querySelector('#view-accounts .btn-primary').innerText = '+ Lưu Tài Khoản';
    } else {
        await fetch(ACC_API, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload) 
        });
    }
    
    document.querySelectorAll('#view-accounts input').forEach(el => el.value = ''); 
    window.loadAccounts(); 
}

window.editAcc = (id) => {
    let accObj = accounts.find(b => b.id === id);
    if (accObj) {
        document.getElementById('acc').value = accObj.acc || '';
        document.getElementById('email').value = accObj.email || '';
        document.getElementById('pass').value = accObj.pass || '';
        currentAccEditId = id;
        document.querySelector('#view-accounts .btn-primary').innerText = 'Cập Nhật';
    }
}

window.delAcc = async (id) => {
    if (confirm("Xóa tài khoản này thật nhé? 🥺")) {
        await fetch(`${ACC_API}/${id}`, { method: 'DELETE' });
        window.loadAccounts(); 
    }
}

// --- AUTH & THEME GLOBALS ---
function checkAdminAuth() {
    let savedUser = localStorage.getItem('currentUser');
    if(!savedUser) { window.location.href = "dawngnhap.html"; return; }
    let userObj = JSON.parse(savedUser);
    if(!window.isAdmin || !window.isAdmin(userObj.acc, userObj.pass)) {
        showToast("Bạn không phải Quản trị viên!", "error");
        window.location.href = "app.html";
    }
}
checkAdminAuth();

window.logout = () => {
    if(confirm("Bạn muốn đăng xuất?")) {
        localStorage.removeItem('currentUser');
        window.location.href = "dawngnhap.html";
    }
}

// --- DYNAMIC GREETING ---
window.updateAdminGreeting = () => {
    const hour = new Date().getHours();
    let buổi = "Tối";
    if (hour >= 5 && hour < 11) buổi = "Sáng";
    else if (hour >= 11 && hour < 13) buổi = "Trưa";
    else if (hour >= 13 && hour < 18) buổi = "Chiều";
    
    const el = document.getElementById('adminGreeting');
    if(el) el.innerHTML = `Chào buổi ${buổi}`;
}

// KHỞI TẠO MẶC ĐỊNH
window.loadDashboardStats();
window.updateAdminGreeting();
