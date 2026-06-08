function addToCart(event, dishId, dishName, price, imageUrl) {
    event.preventDefault();
    fetch('/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dish_id: dishId, dish_name: dishName, price: price, image_url: imageUrl })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            updateCartBadge(data.totalItems);
            showCartToast(dishName, data.totalItems);
        } else if (data.redirect) {
            showLoginPrompt();
        }
    })
    .catch(() => showCartToast('Có lỗi, vui lòng thử lại', 0, true));
}

function updateCartBadge(count) {
    let badge = document.getElementById('cart-badge');
    if (!badge) {
        const cartLink = document.querySelector('a[href="/cart"]');
        if (cartLink) {
            badge = document.createElement('span');
            badge.id = 'cart-badge';
            badge.className = 'cart-badge';
            cartLink.style.position = 'relative';
            cartLink.appendChild(badge);
        }
    }
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
        badge.classList.add('pop');
        setTimeout(() => badge.classList.remove('pop'), 400);
    }
}

function showCartToast(dishName, total, isError) {
    let t = document.getElementById('cart-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'cart-toast';
        t.className = 'cart-toast-popup';
        document.body.appendChild(t);
    }
    t.innerHTML = isError
        ? `⚠️ ${dishName}`
        : `🛒 Đã thêm <strong>${dishName}</strong> vào giỏ! <span style="opacity:.7;font-size:.85em">Giỏ: ${total} món</span>`;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

function showLoginPrompt() {
    let modal = document.getElementById('login-prompt');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'login-prompt';
        modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;align-items:center;justify-content:center;';
        modal.innerHTML = `
            <div onclick="closeLoginPrompt()" style="position:absolute;inset:0;background:rgba(0,0,0,.5);"></div>
            <div class="login-prompt-box">
                <div style="font-size:3rem;margin-bottom:12px;">🔐</div>
                <h3>Vui lòng đăng nhập</h3>
                <p>Bạn cần đăng nhập để thêm món vào giỏ hàng</p>
                <div style="display:flex;gap:12px;justify-content:center;margin-top:20px;">
                    <a href="/login" class="btn-primary">Đăng nhập ngay</a>
                    <button onclick="closeLoginPrompt()" class="btn-outline">Để sau</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
}
function closeLoginPrompt() {
    const m = document.getElementById('login-prompt');
    if (m) m.style.display = 'none';
}

function addComboToCart(event, comboId, comboName) {
    event.preventDefault();
    fetch('/cart/add-combo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ combo_id: comboId })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            updateCartBadge(data.totalItems);
            showCartToast(comboName, data.totalItems);
        } else if (data.redirect) {
            showLoginPrompt();
        } else {
            showCartToast(data.message || 'Không thể thêm combo', 0, true);
        }
    })
    .catch(() => showCartToast('Có lỗi, vui lòng thử lại', 0, true));
}
