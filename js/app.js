// --- XÁC THỰC NGƯỜI DÙNG ---
        async function checkAuth() {
            let savedUser = localStorage.getItem('currentUser');
            if(!savedUser) {
                window.location.href = "dawngnhap.html";
                return;
            }
            let userObj = JSON.parse(savedUser);

            // Bỏ qua check DB nếu là Admin
            if (window.isAdmin && window.isAdmin(userObj.acc, userObj.pass)) {
                document.getElementById('userProfileName').innerHTML = `<img src="meo.jpg" alt="Admin" onerror="this.src='meo.jpg'"> Quản trị viên <i class="fa-solid fa-right-from-bracket" style="padding: 0 4px;" title="Đăng Xuất"></i>`;
                return; 
            }

            // Gán hiển thị Profile 
            document.getElementById('userProfileName').innerHTML = `<img src="${userObj.avatar}" alt="Avatar" onerror="this.src='meo.jpg'"> ${userObj.acc} <i class="fa-solid fa-right-from-bracket" style="padding: 0 4px;" title="Đăng Xuất"></i>`;
            
            // Background check với DB để đề phòng localStorage bị sửa giả mạo
            try {
                let res = await fetch(ACCOUNTS_API);
                if(res.ok) {
                    let users = await res.json();
                    let isValid = users.find(u => u.acc === userObj.acc && u.pass === userObj.pass);
                    if(!isValid) {
                        localStorage.removeItem('currentUser');
                        window.location.href = "dawngnhap.html";
                    }
                }
            } catch(e) {}
        }
        checkAuth();

        window.logout = () => {
            if(confirm("Bạn muốn đăng xuất khỏi H-MUSIC?")) {
                localStorage.removeItem('currentUser');
                window.location.href = "dawngnhap.html";
            }
        }

        let danhSachGoc = []; 
        let currentSongIndex = -1;
        let isPlaying = false;
        let daNghe = {}; 
        let lastSkipDirection = 'next'; // 'next' hoặc 'prev'

        const audio = document.getElementById('mainAudio');
        const btnPlayPause = document.getElementById('btnPlayPause');
        const progressBar = document.getElementById('progressBar');
        const progressThumb = document.getElementById('progressThumb');
        const timeCurrent = document.getElementById('timeCurrent');
        const timeTotal = document.getElementById('timeTotal');

        // [TẢI DỮ LIỆU TỪ MOCKAPI]
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

                // Sắp xếp bài list ra thẻ content theo view cao nhất (giữ logic cũ cho grid chính)
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

        // --- LOGIC GIAO DIỆN & TÌM KIẾM ---
        let hienThiCheDo = 'trangchu';
        let customPlaylistQueue = [];
        let currentQueueType = 'goc'; // 'goc' hoặc 'custom'

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

        window.hienThiTimKiem = () => {
            hienThiCheDo = 'search';
            setActiveNav('nav-search');
            const rankingSection = document.getElementById('rankingSection');
            if(rankingSection) rankingSection.style.display = 'none';

            let title = document.getElementById('pageTitle');
            if(title) title.innerText = 'Khám phá âm nhạc';
            
            // Inject mobile search bar if on mobile
            const grid = document.getElementById('songGrid');
            if (window.innerWidth <= 768) {
                // We'll prepend it to the content area or manage it via songGrid
                // For simplicity, let's put it at the very top of songGrid during render
            }
            window.timKiem();
        };

        window.hienThiYeuThich = () => {
            let userStr = localStorage.getItem('currentUser');
            if(!userStr) { showToast("Vui lòng đăng nhập để xem Nhạc Yêu Thích!", "info"); return; }
            hienThiCheDo = 'yeuthich';
            setActiveNav('nav-fav');
            const rankingSection = document.getElementById('rankingSection');
            if(rankingSection) rankingSection.style.display = 'none';

            let title = document.getElementById('pageTitle');
            if(title) title.innerText = 'Nhạc Yêu Thích Của Bạn';
            window.timKiem();
        };

        window.hienThiMyPlaylist = () => {
            let userStr = localStorage.getItem('currentUser');
            if(!userStr) { showToast("Vui lòng đăng nhập!", "info"); return; }
            hienThiCheDo = 'myplaylist';
            setActiveNav('nav-playlist');
            const rankingSection = document.getElementById('rankingSection');
            if(rankingSection) rankingSection.style.display = 'none';

            let title = document.getElementById('pageTitle');
            if(title) title.innerText = 'Danh Sách Phát Của Tôi';
            window.renderMyPlaylist();
        };

        window.hienThiLichSu = () => {
            let userStr = localStorage.getItem('currentUser');
            if(!userStr) { showToast("Vui lòng đăng nhập!", "info"); return; }
            hienThiCheDo = 'history';
            setActiveNav('nav-history');
            const rankingSection = document.getElementById('rankingSection');
            if(rankingSection) rankingSection.style.display = 'none';

            let title = document.getElementById('pageTitle');
            if(title) title.innerText = 'Lịch Sử Nghe Gần Đây';
            window.timKiem();
        };

        window.hienThiThuVien = () => {
            let userStr = localStorage.getItem('currentUser');
            if(!userStr) { showToast("Vui lòng đăng nhập để xem Thư Viện!", "info"); return; }
            let user = JSON.parse(userStr);
            
            hienThiCheDo = 'library';
            setActiveNav('nav-library');
            const rankingSection = document.getElementById('rankingSection');
            if(rankingSection) rankingSection.style.display = 'none';

            let title = document.getElementById('pageTitle');
            if(title) title.innerText = 'Thư Viện Của Bạn';
            
            const grid = document.getElementById('songGrid');
            grid.style.display = 'block';

            let favArr = user.like || [];
            let histArr = user.history || [];
            let createArr = user.create || [];

            let buildGridItem = (song, idxInGlobal) => `
                <div class="card" onclick="window.playSong(${idxInGlobal})" style="flex: 0 0 160px; margin-right: 15px;">
                    <div class="card-img-wrapper" style="position:relative;">
                        <img src="${song.aveta || 'meo.jpg'}" alt="cover" onerror="this.src='meo.jpg'">
                        <button class="play-btn-card"><i class="fa-solid fa-play"></i></button>
                    </div>
                    <div style="margin-top:12px; overflow:hidden;">
                        <div class="card-title" title="${song.name}" style="white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${song.name}</div>
                        <div class="card-desc" style="white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${song.artist}</div>
                    </div>
                </div>
            `;

            let histHtml = '';
            histArr.forEach(idStr => {
                let s = danhSachGoc.find(x => x.id.toString() === idStr);
                let gi = danhSachGoc.findIndex(x => x.id.toString() === idStr);
                if(s) histHtml += buildGridItem(s, gi);
            });

            let favHtml = '';
            favArr.forEach(idStr => {
                let s = danhSachGoc.find(x => x.id.toString() === idStr);
                let gi = danhSachGoc.findIndex(x => x.id.toString() === idStr);
                if(s) favHtml += buildGridItem(s, gi);
            });
            
            let createHtml = '';
            customPlaylistQueue = [];
            createArr.forEach(idStr => {
                let s = danhSachGoc.find(x => x.id.toString() === idStr);
                if(s) customPlaylistQueue.push(s);
            });

            customPlaylistQueue.forEach((song, index) => {
                createHtml += `
                <div class="playlist-row" draggable="true" ondragstart="window.dragStart(event, ${index})" ondragover="window.dragOver(event)" ondrop="window.drop(event, ${index})" 
                     style="display: flex; align-items: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; cursor: grab; margin-bottom: 10px;">
                    <i class="fa-solid fa-grip-lines" style="margin-right: 15px; color: var(--text-secondary);"></i>
                    <img src="${song.aveta || 'meo.jpg'}" style="width: 40px; height: 40px; border-radius: 5px; margin-right: 15px;" onerror="this.src='meo.jpg'">
                    <div style="flex: 1; overflow:hidden;" onclick="window.playCustomPlaylistSong(${index})">
                        <div style="font-weight: bold; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${song.name}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${song.artist}</div>
                    </div>
                    <button onclick="window.playCustomPlaylistSong(${index})" style="background:var(--accent-pink); color:#fff; border:none; border-radius:50%; width:30px; height:30px; cursor:pointer; margin-right:15px;"><i class="fa-solid fa-play"></i></button>
                    <button onclick="window.removeFromPlaylist(${index})" style="background:none; border:none; color:#ff4d4d; cursor:pointer;" title="Xóa"><i class="fa-solid fa-trash"></i></button>
                </div>`;
            });

            grid.innerHTML = `
                <div style="margin-bottom: 40px;">
                    <h3 style="color:white; margin-bottom:15px; font-size:20px;">Lịch Sử Nghe Gần Đây <span style="font-size:12px; color:var(--text-secondary); cursor:pointer; margin-left:10px; font-weight:normal;" onclick="window.hienThiLichSu()">Xem tất cả</span></h3>
                    <div style="display:flex; overflow-x:auto; padding-bottom:10px; scrollbar-width:thin;">
                        ${histHtml || '<p style="color:var(--text-secondary)">Chưa có lịch sử vòng đời.</p>'}
                    </div>
                </div>

                <div style="margin-bottom: 40px;">
                    <h3 style="color:white; margin-bottom:15px; font-size:20px;">Nhạc Yêu Thích <span style="font-size:12px; color:var(--text-secondary); cursor:pointer; margin-left:10px; font-weight:normal;" onclick="window.hienThiYeuThich()">Xem tất cả</span></h3>
                    <div style="display:flex; overflow-x:auto; padding-bottom:10px; scrollbar-width:thin;">
                        ${favHtml || '<p style="color:var(--text-secondary)">Chưa thả tim bài hát nào.</p>'}
                    </div>
                </div>

                <div style="margin-bottom: 40px;">
                    <h3 style="color:white; margin-bottom:15px; font-size:20px;">Danh Sách Phát Của Tôi <span style="font-size:12px; color:var(--text-secondary); cursor:pointer; margin-left:10px; font-weight:normal;" onclick="window.hienThiMyPlaylist()">Chỉnh sửa chi tiết</span></h3>
                    <div style="display:flex; flex-direction:column;">
                        ${createHtml || '<p style="color:var(--text-secondary)">Danh sách phát trống.</p>'}
                    </div>
                </div>
            `;
        };

        window.addToPlaylist = async (songId) => {
            let userStr = localStorage.getItem('currentUser');
            if(!userStr) { showToast("Vui lòng đăng nhập!", "info"); return; }
            let user = JSON.parse(userStr);
            if(window.isAdmin && window.isAdmin(user.acc, user.pass)) { showToast("Quản trị viên không hỗ trợ!", "warning"); return; }
            
            if(!user.create) user.create = [];
            let idStr = songId.toString();
            if (user.create.includes(idStr)) {
                showToast("Bài hát đã có trong danh sách phát của bạn!", "info");
                return;
            }
            user.create.push(idStr);
            localStorage.setItem('currentUser', JSON.stringify(user));
            showToast("Đã thêm vào Danh Sách Phát!", "success");
            
            try {
                await fetch(ACCOUNTS_API + '/' + user.id, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ create: user.create })
                });
            } catch(e) {}
        };

        window.toggleLike = async (songId) => {
            let userStr = localStorage.getItem('currentUser');
            if(!userStr) {
                showToast("Vui lòng đăng nhập để yêu thích!", "warning");
                return;
            }
            let user = JSON.parse(userStr);
            if(window.isAdmin && window.isAdmin(user.acc, user.pass)) {
                showToast("Quản trị viên không hỗ trợ!", "warning");
                return;
            }
            if(!user.like) user.like = [];
            
            let idStr = songId.toString();
            let idx = user.like.indexOf(idStr);
            if(idx > -1) {
                user.like.splice(idx, 1);
            } else {
                user.like.push(idStr);
            }
            // Mảng đã update => Gán lại lên LocalStorage
            localStorage.setItem('currentUser', JSON.stringify(user));
            // Cập nhật giao diện
            window.timKiem();
            
            // Background push to DB
            try {
                await fetch(ACCOUNTS_API + '/' + user.id, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ like: user.like })
                });
            } catch(e) {}
        };

        window.isLiked = (songId) => {
            let userStr = localStorage.getItem('currentUser');
            if(!userStr) return false;
            let user = JSON.parse(userStr);
            if(!user.like) return false;
            return user.like.includes(songId.toString());
        };

        // --- LOGIC DANH SÁCH PHÁT (DRAG & DROP) ---
        let draggedIndex = -1;
        window.dragStart = (e, idx) => { draggedIndex = idx; };
        window.dragOver = (e) => { e.preventDefault(); };
        window.drop = async (e, droppedIndex) => {
            e.preventDefault();
            if(draggedIndex === -1 || draggedIndex === droppedIndex) return;

            let userStr = localStorage.getItem('currentUser');
            if(!userStr) return;
            let user = JSON.parse(userStr);
            let createArr = user.create || [];
            
            let movedId = createArr.splice(draggedIndex, 1)[0];
            createArr.splice(droppedIndex, 0, movedId);
            
            user.create = createArr;
            localStorage.setItem('currentUser', JSON.stringify(user));
            if(hienThiCheDo === 'library') window.hienThiThuVien();
            else window.renderMyPlaylist();

            try {
                await fetch(ACCOUNTS_API + '/' + user.id, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ create: user.create })
                });
            } catch(err) {}
        };

        window.removeFromPlaylist = async (indexInCustom) => {
            let userStr = localStorage.getItem('currentUser');
            if(!userStr) return;
            let user = JSON.parse(userStr);
            let createArr = user.create || [];
            
            createArr.splice(indexInCustom, 1);
            user.create = createArr;
            localStorage.setItem('currentUser', JSON.stringify(user));
            if(hienThiCheDo === 'library') window.hienThiThuVien();
            else window.renderMyPlaylist();

            try {
                await fetch(ACCOUNTS_API + '/' + user.id, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ create: user.create })
                });
            } catch(err) {}
        };

        window.renderMyPlaylist = () => {
            let userStr = localStorage.getItem('currentUser');
            let user = JSON.parse(userStr || "{}");
            let createArr = user.create || [];
            
            customPlaylistQueue = [];
            createArr.forEach(idStr => {
                let song = danhSachGoc.find(s => s.id.toString() === idStr);
                if(song) customPlaylistQueue.push(song);
            });

            const grid = document.getElementById('songGrid');
            if(customPlaylistQueue.length === 0) {
                grid.style.display = 'block';
                grid.innerHTML = `<div style="text-align:center; padding: 30px; color:var(--text-secondary);">Danh sách phát trống. Bấm dấu + trên thẻ nhạc để thêm.</div>`;
                return;
            }

            grid.style.display = 'flex';
            grid.style.flexDirection = 'column';
            grid.style.gap = '10px';

            let html = '';
            customPlaylistQueue.forEach((song, index) => {
                html += `
                <div class="playlist-row" draggable="true" ondragstart="window.dragStart(event, ${index})" ondragover="window.dragOver(event)" ondrop="window.drop(event, ${index})" 
                     style="display: flex; align-items: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; cursor: grab;">
                    <i class="fa-solid fa-grip-lines" style="margin-right: 15px; color: var(--text-secondary);"></i>
                    <img src="${song.aveta || 'meo.jpg'}" style="width: 40px; height: 40px; border-radius: 5px; margin-right: 15px;" onerror="this.src='meo.jpg'">
                    <div style="flex: 1; overflow:hidden;" onclick="window.playCustomPlaylistSong(${index})">
                        <div style="font-weight: bold; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${song.name}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${song.artist}</div>
                    </div>
                    <button onclick="window.playCustomPlaylistSong(${index})" style="background:var(--accent-pink); color:#fff; border:none; border-radius:50%; width:30px; height:30px; cursor:pointer; margin-right:15px;"><i class="fa-solid fa-play"></i></button>
                    <button onclick="window.removeFromPlaylist(${index})" style="background:none; border:none; color:#ff4d4d; cursor:pointer;" title="Xóa"><i class="fa-solid fa-trash"></i></button>
                </div>`;
            });
            grid.innerHTML = html;
        };

        window.recordHistory = async (songId) => {
            let userStr = localStorage.getItem('currentUser');
            if(!userStr) return;
            let user = JSON.parse(userStr);
            if(window.isAdmin && window.isAdmin(user.acc, user.pass)) return;
            
            if(!user.history) user.history = [];
            let idStr = songId.toString();
            
            let idx = user.history.indexOf(idStr);
            if(idx > -1) user.history.splice(idx, 1);
            user.history.unshift(idStr);
            if(user.history.length > 50) user.history.pop();
            
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            try {
                fetch(ACCOUNTS_API + '/' + user.id, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ history: user.history })
                });
            } catch(e) {}
        };

        // [VẼ NHẠC RA MÀN HÌNH]
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
                // Xác định Index thật của bài trong danhSachGoc
                let realIndex = danhSachGoc.findIndex(x => x.id === item.id);
                let liked = window.isLiked(item.id);
                
                // Phân loại: Nonstop hay Track (Dữ liệu ưu tiên field 'classify')
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
                            <div class="card-desc">
                                ${item.artist} • ${item.category || 'Music'}
                            </div>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <div class="song-badge ${badgeClass}">${badgeTxt}</div>
                            <button class="add-btn" onclick="event.stopPropagation(); window.addToPlaylist('${item.id}')" style="background:none; border:none; cursor:pointer; color: var(--text-secondary); font-size:18px; margin-right:8px;" title="Thêm vào Playlist">
                                <i class="fa-solid fa-plus"></i>
                            </button>
                            <button class="like-btn" onclick="event.stopPropagation(); window.toggleLike('${item.id}')" style="background:none; border:none; cursor:pointer; color: ${liked ? 'var(--accent-pink)' : 'var(--text-secondary)'}; font-size:18px;">
                                <i class="${liked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
            });

            grid.innerHTML = html;
        }

        // [TÌM KIẾM THEO KEYWORD BÀI/ARTIST]
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
                else if (type === 'artists') title.innerText = 'Nghệ Sĩ (Xếp Theo Tác Giả)';
                else if (type === 'albums') title.innerText = 'Album (Phân Theo Thể Loại)';
            }
            window.timKiem();
        };

        let searchTimeout;
        window.timKiemDelay = () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                window.timKiem();
            }, 600);
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
            
            if(hienThiCheDo === 'yeuthich') {
                let userStr = localStorage.getItem('currentUser');
                if(userStr) {
                    let user = JSON.parse(userStr);
                    let likeArr = user.like || [];
                    baseList = baseList.filter(s => likeArr.includes(s.id.toString()));
                }
            } else if(hienThiCheDo === 'history') {
                let userStr = localStorage.getItem('currentUser');
                if(userStr) {
                    let user = JSON.parse(userStr);
                    let histArr = user.history || [];
                    baseList = [];
                    histArr.forEach(idStr => {
                        let s = danhSachGoc.find(x => x.id.toString() === idStr);
                        if(s) baseList.push(s);
                    });
                }
            } else if(hienThiCheDo === 'trangchu') {
                if (window.currentTabType === 'playlists') {
                    baseList.sort((a, b) => (Number(b.listens) || 0) - (Number(a.listens) || 0));
                } else if (window.currentTabType === 'artists') {
                    baseList.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
                } else if (window.currentTabType === 'albums') {
                    baseList.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
                }
            } else if(hienThiCheDo === 'search') {
                // Trong chế độ tìm kiếm, ta luôn search trên toàn bộ danhSachGoc
                baseList = [...danhSachGoc];
            }

            let ketQua = baseList.filter(bai => 
                bai.name.toLowerCase().includes(tuKhoa) || 
                bai.artist.toLowerCase().includes(tuKhoa) ||
                (bai.category && bai.category.toLowerCase().includes(tuKhoa)) 
            );
            window.renderNhac(ketQua); 
        }

        window.syncDesktopFS = (song) => {
            const fsImgDesk = document.getElementById('fsImageDesk');
            if (fsImgDesk) { fsImgDesk.src = song.aveta || 'meo.jpg'; fsImgDesk.onerror = () => fsImgDesk.src = 'meo.jpg'; }
            let dTitle = document.getElementById('fsTitleDesk'); if(dTitle) dTitle.innerText = song.name;
            let dArt = document.getElementById('fsArtistDesk'); if(dArt) dArt.innerText = song.artist;
            
            const fsMiniImgDesk = document.getElementById('fsMiniImageDesk');
            if (fsMiniImgDesk) { fsMiniImgDesk.src = song.aveta || 'meo.jpg'; fsMiniImgDesk.onerror = () => fsMiniImgDesk.src = 'meo.jpg'; }
            // Note: In case we have a typo in code above, let's make it robust
            let dImgMini = document.getElementById('fsMiniImageDesk'); if(dImgMini) { dImgMini.src = song.aveta || 'meo.jpg'; dImgMini.onerror = () => dImgMini.src = 'meo.jpg'; }
            
            let dTitleMini = document.getElementById('fsMiniTitleDesk'); if(dTitleMini) dTitleMini.innerText = song.name;
            let dArtMini = document.getElementById('fsMiniArtistDesk'); if(dArtMini) dArtMini.innerText = song.artist;
            let deskLike = document.getElementById('fsLikeIconDesk');
            if(deskLike) {
                 if(window.isLiked(song.id)) { deskLike.className = 'fa-solid fa-heart liked'; deskLike.style.color = 'var(--accent-pink)'; }
                 else { deskLike.className = 'fa-regular fa-heart'; deskLike.style.color = '#94a3b8'; }
                 deskLike.setAttribute('data-id', song.id);
            }
            let deskLyrics = document.getElementById('fsLyricsDesk');
            if(deskLyrics) {
                 deskLyrics.innerText = (song.lyrics && song.lyrics.trim() !== '') ? song.lyrics : 'Không có lời bài hát';
                 let lcon = document.getElementById('fsLyricsContainerDesk'); if(lcon) lcon.scrollTop = 0;
            }
            if(window.renderFSPlaylistDesk) window.renderFSPlaylistDesk();
        }

        window.renderFSPlaylistDesk = () => {
            let queue = (currentQueueType === 'custom') ? customPlaylistQueue : danhSachGoc;
            let pContainer = document.getElementById('fsPlaylistDesk');
            if(!pContainer) return;
            let html = '';
            queue.forEach((s, i) => {
                let isPlaying = s.id === queue[currentSongIndex]?.id;
                let playingClass = isPlaying ? 'playing' : '';
                let titleColor = isPlaying ? 'color: var(--accent-pink);' : 'color: #fff;';
                let onClick = currentQueueType === 'custom' ? `event.stopPropagation(); window.playCustomPlaylistSong(${i})` : `event.stopPropagation(); window.playSong(${danhSachGoc.findIndex(x=>x.id===s.id)})`;
                html += `
                    <li class="${playingClass}" onclick="${onClick}">
                        <img src="${s.aveta || 'meo.jpg'}" alt="Thumb" onerror="this.src='meo.jpg'">
                        <div class="song-info">
                            <h4 style="${titleColor}">${s.name}</h4>
                            <p>${s.artist}</p>
                        </div>
                        <i class="fa-solid fa-ellipsis"></i>
                    </li>
                `;
            });
            pContainer.innerHTML = html;
        }

        window.toggleLikeDesk = () => {
             let btn = document.getElementById('fsLikeIconDesk');
             if(!btn) return;
             let id = btn.getAttribute('data-id');
             if(id) { 
                 window.toggleLike(id);
                 if(window.isLiked(id)) { btn.className = 'fa-solid fa-heart liked'; btn.style.color = 'var(--accent-pink)'; }
                 else { btn.className = 'fa-regular fa-heart'; btn.style.color = '#94a3b8'; }
             }
        }

        window.seekAudioRangeDesk = (val) => {
             if(audio.duration) audio.currentTime = (val / 100) * audio.duration;
        }
        window.seekVolumeRangeDesk = (val) => {
             audio.volume = val / 100;
             let deskVol = document.getElementById('fsVolumeRangeDesk');
             if(deskVol) deskVol.value = val;
             let volumeBar = document.getElementById('volumeBar');
             if(volumeBar) volumeBar.style.width = val + "%";
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

        // [CHƠI NHẠC]
        window.playCustomPlaylistSong = (index) => {
            currentQueueType = 'custom';
            if (index < 0 || index >= customPlaylistQueue.length) return;
            currentSongIndex = index;
            let song = customPlaylistQueue[index];
            window.playActual(song);
        };

        window.playSong = (index) => {
            currentQueueType = 'goc';
            if (index < 0 || index >= danhSachGoc.length) return;
            currentSongIndex = index;
            let song = danhSachGoc[index];
            window.playActual(song);
        };

        window.playActual = (song) => {
            // Cập nhật UI Bottom Player
            const npImg = document.getElementById('npImage');
            if (npImg) { npImg.src = song.aveta || 'meo.jpg'; npImg.onerror = () => npImg.src = 'meo.jpg'; }
            let npT = document.getElementById('npTitle'); if(npT) npT.innerText = song.name;
            let npA = document.getElementById('npArtist'); if(npA) npA.innerText = song.artist;

            // Update UI Fullscreen Player (Old/Shared)
            let fsImg = document.getElementById('fsImage');
            if (fsImg) { fsImg.src = song.aveta || 'meo.jpg'; fsImg.onerror = () => fsImg.src = 'meo.jpg'; }
            let fsT = document.getElementById('fsTitle');
            if (fsT) fsT.innerText = song.name;
            let fsA = document.getElementById('fsArtist');
            if (fsA) fsA.innerText = song.artist;

            // NEW MOBILE UI SYNC
            let fsImgMob = document.getElementById('fsImageMobile');
            if (fsImgMob) {
                fsImgMob.src = song.aveta || 'meo.jpg';
                fsImgMob.onerror = () => fsImgMob.src = 'meo.jpg';
                
                // Kích hoạt Animation chuyển bài
                let animClass = (lastSkipDirection === 'next') ? 'animate-next' : 'animate-prev';
                fsImgMob.classList.remove('animate-next', 'animate-prev');
                void fsImgMob.offsetWidth; // Trigger reflow
                fsImgMob.classList.add(animClass);
            }
            let fsTMob = document.getElementById('fsTitleMobile');
            if (fsTMob) fsTMob.innerText = song.name;
            let fsAMob = document.getElementById('fsArtistMobile');
            if (fsAMob) fsAMob.innerText = song.artist;
            
            // Cập nhật nền mờ
            let bgEl = document.getElementById('fsBgBlur');
            if (bgEl) bgEl.style.backgroundImage = `url('${song.aveta || ''}')` ;

            if(window.syncDesktopFS) window.syncDesktopFS(song);

            // Sự hiện số lượt nghe
            let countEl = document.getElementById('fsListenCount');
            if (countEl) countEl.innerText = song.listens || 0;
            
            let lyricsEl = document.getElementById('fsLyrics');
            let lyricsMobile = document.getElementById('fsLyricsMobile');
            let lyricsText = (song.lyrics && song.lyrics.trim() !== '') ? song.lyrics : 'Không có lời bài hát';
            if (lyricsEl) {
                lyricsEl.innerText = lyricsText;
                song.lyrics ? lyricsEl.classList.add('has-lyrics') : lyricsEl.classList.remove('has-lyrics');
                let lyricsBox = document.getElementById('fsLyricsContainer');
                if(lyricsBox) lyricsBox.scrollTop = 0;
            }
            if (lyricsMobile) {
                lyricsMobile.innerText = lyricsText;
            }

            // Xóa tự động bung Fullscreen, chỉ bung thanh điều khiển dưới
            let bottomBar = document.querySelector('.now-playing-bar');
            if(bottomBar) bottomBar.classList.add('active');

            // Đổi nguồn Audio và phát
            audio.src = song.link;
            audio.play();
            isPlaying = true;
            let playIconHtml = '<i class="fa-solid fa-pause"></i>';
            ['btnPlayPause', 'fsBtnPlayPause', 'fsBtnPlayPauseMobile', 'fsBtnPlayPauseDesk'].forEach(id => {
                let el = document.getElementById(id);
                if(el) el.innerHTML = playIconHtml;
            });

            // Gọi đếm lượt nghe và ghi sử
            window.tangLuotNghe(song.id);
            window.recordHistory(song.id);
        };


        window.togglePlay = () => {
            if (audio.src === "" || audio.src === window.location.href) {
                if(currentQueueType === 'custom' && customPlaylistQueue.length > 0) window.playCustomPlaylistSong(0);
                else if(danhSachGoc.length > 0) window.playSong(0);
                return;
            }
            if (isPlaying) {
                audio.pause();
                isPlaying = false;
                btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
                let fsBtn = document.getElementById('fsBtnPlayPause');
                if(fsBtn) fsBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                let mBtn = document.getElementById('fsBtnPlayPauseMobile');
                if(mBtn) mBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                let dBtn = document.getElementById('fsBtnPlayPauseDesk');
                if(dBtn) dBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            } else {
                audio.play();
                isPlaying = true;
                btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
                let fsBtn = document.getElementById('fsBtnPlayPause');
                if(fsBtn) fsBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                let mBtn = document.getElementById('fsBtnPlayPauseMobile');
                if(mBtn) mBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                let dBtn = document.getElementById('fsBtnPlayPauseDesk');
                if(dBtn) dBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            }
        }

        window.playNext = () => {
            lastSkipDirection = 'next';
            let queue = (currentQueueType === 'custom') ? customPlaylistQueue : danhSachGoc;
            if(queue.length === 0) return;
            let nextIdx = (currentSongIndex + 1) % queue.length;
            if (currentQueueType === 'custom') window.playCustomPlaylistSong(nextIdx);
            else window.playSong(nextIdx);
        }

        window.playPrev = () => {
            lastSkipDirection = 'prev';
            let queue = (currentQueueType === 'custom') ? customPlaylistQueue : danhSachGoc;
            if(queue.length === 0) return;
            let prevIdx = currentSongIndex - 1;
            if(prevIdx < 0) prevIdx = queue.length - 1;
            if (currentQueueType === 'custom') window.playCustomPlaylistSong(prevIdx);
            else window.playSong(prevIdx);
        }

        // [CẬP NHẬT THANH TIẾN TRÌNH AUDIO]
        function formatTime(seconds) {
            if (isNaN(seconds)) return "0:00";
            let m = Math.floor(seconds / 60);
            let s = Math.floor(seconds % 60);
            return m + ":" + (s < 10 ? "0" + s : s);
        }

        audio.addEventListener('timeupdate', () => {
            let curr = audio.currentTime;
            let total = audio.duration;
            timeCurrent.innerText = formatTime(curr);
            
            let fsTimeCurr = document.getElementById('fsTimeCurrent');
            if(fsTimeCurr) fsTimeCurr.innerText = formatTime(curr);

            if(total) {
                let percent = (curr / total) * 100;
                progressBar.style.width = percent + "%";
                progressThumb.style.left = percent + "%";
                
                let fsBar = document.getElementById('fsProgressBar');
                let fsThumb = document.getElementById('fsProgressThumb');
                if(fsBar) fsBar.style.width = percent + "%";
                if(fsThumb) fsThumb.style.left = percent + "%";

                let mBar = document.getElementById('fsProgressBarMobile');
                if(mBar) mBar.style.width = percent + "%";
                let mTime = document.getElementById('fsTimeCurrentMobile');
                if(mTime) mTime.innerText = formatTime(curr);
                
                let rDesk = document.getElementById('fsProgressRangeDesk');
                if(rDesk) rDesk.value = percent;
                let tDesk = document.getElementById('fsTimeCurrentDesk');
                if(tDesk) tDesk.innerText = formatTime(curr);
            }
        });

        audio.addEventListener('loadedmetadata', () => {
            timeTotal.innerText = formatTime(audio.duration);
            let fsTotal = document.getElementById('fsTimeTotal');
            if(fsTotal) fsTotal.innerText = formatTime(audio.duration);
            let mTotal = document.getElementById('fsTimeTotalMobile');
            if(mTotal) mTotal.innerText = formatTime(audio.duration);
            let dTotal = document.getElementById('fsTimeTotalDesk');
            if(dTotal) dTotal.innerText = formatTime(audio.duration);
        });

        audio.addEventListener('ended', () => {
            window.playNext(); // Auto nhảy bài
        });

        // [TUA NHẠC]
        window.seekAudio = (e) => {
            if(!audio.duration) return;
            const container = e.currentTarget;
            const rect = container.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audio.currentTime = percent * audio.duration;
        }

        // [CHỈNH ÂM LƯỢNG]
        window.seekVolume = (e) => {
            const container = e.currentTarget;
            const rect = container.getBoundingClientRect();
            let percent = (e.clientX - rect.left) / rect.width;
            if(percent < 0) percent = 0;
            if(percent > 1) percent = 1;
            audio.volume = percent;
            document.getElementById('volumeBar').style.width = (percent * 100) + "%";
            
            // Đổi icon volume
            const volIcon = container.parentElement.querySelector('button i');
            if (percent === 0) {
                volIcon.className = 'fa-solid fa-volume-xmark';
            } else if (percent < 0.5) {
                volIcon.className = 'fa-solid fa-volume-low';
            } else {
                volIcon.className = 'fa-solid fa-volume-high';
            }
        }

        // [TĂNG LƯỢT NGHE]
        window.tangLuotNghe = async (id) => {
            if (daNghe[id]) return; 
            daNghe[id] = true; 
            try {
                let theSpan = document.getElementById(`view-${id}`);
                if(theSpan) {
                    let newListens = Number(theSpan.innerText) + 1;
                    theSpan.innerText = newListens; 
                    
                    // Call API to Update (giữ nguyên gốc)
                    await fetch(`${API_URL}/${id}`, {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ listens: newListens })
                    });
                }
            } catch (error) {
                console.error("Lỗi:", error);
            }
        }

        // Khởi động
        window.loadMusic();

// ===== FULLSCREEN PLAYER MOBILE HELPERS & GESTURES =====
window.initSwipeGestures = () => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const fsPlayer = document.getElementById('fsPlayer');
    const albumArt = document.getElementById('fsImageMobile');

    if (!fsPlayer || !albumArt) return;

    // Handler for Fullscreen (Swipe Down to close)
    fsPlayer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, {passive: true});

    fsPlayer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        
        const deltaY = touchEndY - touchStartY;
        const deltaX = touchEndX - touchStartX;
        
        // Swipe Down (threshold 100px) -> Close
        if (deltaY > 100 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
            fsPlayer.classList.remove('active');
        }
    }, {passive: true});

    // Handler for Album Art (Swipe Left/Right to Skip)
    albumArt.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, {passive: true});

    albumArt.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        // Horizontal Swipe (threshold 70px)
        if (Math.abs(deltaX) > 70 && Math.abs(deltaY) < 60) {
            if (deltaX < 0) {
                window.playNext(); // Swipe Left -> Next
            } else {
                window.playPrev(); // Swipe Right -> Prev
            }
        }
    }, {passive: true});
};

// Khởi tạo cử chỉ vuốt
window.initSwipeGestures();

window.toggleLyricsMobile = () => {
    let overlay = document.getElementById('fsLyricsOverlayMobile');
    if(overlay) {
        overlay.style.display = (overlay.style.display === 'none' ? 'flex' : 'none');
    }
}

window.seekAudioMobile = (e) => {
    if(!audio.duration) return;
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
}

window.toggleLikeMobile = () => {
    let icon = document.getElementById('fsLikeIconMobile');
    if(icon) {
        // Toggle FontAwesome regular vs solid
        if (icon.classList.contains('fa-regular')) {
            icon.classList.remove('fa-regular');
            icon.classList.add('fa-solid', 'liked');
        } else {
            icon.classList.remove('fa-solid', 'liked');
            icon.classList.add('fa-regular');
        }
    }
}

// === COMMENT SYSTEM LOGIC ===
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
    
    // UI Containers
    let listDesk = document.getElementById('commentListDesk');
    let listMob = document.getElementById('commentListMobile');
    if(!listDesk && !listMob) return;

    // Fetch account list to check for existence
    let allUsers = [];
    try {
        let res = await fetch(ACCOUNTS_API);
        allUsers = await res.json();
    } catch(e) {}

    let currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let isAdmin = currentUser && window.isAdmin && window.isAdmin(currentUser.acc, currentUser.pass);

    // Parse comments
    let cms = [];
    try {
        cms = Array.isArray(song.comment_ext) ? song.comment_ext : (song.comment_ext ? JSON.parse(song.comment_ext) : []);
    } catch(e) { cms = []; }

    let html = cms.length === 0 ? `<div style="text-align:center; color:var(--text-secondary); padding:20px; font-size:13px;">Chưa có bình luận nào. Hãy là người đầu tiên! 🎤</div>` : "";
    
    // Sort by time descending
    [...cms].sort((a,b) => new Date(b.time) - new Date(a.time)).forEach(c => {
        let user = allUsers.find(u => u.id === c.uid || u.acc === c.uid);
        let userName = user ? (user.acc || user.user || "Người dùng ẩn danh") : "Tài khoản không tồn tại";
        let userAva = user ? (user.avatar || user.aveta || "meo.jpg") : "meo.jpg";
        let timeStr = new Date(c.time).toLocaleString('vi-VN', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'});

        let adminControls = isAdmin ? `
            <div class="comment-admin-controls">
                <button onclick="window.suaBinhLuan('${c.id}')" title="Sửa"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="window.xoaBinhLuan('${c.id}')" title="Xóa" style="color:#ff4d4d;"><i class="fa-solid fa-trash"></i></button>
            </div>
        ` : "";

        html += `
        <div class="comment-item">
            <img src="${userAva}" class="comment-avatar" onerror="this.src='meo.jpg'">
            <div class="comment-content">
                <div class="comment-info">
                    <div>
                        <span class="comment-user">${userName}</span>
                        <span class="comment-time">${timeStr}</span>
                    </div>
                    ${adminControls}
                </div>
                <div class="comment-text">${c.text}</div>
            </div>
        </div>`;
    });

    if(listDesk) listDesk.innerHTML = html;
    if(listMob) listMob.innerHTML = html;
}

window.guiBinhLuan = async (type) => {
    let input = document.getElementById(type === 'desk' ? 'commentInputDesk' : 'commentInputMobile');
    if(!input || !input.value.trim()) return;

    let user = JSON.parse(localStorage.getItem('currentUser'));
    if(!user) {
        showToast("Bạn cần đăng nhập để bình luận bài hát nhé! 😊", "info");
        return;
    }

    let song = danhSachGoc[currentSongIndex];
    let cms = [];
    try {
        cms = Array.isArray(song.comment_ext) ? song.comment_ext : (song.comment_ext ? JSON.parse(song.comment_ext) : []);
    } catch(e) { cms = []; }

    let newComment = {
        id: Date.now().toString(),
        uid: user.id || user.acc,
        text: input.value.trim(),
        time: new Date().toISOString()
    };

    cms.push(newComment);
    input.value = "";
    
    try {
        await fetch(`${API_URL}/${song.id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ comment_ext: cms })
        });
        song.comment_ext = cms;
        window.renderBinhLuan();
        showToast("Đã đăng bình luận! ✨", "success");
    } catch(e) {
        showToast("Lỗi khi gửi bình luận. Thử lại nhé!", "error");
    }
}

window.xoaBinhLuan = async (cid) => {
    if(!confirm("Bạn có chắc chắn muốn xóa bình luận này không?")) return;
    let song = danhSachGoc[currentSongIndex];
    let cms = Array.isArray(song.comment_ext) ? song.comment_ext : (song.comment_ext ? JSON.parse(song.comment_ext) : []);
    cms = cms.filter(c => c.id !== cid);

    try {
        await fetch(`${API_URL}/${song.id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ comment_ext: cms })
        });
        song.comment_ext = cms;
        window.renderBinhLuan();
        showToast("Đã xóa bình luận! 🗑️", "success");
    } catch(e) {
        showToast("Lỗi khi xóa bình luận.", "error");
    }
}

window.suaBinhLuan = async (cid) => {
    let song = danhSachGoc[currentSongIndex];
    let cms = Array.isArray(song.comment_ext) ? song.comment_ext : (song.comment_ext ? JSON.parse(song.comment_ext) : []);
    let cIndex = cms.findIndex(c => c.id === cid);
    if(cIndex === -1) return;

    let oldText = cms[cIndex].text;
    let newText = prompt("Chỉnh sửa bình luận:", oldText);
    if(newText === null || newText.trim() === "" || newText === oldText) return;

    cms[cIndex].text = newText.trim();

    try {
        await fetch(`${API_URL}/${song.id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ comment_ext: cms })
        });
        song.comment_ext = cms;
        window.renderBinhLuan();
        showToast("Đã cập nhật bình luận! 📝", "success");
    } catch(e) {
        showToast("Lỗi khi cập nhật bình luận.", "error");
    }
}

// Obsolete but kept for safety
window.fsSwitchTab = (tab, clickedEl) => {};
