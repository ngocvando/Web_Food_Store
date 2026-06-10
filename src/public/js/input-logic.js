(function () {
    const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    const PHONE_REGEX = /^(03|05|07|08|09)[0-9]{8}$/;
    const FULLNAME_REGEX = /^[A-Za-zÀ-ỹ\s'.-]{2,80}$/;

    function showError(input, message) {
        if (!input) return;
        input.classList.add('input-invalid');
        let box = input.parentElement ? input.parentElement.querySelector('.field-error') : null;
        if (!box && input.parentElement) {
            box = document.createElement('small');
            box.className = 'field-error';
            input.parentElement.appendChild(box);
        }
        if (box) box.textContent = message || input.dataset.error || 'Dữ liệu không hợp lệ.';
    }

    function clearError(input) {
        if (!input) return;
        input.classList.remove('input-invalid');
        const box = input.parentElement ? input.parentElement.querySelector('.field-error') : null;
        if (box) box.textContent = '';
    }

    function normalizeInput(input) {
        if (!input || !('value' in input)) return;
        if (input.dataset.uppercase === 'true' || input.dataset.voucher === 'true') input.value = input.value.trim().replace(/\s+/g, '').toUpperCase();
        if (input.dataset.lowercase === 'true' || input.dataset.email === 'true') input.value = input.value.trim().toLowerCase();
        if (input.dataset.nospace === 'true') input.value = input.value.replace(/\s+/g, '');
        if (input.dataset.phone === 'true') input.value = input.value.replace(/[^0-9]/g, '').slice(0, 10);
        if (input.dataset.otp === 'true') input.value = input.value.replace(/[^0-9]/g, '').slice(0, 6);
        if (input.dataset.trim === 'true' || input.dataset.fullname === 'true') input.value = input.value.trim().replace(/\s+/g, ' ');
        if (input.dataset.positive === 'true') {
            const n = Number(input.value);
            if (Number.isFinite(n) && n < 0) input.value = '0';
        }
    }

    function validateInput(input) {
        normalizeInput(input);
        clearError(input);

        const value = (input.value || '').trim();
        if (input.required && !value) {
            showError(input, input.dataset.error || 'Vui lòng nhập thông tin này.');
            return false;
        }

        if (input.dataset.email === 'true' || input.type === 'email') {
            if (value && value.includes(' ')) {
                showError(input, 'Email không được chứa khoảng trắng.');
                return false;
            }
            if (value && !EMAIL_REGEX.test(value)) {
                showError(input, input.dataset.error || 'Email không đúng định dạng.');
                return false;
            }
        }

        if (input.dataset.otp === 'true') {
            if (!/^[0-9]{6}$/.test(value)) {
                showError(input, input.dataset.error || 'Mã OTP phải gồm đúng 6 chữ số.');
                return false;
            }
        }

        if (input.dataset.phone === 'true') {
            if (!value) {
                showError(input, 'Vui lòng nhập số điện thoại.');
                return false;
            }
            if (!/^[0-9]+$/.test(value)) {
                showError(input, 'Số điện thoại chỉ được chứa chữ số.');
                return false;
            }
            if (value.length !== 10) {
                showError(input, 'Số điện thoại phải gồm đúng 10 số.');
                return false;
            }
            if (!PHONE_REGEX.test(value)) {
                showError(input, 'Số điện thoại phải bắt đầu bằng 03, 05, 07, 08 hoặc 09.');
                return false;
            }
        }

        if (input.dataset.fullname === 'true') {
            if (!FULLNAME_REGEX.test(value) || /[0-9]/.test(value)) {
                showError(input, input.dataset.error || 'Họ tên chỉ gồm chữ cái, khoảng trắng và không chứa số/ký tự đặc biệt.');
                return false;
            }
        }

        if (input.dataset.positive === 'true') {
            const n = Number(value);
            if (!Number.isFinite(n) || n <= 0) {
                showError(input, input.dataset.error || 'Giá trị phải lớn hơn 0.');
                return false;
            }
        }

        if (input.dataset.nonnegative === 'true') {
            const n = Number(value || 0);
            if (!Number.isFinite(n) || n < 0) {
                showError(input, input.dataset.error || 'Giá trị không được âm.');
                return false;
            }
        }

        if (input.dataset.match) {
            const other = document.querySelector(`[name="${input.dataset.match}"]`);
            if (other && input.value !== other.value) {
                showError(input, input.dataset.error || 'Thông tin xác nhận không khớp.');
                return false;
            }
        }

        if (!input.checkValidity()) {
            showError(input, input.dataset.error || input.validationMessage);
            return false;
        }
        return true;
    }

    document.addEventListener('input', function (e) {
        const input = e.target;
        if (!input || !input.matches('input, textarea')) return;
        if (input.dataset.uppercase === 'true' || input.dataset.voucher === 'true') input.value = input.value.toUpperCase().replace(/\s+/g, '');
        if (input.dataset.email === 'true') input.value = input.value.replace(/\s+/g, '').toLowerCase();
        if (input.dataset.nospace === 'true') input.value = input.value.replace(/\s+/g, '');
        if (input.dataset.phone === 'true') input.value = input.value.replace(/[^0-9]/g, '').slice(0, 10);
        if (input.dataset.otp === 'true') input.value = input.value.replace(/[^0-9]/g, '').slice(0, 6);
        if (input.classList.contains('input-invalid')) validateInput(input);
    });

    document.addEventListener('blur', function (e) {
        const input = e.target;
        if (!input || !input.matches('input, textarea')) return;
        normalizeInput(input);
        if (input.closest('[data-validate-form]') || input.required || input.dataset.error || input.dataset.phone || input.dataset.email || input.dataset.fullname) validateInput(input);
    }, true);

    document.addEventListener('submit', function (e) {
        const form = e.target;
        if (!form || !form.matches('form')) return;
        const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
        let ok = true;
        inputs.forEach(input => {
            if ((input.required || input.pattern || input.dataset.error || input.dataset.match || input.dataset.phone || input.dataset.email || input.dataset.fullname || input.dataset.positive || input.dataset.nonnegative || input.dataset.otp) && !validateInput(input)) ok = false;
        });
        if (!ok) {
            e.preventDefault();
            const first = form.querySelector('.input-invalid');
            if (first) first.focus();
        }
    });
})();
