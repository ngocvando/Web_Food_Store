# 🍚 Cơm Quê — Hệ Thống Đặt Đồ Ăn Trực Tuyến

Website đặt món ăn trực tuyến được xây dựng bằng **NodeJS (ExpressJS)** và **MySQL**, hỗ trợ đặt món, quản lý đơn hàng, voucher, thanh toán VietQR, OTP Email và phân quyền người dùng.

---

# 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy Toàn Bộ (Chi Tiết)

Để hệ thống hoạt động chính xác, vui lòng thực hiện tuần tự các bước sau.

## Bước 1: Khởi động MySQL

Hệ thống cần cơ sở dữ liệu MySQL để hoạt động.

Nếu bạn sử dụng **XAMPP**:

1. Mở XAMPP Control Panel.
2. Nhấn **Start** tại dòng MySQL.
3. Đợi MySQL chuyển sang màu xanh.

Nếu sử dụng:

* MySQL Workbench


hãy đảm bảo MySQL đang hoạt động.

---

## Bước 2: Cài đặt thư viện NodeJS

Mở Terminal/PowerShell tại thư mục dự án:

```bash
npm install
```

Lệnh này chỉ cần chạy một lần duy nhất để tải các thư viện.

---

## Bước 3: Tạo Database

Mở MySQL Workbench hoặc phpMyAdmin và chạy:

```sql
CREATE DATABASE food_shop;
```

---

## Bước 4: Import Cơ Sở Dữ Liệu

### Cách 1: Dùng phpMyAdmin

1. Truy cập:

```text
http://localhost/phpmyadmin
```

2. Chọn:

```text
New
```

3. Tạo database:

```text
food_shop
```

4. Chọn database vừa tạo.

5. Chọn tab:

```text
Import
```

6. Chọn file:

```text
database/food_shop.sql
```

7. Nhấn:

```text
Go
```

---

### Cách 2: Dùng MySQL Workbench

1. Mở MySQL Workbench.
2. Chọn:

```text
Server
→ Data Import
```

3. Chọn:

```text
Import from Self Contained File
```

4. Chọn file:

```text
database/food_shop.sql
```

5. Nhấn:

```text
Start Import
```

---

## Bước 5: Cấu Hình File Environment

Tạo file:

```text
.env
```

Dựa trên:

```text
.env.example
```

Ví dụ:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=food_shop

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

Lưu ý:

* EMAIL_PASS là Gmail App Password.
* Không sử dụng mật khẩu Gmail thông thường.

---

## Bước 6: Khởi Chạy Website

Chạy:

```bash
npm start
```

Hoặc:

```bash
npm run dev
```

Nếu thành công sẽ xuất hiện:

```text
Server is running at http://localhost:3000
```

Không tắt cửa sổ Terminal trong suốt quá trình sử dụng.

---

## Bước 7: Truy Cập Website

Mở trình duyệt:

```text
http://localhost:3000
```

---

# 👤 Tài Khoản Mẫu

## Quản Trị Viên (Admin)

| Username | Password |
| -------- | -------- |
| admin    | 123456789 |

Quyền:

* Quản lý món ăn
* Quản lý danh mục
* Quản lý combo
* Quản lý voucher
* Quản lý người dùng
* Quản lý đánh giá
* Quản lý đơn hàng
* Cài đặt website

---

## Nhân Viên (Staff)

| Username | Password |
| -------- | -------- |
| staff  | 123456789 |

Quyền:

* Xác nhận đơn hàng
* Xác nhận thanh toán
* Cập nhật trạng thái đơn

---

## Khách Hàng

Khách hàng tự đăng ký tài khoản trên hệ thống.

---

# 🍱 Chức Năng Chính

## Khách Hàng

* Đăng ký tài khoản
* Đăng nhập
* Quên mật khẩu bằng OTP Email
* Quản lý hồ sơ cá nhân
* Đổi mật khẩu
* Xem thực đơn
* Tìm kiếm món ăn
* Giỏ hàng
* Đặt hàng trực tuyến
* Áp dụng voucher
* Tính phí ship theo khoảng cách
* Thanh toán COD
* Thanh toán VietQR
* Theo dõi đơn hàng
* Đánh giá đơn hàng

---

## Quản Trị Viên

* Quản lý món ăn
* Quản lý danh mục
* Quản lý combo
* Quản lý voucher
* Quản lý người dùng
* Quản lý đánh giá
* Quản lý đơn hàng
* Cấu hình website

---

## Nhân Viên

* Xác nhận đơn hàng
* Xác nhận thanh toán chuyển khoản
* Cập nhật trạng thái giao hàng

---

# 🎫 Hệ Thống Voucher

Hỗ trợ 3 loại voucher:

### FIXED

Giảm trực tiếp số tiền.

Ví dụ:

```text
GIAM20000
```

Giảm:

```text
20.000đ
```

---

### PERCENT

Giảm theo phần trăm.

Ví dụ:

```text
GIAM10
```

Giảm:

```text
10%
```

---

### FREESHIP

Chỉ giảm phí vận chuyển.

---

# 💳 Thanh Toán

## COD

Thanh toán khi nhận hàng.

## VietQR

Khách hàng chuyển khoản:


---


---

# 🛠️ Công Nghệ Sử Dụng

* NodeJS
* ExpressJS
* MySQL
* EJS
* Bootstrap
* JavaScript
* Google Maps API
* Nodemailer
* VietQR

---

# 🛠️ Xử Lý Lỗi Nhanh

### Lỗi 500

Kiểm tra MySQL đã chạy chưa.

---

### Không gửi được OTP

Kiểm tra:

```text
EMAIL_USER
EMAIL_PASS
```

---

### Không tính được phí ship

Kiểm tra:

```text
GOOGLE_MAPS_API_KEY
```

---

### Không đăng nhập được

Kiểm tra:

```text
Username
Password
```

và tài khoản có bị khóa hay không.

---
