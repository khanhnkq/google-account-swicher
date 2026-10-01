# Fast Google Account Switcher for Firefox 🦊

Tiện ích mở rộng (WebExtension Manifest V3) dành riêng cho **Firefox**, giúp đổi nhanh giữa các tài khoản Google (`/u/0/`, `/u/1/`, `/u/2/`, `/u/3/` hoặc `authuser=X`) bằng **phím tắt cấp trình duyệt** mà không bao giờ bị trang web chặn hay nuốt phím.

---

## 🚀 Phím tắt mặc định

* **`Alt + Shift + 1`** $\rightarrow$ Chuyển sang **Account 0** (`/u/0/`)
* **`Alt + Shift + 2`** $\rightarrow$ Chuyển sang **Account 1** (`/u/1/`)
* **`Alt + Shift + 3`** $\rightarrow$ Chuyển sang **Account 2** (`/u/2/`)
* **`Alt + Shift + 4`** $\rightarrow$ Chuyển sang **Account 3** (`/u/3/`)

*(Lưu ý: Bạn có thể đổi phím tắt này bất cứ lúc nào thành phím bạn thích).*

---

## 📦 Cách cài đặt vào Firefox

### Cách 1: Nạp trực tiếp để dùng ngay (Thử nghiệm)
1. Mở **Firefox**, gõ vào thanh địa chỉ:
   ```text
   about:debugging#/runtime/this-firefox
   ```
2. Bấm nút **Load Temporary Add-on...** (Tải tiện ích tạm thời...).
3. Điều hướng đến thư mục:
   ```text
   /home/khanhnkq/Codes/google-account-switcher-firefox/
   ```
4. Chọn file **`manifest.json`**.
5. Xong! Extension sẽ kích hoạt ngay lập tức trên Firefox của bạn.

---

## ⚙️ Cách tùy chỉnh phím tắt theo ý thích

Nếu bạn muốn đổi từ `Alt + Shift + 1` sang `Alt + 1` hoặc `Ctrl + Alt + 1`:
1. Mở Firefox, gõ vào thanh địa chỉ:
   ```text
   about:addons
   ```
2. Bấm vào biểu tượng **bánh răng ⚙️** ở góc trên bên phải.
3. Chọn **Manage Extension Shortcuts** (Quản lý phím tắt tiện ích).
4. Tìm **Google Fast Account Switcher** và bấm vào ô phím tắt để gõ tổ hợp phím mới bạn muốn.

---

## 🛠️ Các dịch vụ được hỗ trợ tối ưu

* **Gmail**: `mail.google.com/mail/u/0/` $\leftrightarrow$ `mail.google.com/mail/u/1/`
* **Google Drive**: `drive.google.com/drive/u/0/` $\leftrightarrow `drive.google.com/drive/u/1/`
* **Google Docs / Sheets / Slides**: Tự động chèn `/u/X/` chuẩn đường dẫn tài liệu.
* **Google Calendar**: `calendar.google.com/calendar/u/0/`
* **Google Meet / Cloud Console / Colab / YouTube**: Tự động đồng bộ `?authuser=X`.
