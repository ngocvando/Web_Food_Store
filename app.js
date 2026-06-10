var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');

var indexRouter = require('./src/routes/index');
var usersRouter = require('./src/routes/users');
const cartRoutes = require('./src/routes/client/cartRoutes');
const foodRoutes = require('./src/routes/client/foodRoutes');
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/admin/adminRoutes');
const staffRoutes = require('./src/routes/staff/staffRoutes');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'src/views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'src/public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'food_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Truyền session, số lượng giỏ hàng và cài đặt chung cho tất cả View
app.use(async (req, res, next) => {
    res.locals.user = req.session;
    res.locals.cartCount = 0;
    res.locals.settings = {};

    try {
        const db = require('./src/config/db');

        // Cài đặt dùng chung cho navbar/footer/home banner
        const [settingsRows] = await db.execute('SELECT setting_key, setting_value FROM settings');
        settingsRows.forEach(row => {
            res.locals.settings[row.setting_key] = row.setting_value;
        });

        if (req.session && req.session.userId) {
            const [rows] = await db.execute(`
                SELECT COALESCE(SUM(ci.quantity), 0) AS total
                FROM carts c
                LEFT JOIN cart_items ci ON c.cart_id = ci.cart_id
                WHERE c.user_id = ?`, [req.session.userId]);
            res.locals.cartCount = Number(rows[0]?.total || 0);
        }
    } catch (e) {
        res.locals.cartCount = 0;
        res.locals.settings = {};
    }

    next();
});

// Routes
app.use('/', authRoutes);
app.use('/', foodRoutes);
app.use('/', cartRoutes);
app.use('/users', usersRouter);
app.use('/admin', adminRoutes);
app.use('/staff', staffRoutes);

// catch 404
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
