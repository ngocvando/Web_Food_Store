const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',      // Thay bằng user của bạn
    password: '123456',      // Thay bằng password của bạn
    database: 'food_shop'
});

connection.connect((err) => {
    if (err) {
        console.error('Lỗi kết nối MySQL: ' + err.stack);
        return;
    }
    console.log('Đã kết nối MySQL thành công.');
});

module.exports = connection;