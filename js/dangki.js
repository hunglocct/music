

        // --- XỬ LÝ ĐĂNG KÝ VỚI MOCKAPI ---
        // (Tên resource trên MockApi tuỳ theo ảnh là "accous")
        
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault(); // Ngăn trang tự tải lại
            
            const acc = document.getElementById('accInput').value;
            const email = document.getElementById('emailInput').value;
            const pass = document.getElementById('passInput').value;
            const btn = document.querySelector('.login-btn');
            
            if(!acc || !email || !pass) {
                showToast("Vui lòng điền đủ thông tin!", "warning");
                return;
            }

            // Kiểm tra tính hợp lệ cơ bản
            if(acc.length < 5 || acc.includes(" ")) {
                showToast("Tên đăng nhập phải có ít nhất 5 ký tự và không chứa khoảng trắng!", "warning");
                return;
            }
            if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showToast("Email không hợp lệ!", "warning");
                return;
            }
            if(pass.length < 6) {
                showToast("Mật khẩu phải từ 6 ký tự trở lên!", "warning");
                return;
            }

            const avatar = `https://ui-avatars.com/api/?name=${acc}&background=random`;

            try {
                btn.innerText = "Đang kiểm tra...";
                btn.disabled = true;

                // 1. Kiểm tra tài khoản đã tồn tại chưa
                let checkRes = await fetch(API_URL);
                if (checkRes.ok) {
                    let users = await checkRes.json();
                    let accountExists = users.some(u => u.acc === acc || u.email === email);
                    if (accountExists) {
                        showToast("Tên đăng nhập hoặc Email đã được sử dụng!", "error");
                        btn.innerText = "Đăng Ký";
                        btn.disabled = false;
                        return;
                    }
                }

                btn.innerText = "Đang xử lý...";

                // 2. Nếu hợp lệ thì mới đăng ký
                let response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        acc: acc,
                        email: email,
                        pass: pass,
                        avatar: avatar,
                        like: [], // Thiết lập mảng yêu thích sẵn
                        create: [], // Danh sách phát tùy chỉnh
                        history: [] // Lịch sử nghe
                    })
                });

                if(response.ok) {
                    showToast("Đăng ký thành công! Hãy đăng nhập hệ thống nhé.", "success");
                    window.location.href = "dawngnhap.html";
                } else {
                    showToast("Đăng ký thất bại, thử lại sau.", "error");
                }

            } catch (err) {
                alert("Lỗi kết nối máy chủ: " + err);
            } finally {
                btn.innerText = "Đăng Ký";
                btn.disabled = false;
            }
        });
