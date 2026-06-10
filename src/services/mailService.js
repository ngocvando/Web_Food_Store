const nodemailer = require('nodemailer');

function isMailConfigured() {
    return Boolean(process.env.MAIL_USER && process.env.MAIL_PASS);
}

function createTransporter() {
    if (!isMailConfigured()) {
        throw new Error('MAIL_USER hoặc MAIL_PASS chưa được cấu hình trong file .env');
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });
}

async function sendPasswordOtp(toEmail, otp) {
    const transporter = createTransporter();
    const fromName = process.env.MAIL_FROM_NAME || 'Cơm Quê';

    return transporter.sendMail({
        from: `"${fromName}" <${process.env.MAIL_USER}>`,
        to: toEmail,
        subject: 'Mã OTP đặt lại mật khẩu Cơm Quê',
        html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;max-width:520px;margin:auto;border:1px solid #eee;border-radius:14px;padding:24px;">
                <h2 style="margin:0 0 12px;color:#E8192C;">Cơm Quê</h2>
                <p>Bạn vừa yêu cầu đặt lại mật khẩu.</p>
                <p>Mã xác thực OTP của bạn là:</p>
                <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#fff4e8;border-radius:12px;text-align:center;padding:16px;margin:18px 0;color:#E8192C;">
                    ${otp}
                </div>
                <p>Mã có hiệu lực trong <strong>5 phút</strong>. Không chia sẻ mã này cho bất kỳ ai.</p>
                <p style="color:#777;font-size:13px;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
            </div>
        `
    });
}

function formatMoney(value) {
    return Number(value || 0).toLocaleString('vi-VN') + ' ₫';
}

async function sendOrderConfirmation(toEmail, order, items = []) {
    if (!toEmail) return null;
    const transporter = createTransporter();
    const fromName = process.env.MAIL_FROM_NAME || 'Cơm Quê';
    const rows = items.map(item => `
        <tr>
            <td style="padding:8px 0;border-bottom:1px solid #eee;">${item.dish_name || 'Món ăn'}</td>
            <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${item.quantity || 0}</td>
            <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${formatMoney(Number(item.price_at_time || item.price || 0) * Number(item.quantity || 0))}</td>
        </tr>
    `).join('');

    const paymentLabel = order.payment_method === 'Banking'
        ? 'Chuyển khoản VietQR - chờ nhân viên xác nhận'
        : 'Thanh toán tiền mặt khi nhận hàng';

    return transporter.sendMail({
        from: `"${fromName}" <${process.env.MAIL_USER}>`,
        to: toEmail,
        subject: `Cơm Quê xác nhận đơn hàng #${order.order_id}`,
        html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;max-width:680px;margin:auto;border:1px solid #eee;border-radius:16px;padding:24px;background:#fff;">
                <h2 style="margin:0 0 8px;color:#E8192C;">Cơm Quê</h2>
                <p style="margin-top:0;">Cảm ơn bạn đã đặt hàng. Đơn hàng của bạn đã được tạo thành công.</p>
                <div style="background:#fff4e8;border-radius:12px;padding:14px 16px;margin:16px 0;">
                    <p style="margin:4px 0;"><strong>Mã đơn:</strong> #${order.order_id}</p>
                    <p style="margin:4px 0;"><strong>Người nhận:</strong> ${order.receiver_name || ''}</p>
                    <p style="margin:4px 0;"><strong>SĐT:</strong> ${order.delivery_phone || ''}</p>
                    <p style="margin:4px 0;"><strong>Địa chỉ:</strong> ${order.delivery_address || ''}</p>
                    <p style="margin:4px 0;"><strong>Thanh toán:</strong> ${paymentLabel}</p>
                </div>
                <table style="width:100%;border-collapse:collapse;margin-top:12px;">
                    <thead>
                        <tr>
                            <th style="text-align:left;padding:8px 0;border-bottom:2px solid #eee;">Món</th>
                            <th style="text-align:center;padding:8px 0;border-bottom:2px solid #eee;">SL</th>
                            <th style="text-align:right;padding:8px 0;border-bottom:2px solid #eee;">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <div style="margin-top:16px;text-align:right;">
                    <p style="margin:4px 0;">Tạm tính: <strong>${formatMoney(order.subtotal_amount)}</strong></p>
                    <p style="margin:4px 0;">Phí giao hàng: <strong>${formatMoney(order.shipping_fee)}</strong></p>
                    ${Number(order.discount_amount || 0) > 0 ? `<p style="margin:4px 0;">Giảm giá món: <strong>-${formatMoney(order.discount_amount)}</strong></p>` : ''}
                    ${Number(order.shipping_discount_amount || 0) > 0 ? `<p style="margin:4px 0;">Giảm phí ship: <strong>-${formatMoney(order.shipping_discount_amount)}</strong></p>` : ''}
                    <p style="font-size:20px;margin:10px 0;color:#E8192C;">Tổng thanh toán: <strong>${formatMoney(order.total_amount)}</strong></p>
                </div>
                <p style="color:#777;font-size:13px;margin-top:22px;">Email này được gửi tự động từ hệ thống Cơm Quê.</p>
            </div>
        `
    });
}

module.exports = {
    isMailConfigured,
    sendPasswordOtp,
    sendOrderConfirmation
};
