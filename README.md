# 🍚 Cơm Quê - Hệ Thống Đặt Đồ Ăn Trực Tuyến

Website đặt món ăn trực tuyến được xây dựng bằng NodeJS + ExpressJS + MySQL + EJS.

## 🚀 Cài đặt

### 1. Cài thư viện

```bash
npm install
```

### 2. Import Database

```sql
CREATE DATABASE food_shop;
```

Import file `database/food_shop.sql`

### 3. Cấu hình .env

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=food_shop

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

GOOGLE_MAPS_API_KEY=your_key
```

### 4. Chạy project

```bash
npm start
```

Truy cập:

http://localhost:3000

## 👤 Phân quyền

### Admin
- Quản lý món ăn
- Quản lý danh mục
- Quản lý combo
- Quản lý voucher
- Quản lý người dùng
- Quản lý đánh giá
- Quản lý đơn hàng

### Nhân viên
- Xác nhận đơn hàng
- Xác nhận thanh toán
- Cập nhật trạng thái giao hàng

### Khách hàng
- Đăng ký
- Đặt hàng
- Thanh toán
- Đánh giá

## 🎫 Voucher

- FIXED
- PERCENT
- FREESHIP

## 💳 Thanh toán

- COD
- VietQR

## 📧 OTP Email

Quên mật khẩu bằng Gmail OTP.

## 🛠️ Công nghệ

- NodeJS
- ExpressJS
- MySQL
- EJS
- Bootstrap
- Google Maps API
- Nodemailer
