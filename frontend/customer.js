// Giao diện Customer App. Xử lý API đặt món, tính toán đo lường SLA < 3s, 
// lắng nghe sự kiện SSE từ Database để hiển thị cập nhật trạng thái đơn hàng theo thời gian thực.
function logToBox(boxId, message) {
    const box = document.getElementById(boxId);
    const div = document.createElement('div');
    div.className = 'log-line';
    div.innerHTML = message;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

const dbSource = new EventSource('http://localhost:9000/stream');
dbSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.status === 'COMPLETED') {
        logToBox('customer-log', `[${new Date().toLocaleTimeString()}] 🎉 Trạng thái: Đơn ${data.orderId} đã được nhà hàng ghi nhận`);
        const statusBadge = document.getElementById('customer-status');
        if (statusBadge) {
            statusBadge.innerText = 'ĐÃ GHI NHẬN ĐƠN';
            statusBadge.style.background = '#dcfce7'; 
            statusBadge.style.color = '#166534'; 
        }
    }
};

async function placeOrder() {
    const statusBadge = document.getElementById('customer-status');
    if (statusBadge) {
        statusBadge.innerText = 'ĐANG TIẾP NHẬN...';
        statusBadge.style.background = '#fef08a';
        statusBadge.style.color = '#854d0e';
    }

    const time = new Date().toLocaleTimeString();
    logToBox('customer-log', `[${time}] 📤 Đang gửi request đặt món...`);
    const startTime = Date.now();
    try {
        const response = await fetch('http://localhost:3000/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: ['1x Gà Rán', '1x Khoai Tây'] })
        });
        const data = await response.json();
        const latency = Date.now() - startTime;
        logToBox('customer-log', `[${new Date().toLocaleTimeString()}] ✅ Đã lưu đơn vào hệ thống: SLA <span class="highlight">${latency} ms</span>`);
        logToBox('customer-log', `[${new Date().toLocaleTimeString()}] ⏳ Trạng thái: Nhà hàng đang tiếp nhận đơn ${data.orderId}...`);
    } catch (error) {
        logToBox('customer-log', `[${new Date().toLocaleTimeString()}] ❌ Lỗi kết nối: Server không phản hồi`);
        if (statusBadge) {
            statusBadge.innerText = 'LỖI KẾT NỐI';
            statusBadge.style.background = '#fee2e2';
            statusBadge.style.color = '#991b1b';
        }
    }
}