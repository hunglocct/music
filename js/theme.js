// js/theme.js - Quản lý giao diện Sáng/Tối và Màu sắc (Đã tối ưu chống nháy)

// 1. Hàm đồng bộ trạng thái Checkbox và UI khi DOM sẵn sàng
function initThemeUI() {
    const themeCheckbox = document.getElementById('themeCheckbox');
    if(!themeCheckbox) return;

    // Lấy theme hiện tại (đã được script ở HEAD áp dụng class vào html)
    const currentTheme = localStorage.getItem('hmusic-theme') || 'dark';
    themeCheckbox.checked = (currentTheme === 'dark');

    themeCheckbox.addEventListener('change', (e) => {
        const newTheme = e.target.checked ? 'dark' : 'light';
        localStorage.setItem('hmusic-theme', newTheme);
        
        document.documentElement.classList.remove('light-mode', 'dark-mode');
        document.documentElement.classList.add(newTheme === 'light' ? 'light-mode' : 'dark-mode');

        // Đồng bộ các iframe (như trong trang Admin)
        const iframe = document.querySelector('iframe');
        if(iframe) {
            try { 
                iframe.contentWindow.location.reload(); 
            } catch(err) {
                iframe.src = iframe.src;
            }
        }
    });

    // 2. Xử lý Bảng màu (Color Palette)
    const menu = document.getElementById('globalThemeMenu');
    if(menu) {
        const colorOptions = menu.querySelectorAll('.color-option');
        colorOptions.forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                const selectedColor = opt.getAttribute('data-theme');
                document.documentElement.setAttribute('data-theme', selectedColor);
                localStorage.setItem('hmusic-color-theme', selectedColor);
                
                // Đồng bộ iframe
                const iframe = document.querySelector('iframe');
                if(iframe) iframe.src = iframe.src;
                
                menu.style.display = 'none';
            });
        });
    }
}

// Chạy khởi tạo UI khi trang tải xong
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeUI);
} else {
    initThemeUI();
}

// --- CÁC HÀM TIỆN ÍCH GLOBAL ---

// Toggle Menu chọn màu
window.toggleThemeMenu = (e) => {
    if(e) e.stopPropagation();
    const menu = document.getElementById('globalThemeMenu');
    if(!menu) return;
    
    if (menu.style.display === 'flex') {
        menu.style.display = 'none';
    } else {
        menu.style.display = 'flex';
        // Tự động định vị
        if (window.innerWidth <= 768) {
            menu.style.top = '65px';
            menu.style.left = '16px';
        } else {
            menu.style.top = '85px';
            menu.style.left = '24px';
        }
    }
};

// Đóng menu khi click ra ngoài
document.addEventListener('click', (e) => {
    const menu = document.getElementById('globalThemeMenu');
    if (menu && !menu.contains(e.target)) {
        menu.style.display = 'none';
    }
});

// Fallback ảnh lỗi (Hiện meo.jpg)
window.addEventListener('error', function(e) {
    if (e.target.tagName && e.target.tagName.toLowerCase() === 'img') {
        if (!e.target.dataset.fallbackApplied) {
            e.target.dataset.fallbackApplied = 'true';
            e.target.src = './meo.jpg';
        }
    }
}, true);
