

        // --- XỬ LÝ ĐĂNG NHẬP ---
        const ACCOUNTS_API_URL = "https://69c56e348a5b6e2dec2c7690.mockapi.io/accous";

        // 1. Tự động chuyển thẳng vào web nếu đã có tk hợp lệ ở LocalStorage
        window.onload = async () => {
            let savedUser = localStorage.getItem('currentUser');
            if(savedUser) {
                let userObj = JSON.parse(savedUser);
                
                // --- Xử lý Admin Bypass ---
                if (window.isAdmin && window.isAdmin(userObj.acc, userObj.pass)) {
                    window.location.href = "admin.html";
                    return;
                }

                try {
                    let res = await fetch(ACCOUNTS_API_URL);
                    let users = await res.json();
                    let isValid = users.find(u => u.acc === userObj.acc && u.pass === userObj.pass);
                    if(isValid) {
                        window.location.href = "app.html";
                    } else {
                        localStorage.removeItem('currentUser');
                    }
                } catch(e) {}
            }
        }

        // 2. Khớp API khi nhập form
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const acc = document.getElementById('loginAcc').value;
            const pass = document.getElementById('loginPass').value;
            const btn = document.querySelector('.login-btn');
            
            // --- Xử lý Admin Bypass ---
            if (window.isAdmin && window.isAdmin(acc, pass)) {
                localStorage.setItem('currentUser', JSON.stringify({acc: acc, pass: pass, role: 'admin'}));
                window.location.href = "admin.html";
                return;
            }

            try {
                btn.innerText = "Đang kiểm tra...";
                btn.disabled = true;
                
                let res = await fetch(ACCOUNTS_API_URL);
                let users = await res.json();
                
                let validUser = users.find(u => u.acc === acc && u.pass === pass);
                if(validUser) {
                    // Lưu trạng thái đăng nhập
                    localStorage.setItem('currentUser', JSON.stringify(validUser));
                    window.location.href = "app.html";
                } else {
                    showToast("Tên đăng nhập hoặc Mật khẩu không đúng!", "error");
                }
            } catch(err) {
                showToast("Lỗi kết nối máy chủ!", "error");
            } finally {
                btn.innerText = "Đăng Nhập";
                btn.disabled = false;
            }
        });
