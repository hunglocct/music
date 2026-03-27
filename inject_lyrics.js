const lyrics = `Người con gái anh từng yêu sao rồi?
Có một mình đi dưới mưa lúc buồn
Lệ còn rơi khi ngồi xem thước phim buồn
Ôm thật chặt vào ai khóc như đứa trẻ
Người con gái anh từng yêu quên rồi
Có những chiều tay nắm tay ngóng đợi
Hoàng hôn xuống ta kề vai nói những lời
Rằng đôi ta sẽ chỉ cần nhau thôi
Hà ha ha ha há ha hà ha
Cô gái anh yêu hay quan tâm anh và nhắc anh bao điều
Em thích hoa hồng và mùa đông, được anh ôm phía sau lưng
Em nói bên anh qua bao nơi em cảm thấy rất nhẹ nhàng
Vậy giờ ai là người cho em yên bình?
Em muốn xa anh khi yêu thương đang gìn giữ vẫn an lành
Xoá những hi vọng một tình yêu và hai trái tim xanh
Quên hết bao năm đi bên em anh thật không thể làm được
Người mình thương giờ chẳng nhớ tên quen thuộc
Người con gái anh từng yêu quên rồi
Có những chiều tay nắm tay ngóng đợi
Hoàng hôn xuống ta kề vai nói những lời
Rằng đôi ta sẽ chỉ cần nhau thôi
Hà ha ha ha há ha há ha hà (có phải sở thích của anh là đánh người đúng không?)
Cô gái anh yêu hay quan tâm anh và nhắc anh bao điều
Em thích hoa hồng và mùa đông được anh ôm phía sau lưng
Em nói bên anh qua bao nơi em cảm thấy rất nhẹ nhàng
Vậy giờ ai là người cho em yên bình?
Em muốn xa anh khi yêu thương đang gìn giữ vẫn an lành (mày còn nhớ tao không)
Xoá những hi vọng một tình yêu và hai trái tim xanh
Quên hết bao năm đi bên em anh thật không thể làm được
Người mình thương giờ chẳng nhớ tên quen thuộc
Cô gái anh yêu hay quan tâm anh và nhắc anh bao điều
Em thích hoa hồng và mùa đông được anh ôm phía sau lưng
Em nói bên anh qua bao nơi em cảm thấy rất nhẹ nhàng
Vậy giờ ai là người cho em yên bình?
Em muốn xa anh khi yêu thương đang gìn giữ vẫn an lành
Xoá những hi vọng một tình yêu và hai trái tim xanh
Quên hết bao năm đi bên em anh thật không thể làm được
Người mình thương giờ chẳng nhớ tên quen thuộc
Người mình thương giờ chẳng nhớ tên anh rồi`;

const API_URL = "https://69c56e348a5b6e2dec2c7690.mockapi.io/songs";

async function run() {
    try {
        console.log("Đang lấy danh sách bài hát...");
        const res = await fetch(API_URL);
        const songs = await res.json();
        
        // Tìm bài tên "nontop" như trong hình sếp gửi, nếu không thấy thì quất vào bài đầu tiên
        let target = songs.find(s => s.name && s.name.toLowerCase().includes('nontop'));
        if(!target && songs.length > 0) {
            target = songs[0];
        }
        
        if(target) {
            console.log("Đã tìm thấy bài hát: " + target.name + ". Bắt đầu ép Lyrics...");
            target.lyrics = lyrics;
            const putRes = await fetch(API_URL + "/" + target.id, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(target)
            });
            const data = await putRes.json();
            console.log("ĐÃ TIÊM LYRICS THÀNH CÔNG VÀO BÀI HÁT ID: " + data.id + " DÀI " + data.lyrics.length + " KÝ TỰ!");
        } else {
            console.log("Sếp chưa có bài hát nào trên hệ thống Mock API!");
        }
    } catch (e) {
        console.error("Lỗi:", e);
    }
}

run();
