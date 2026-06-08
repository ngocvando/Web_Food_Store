const ORDER_FLOW = ['Pending', 'Preparing', 'Shipping', 'Completed'];
const TERMINAL_STATUSES = ['Completed', 'Cancelled'];

function getAllowedNextStatuses(currentStatus) {
    switch (currentStatus) {
        case 'Pending':
            return ['Preparing', 'Cancelled'];
        case 'Preparing':
            return ['Shipping'];
        case 'Shipping':
            return ['Completed'];
        default:
            return [];
    }
}

function validateOrderStatusTransition(currentStatus, nextStatus) {
    if (!['Pending', 'Preparing', 'Shipping', 'Completed', 'Cancelled'].includes(nextStatus)) {
        return { ok: false, message: 'Trạng thái không hợp lệ' };
    }
    if (TERMINAL_STATUSES.includes(currentStatus)) {
        return { ok: false, message: `Đơn hàng đã ${currentStatus === 'Completed' ? 'hoàn thành' : 'hủy'}, không thể cập nhật tiếp.` };
    }
    const allowed = getAllowedNextStatuses(currentStatus);
    if (!allowed.includes(nextStatus)) {
        return {
            ok: false,
            message: `Không thể chuyển trạng thái từ ${currentStatus} sang ${nextStatus}. Luồng hợp lệ: Pending → Preparing → Shipping → Completed; chỉ được hủy khi đơn còn Pending.`
        };
    }
    return { ok: true };
}

module.exports = {
    ORDER_FLOW,
    TERMINAL_STATUSES,
    getAllowedNextStatuses,
    validateOrderStatusTransition
};
