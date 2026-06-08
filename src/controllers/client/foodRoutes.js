const express = require('express');
const router = express.Router();
const foodController = require('../../controllers/client/foodController');

// Đường dẫn: http://localhost:3000/thuc-don
router.get('/thuc-don', foodController.getMenu);

module.exports = router;