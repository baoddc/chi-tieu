# Ứng Dụng Quản Lý Chi Tiêu Chuyên Nghiệp (Google Sheets DB)

Ứng dụng quản lý tài chính cá nhân/doanh nghiệp nhỏ chuyên nghiệp dạng Single Page Application (SPA), chạy mượt mà ngay trên trình duyệt và tự động đồng bộ hóa dữ liệu 2 chiều với Google Sheets thông qua REST API Web App tối giản.

## 🌟 Tính Năng Nổi Bật

1. **Hiệu năng cực cao**: Toàn bộ thao tác tính toán, gom nhóm giao dịch, phân tích ngân sách và biểu đồ được xử lý 100% bằng Javascript ở trình duyệt phía máy khách (Client-side), giảm tải tối đa cho Apps Script để hệ thống không bao giờ bị chậm.
2. **Offline-First & Local Cache**: Tự động lưu trữ dữ liệu trong bộ nhớ `LocalStorage` của trình duyệt. Ứng dụng chạy bình thường và nhanh chóng kể cả khi mất mạng hay chưa cấu hình Google Sheets.
3. **Đồng bộ hai chiều mượt mà**: Ghi nhận giao dịch ngay lập tức trên giao diện (Optimistic UI) và gửi đồng bộ ngầm lên Google Sheet để không bắt người dùng phải chờ đợi. Hỗ trợ đẩy ngược dữ liệu offline lên Sheets khi cấu hình lần đầu.
4. **Biểu đồ động trực quan (Chart.js)**: Biểu đồ cột so sánh Thu vs Chi theo 6 tháng gần nhất; biểu đồ tròn (Doughnut) phân tích tỷ trọng nguồn thu và chi tiêu tháng.
5. **Giao diện tối giản cao cấp**: Phong cách Glassmorphism (phông kính mờ), phối màu hiện đại hài hòa, bo góc mềm mại, đầy đủ hiệu ứng chuyển động, hỗ trợ chế độ Tối (Dark mode) và Sáng (Light mode), tự động tối ưu hóa hiển thị trên màn hình Điện thoại (Mobile Navigation).

---

## 🛠️ Hướng dẫn cài đặt cơ sở dữ liệu Google Sheets (5 phút)

Để lưu trữ dữ liệu của bạn trên Google Sheets của riêng bạn, vui lòng làm theo 3 bước sau:

### Bước 1: Tạo Google Sheet mới
1. Truy cập vào [sheets.new](https://sheets.new) để tạo một Google Sheet trống.
2. Đặt tên gợi nhớ cho file (Ví dụ: `Sổ Quản Lý Chi Tiêu Cá Nhân`).

### Bước 2: Dán mã nguồn Apps Script
1. Trong Google Sheet, chọn menu **Extensions (Tiện ích mở rộng)** > **Apps Script**.
2. Xóa sạch mọi mã nguồn có sẵn trong file mặc định `Code.gs`.
3. Sao chép toàn bộ nội dung trong file [google-apps-script.js](file:///c:/Users/thaib/Máy%20tính/chi-tieu/google-apps-script.js) của dự án này, dán vào Apps Script và nhấn nút **Save (Lưu)** (biểu tượng đĩa mềm).

### Bước 3: Triển khai thành Web App
1. Nhấn nút **Deploy (Triển khai)** ở góc trên bên phải màn hình Apps Script > Chọn **New deployment (Triển khai mới)**.
2. Nhấn biểu tượng bánh răng cạnh dòng "Select type", chọn **Web app (Ứng dụng web)**.
3. Thiết lập các thông số cấu hình:
   - **Description**: `Expense Tracker API`
   - **Execute as**: Chọn **Me (Tài khoản Google của bạn)**
   - **Who has access**: BẮT BUỘC chọn **Anyone (Bất kỳ ai)** (để ứng dụng web ở máy khách có thể gửi dữ liệu lên).
4. Nhấn **Deploy**.
5. Một hộp thoại sẽ hiện lên yêu cầu cấp quyền (Authorize access), bạn chọn tài khoản Google của mình, nhấn **Advanced** > Chọn **Go to ... (unsafe)** và cấp các quyền ghi/đọc Google Sheets cần thiết cho Script.
6. Khi hoàn thành, copy đường dẫn **Web app URL** (có dạng `https://script.google.com/macros/s/.../exec`).

---

## 🚀 Cách chạy ứng dụng

1. Chỉ cần mở file [index.html](file:///c:/Users/thaib/Máy%20tính/chi-tieu/index.html) trực tiếp bằng trình duyệt của bạn (hoặc chạy bằng bất kỳ Live Server nào như VS Code Live Server, Python SimpleHTTPServer, v.v.).
2. Vào phần **Cài đặt kết nối** trên giao diện ứng dụng.
3. Dán **Web app URL** đã copy ở Bước 3 vào ô nhập liệu và bấm **Kiểm tra & Kết nối**.
4. Khi hệ thống báo kết nối thành công, bạn đã hoàn tất tích hợp! Tất cả dữ liệu của bạn bây giờ sẽ được lưu trữ an toàn, bảo mật trên Google Sheet cá nhân.
5. Nếu bạn đã có giao dịch ghi chép ngoại tuyến trước đó, hệ thống sẽ đề xuất đồng bộ đẩy dữ liệu đó lên Sheet. Bạn cũng có thể bấm nút **Đẩy dữ liệu Local lên Sheet** bất cứ lúc nào.

---

## 📂 Danh mục tệp dự án

- [index.html](file:///c:/Users/thaib/Máy%20tính/chi-tieu/index.html): Giao diện HTML cấu trúc SPA của ứng dụng.
- [style.css](file:///c:/Users/thaib/Máy%20tính/chi-tieu/style.css): Hệ thống style cao cấp hỗ trợ Dark/Light Theme & Responsive.
- [categories.js](file:///c:/Users/thaib/Máy%20tính/chi-tieu/categories.js): Danh sách các hạng mục chi tiêu mặc định kèm bảng màu và biểu tượng.
- [api.js](file:///c:/Users/thaib/Máy%20tính/chi-tieu/api.js): Thư viện API Client kết nối mạng hoặc thao tác trên bộ nhớ đệm cục bộ LocalStorage.
- [charts.js](file:///c:/Users/thaib/Máy%20tính/chi-tieu/charts.js): Tích hợp biểu đồ Chart.js để vẽ biểu đồ so sánh xu hướng thu chi và cơ cấu dòng tiền.
- [app.js](file:///c:/Users/thaib/Máy%20tính/chi-tieu/app.js): Script chính xử lý tương tác DOM, tính toán dữ liệu thô và đồng bộ hóa.
- [google-apps-script.js](file:///c:/Users/thaib/Máy%20tính/chi-tieu/google-apps-script.js): Mã nguồn Apps Script để dán vào Google Sheet.
