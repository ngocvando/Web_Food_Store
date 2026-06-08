function cleanInput(value) {
    return (value || '').toString().trim();
}

function collapseSpaces(value) {
    return cleanInput(value).replace(/\s+/g, ' ');
}

function normalizeEmail(value) {
    return cleanInput(value).toLowerCase();
}

function normalizePhone(value) {
    return cleanInput(value).replace(/[^0-9]/g, '');
}

function normalizeVoucherCode(value) {
    return cleanInput(value).replace(/\s+/g, '').toUpperCase();
}

function isValidEmail(email) {
    return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email || '') && !(email || '').includes(' ');
}

function isValidVietnamPhone(phone) {
    return /^(03|05|07|08|09)[0-9]{8}$/.test(phone || '');
}

function isValidFullName(name) {
    return /^[A-Za-zÀ-ỹ\s'.-]{2,80}$/.test(name || '') && !/[0-9]/.test(name || '');
}

function toPositiveNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

function toNonNegativeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function validateEmailField(email) {
    if (!email) return 'Vui lòng nhập email.';
    if (email.includes(' ')) return 'Email không được chứa khoảng trắng.';
    if (!isValidEmail(email)) return 'Email không đúng định dạng.';
    return '';
}

function validatePhoneField(phone) {
    if (!phone) return 'Vui lòng nhập số điện thoại.';
    if (!/^[0-9]+$/.test(phone)) return 'Số điện thoại chỉ được chứa chữ số.';
    if (phone.length !== 10) return 'Số điện thoại phải gồm đúng 10 số.';
    if (!isValidVietnamPhone(phone)) return 'Số điện thoại phải bắt đầu bằng 03, 05, 07, 08 hoặc 09.';
    return '';
}

function validateFullNameField(fullName) {
    if (!fullName) return 'Vui lòng nhập họ tên.';
    if (!isValidFullName(fullName)) return 'Họ tên chỉ nên gồm chữ cái, khoảng trắng và không chứa số/ký tự đặc biệt.';
    return '';
}

module.exports = {
    cleanInput,
    collapseSpaces,
    normalizeEmail,
    normalizePhone,
    normalizeVoucherCode,
    isValidEmail,
    isValidVietnamPhone,
    isValidFullName,
    toPositiveNumber,
    toNonNegativeNumber,
    validateEmailField,
    validatePhoneField,
    validateFullNameField
};
