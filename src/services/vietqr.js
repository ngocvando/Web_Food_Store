function clean(value) {
    return (value || '').toString().trim();
}

const BANK_ALIASES = {
    'MBBANK': 'MB',
    'MB BANK': 'MB',
    'MILITARY BANK': 'MB',
    'VIETCOMBANK': 'VCB',
    'VCB': 'VCB',
    'TECHCOMBANK': 'TCB',
    'TCB': 'TCB',
    'BIDV': 'BIDV',
    'VIETINBANK': 'ICB',
    'AGRIBANK': 'VBA',
    'ACB': 'ACB',
    'VPBANK': 'VPB',
    'TPBANK': 'TPB',
    'SACOMBANK': 'STB',
    'HDBANK': 'HDB',
    'MSB': 'MSB',
    'VIB': 'VIB',
    'OCB': 'OCB',
    'SHB': 'SHB',
    'SEABANK': 'SEAB',
    'LPBANK': 'LPB',
    'LIENVIETPOSTBANK': 'LPB'
};

function normalizeBankCode(value) {
    const raw = clean(value);
    if (!raw) return '';
    const key = raw.toUpperCase().replace(/\s+/g, ' ');
    return BANK_ALIASES[key] || raw.toUpperCase();
}

function resolveBankId(settings = {}) {
    // VietQR Quick Link cần mã ngân hàng/BIN hợp lệ, ví dụ MB, VCB, TCB hoặc 970422.
    // Không dùng tên hiển thị như "MBBank" trong URL ảnh QR.
    return normalizeBankCode(settings.qr_bank_code || settings.qr_bank || 'MB');
}

function resolveTemplate(settings = {}) {
    return clean(settings.qr_template || 'compact2');
}

function buildVietQrUrl(settings = {}, amount = 0, addInfo = '') {
    const bankId = resolveBankId(settings);
    const accountNo = clean(settings.qr_account).replace(/\s+/g, '');
    const accountName = clean(settings.qr_name || 'COM QUE');
    const template = resolveTemplate(settings);

    if (!bankId || !accountNo) return null;

    const url = new URL(`https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(accountNo)}-${encodeURIComponent(template)}.png`);
    if (Number(amount) > 0) url.searchParams.set('amount', String(Math.round(Number(amount))));
    if (addInfo) url.searchParams.set('addInfo', addInfo);
    if (accountName) url.searchParams.set('accountName', accountName);
    return url.toString();
}

function makePaymentReference(orderId) {
    return `COMQUE DH ${orderId}`;
}

module.exports = {
    buildVietQrUrl,
    makePaymentReference,
    resolveBankId,
    resolveTemplate,
    normalizeBankCode
};
