const multer = require('multer');
const path = require('path');

// Cấu hình kho lưu trữ
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ảnh sẽ được lưu vào src/public/images/
        cb(null, 'src/public/images/');
    },
    filename: (req, file, cb) => {
        // Đặt tên file: timestamp-tên-gốc (Ví dụ: 1715367000-pho.jpg)
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Kiểm tra định dạng file (chỉ cho phép ảnh)
const fileFilter = (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif|webp/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file ảnh JPG, PNG, GIF hoặc WEBP.'));
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // Giới hạn 20MB/file; ảnh sẽ được nén lại bằng Sharp
    fileFilter: fileFilter
});

module.exports = upload;