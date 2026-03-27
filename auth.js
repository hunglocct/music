// auth.js - File xử lý bảo mật tài khoản Quản trị
// Sử dụng mã hóa Base64 cơ bản để tránh bị lộ chuỗi văn bản thuần (plaintext) khi F12

const _u = 'YWRtaW4=';
const _p = 'YWRtaW4xMjNAQA==';

window.isAdmin = function(acc, pass) {
    try {
        return btoa(acc) === _u && btoa(pass) === _p;
    } catch(e) {
        return false;
    }
};
