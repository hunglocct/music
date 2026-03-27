// 1. Cấu hình Link API của Hùng 
const API_URL = "https://69c56e348a5b6e2dec2c7690.mockapi.io/songs";

let baiHat = []; // Mảng chứa dữ liệu

// 2. Hàm Lấy dữ liệu từ Server về
window.layDuLieu = async () => {
    try {
        let response = await fetch(API_URL);
        baiHat = await response.json();
        console.log("✅ Dữ liệu từ MockAPI:", baiHat);
        window.disMu(); // Gọi hàm vẽ bảng
    } catch (error) {
        console.error("Lỗi lấy dữ liệu:", error);
    }
}

// 3. Hàm Hiển thị bảng HTML
window.disMu = () => {
    let dis = "";
    baiHat.forEach((item, i) => {
        dis += `<tr>
            <td>${i + 1}</td>
            <td>${item.name}</td>
            <td>${item.artist}</td>
            <td>
                <audio controls style="height: 30px;">
                    <source src="${item.link}" type="audio/mpeg">
                </audio>
            </td>
            <td>
                <button onclick="window.del('${item.id}')">Xóa</button>
            </td>
        </tr>`;
    });
    document.getElementById('songTable').innerHTML = dis;
}

// 4. Hàm Thêm bài hát
// 4. Hàm Thêm bài hát
window.addMus = async () => {
    let name = document.getElementById('title').value;
    let artist = document.getElementById('artist').value;
    
    // Lấy dữ liệu từ 2 ô mới thêm
    let link = document.getElementById('link').value;
    let aveta = document.getElementById('aveta').value;

    if (!name || !artist) {
        showToast("Vui lòng nhập đủ tên và tác giả!", "warning");
        return;
    }

    try {
        // Gửi dữ liệu lên Server MockAPI
        await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            // Đóng gói cả 4 thông tin (Nhớ dùng đúng chữ aveta theo bảng MockAPI của bạn)
            body: JSON.stringify({ 
                name: name, 
                artist: artist, 
                link: link, 
                aveta: aveta 
            })
        });
        
        showToast("Thêm bài hát thành công!", "success");
        
        // Làm sạch cả 4 ô nhập
        document.getElementById('title').value = ""; 
        document.getElementById('artist').value = "";
        document.getElementById('link').value = ""; 
        document.getElementById('aveta').value = ""; 
        
        window.layDuLieu(); // Tải lại bảng để thấy bài mới
    } catch (error) {
        showToast("Lỗi thêm nhạc: " + error, "error");
    }
}

// 5. Hàm Xóa bài hát
window.del = async (id) => {
    if (confirm("Bạn có chắc chắn muốn xóa bài này?")) {
        try {
            // Lệnh xóa trên Server
            await fetch(`${API_URL}/${id}`, { 
                method: 'DELETE' 
            });
            
            window.layDuLieu(); // Tải lại bảng
        } catch (error) {
            showToast("Lỗi khi xóa: " + error, "error");
        }
    }
}

// Chạy hàm lấy dữ liệu ngay khi mở trang web
window.layDuLieu();