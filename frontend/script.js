function logToBox(boxId, message) {
    const box = document.getElementById(boxId);
    const div = document.createElement('div');
    div.className = 'log-line';
    div.innerHTML = message;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

// ----------------------------------------------------
// BỔ SUNG QUAN TRỌNG: Lắng nghe trạng thái từ Database Service (Cổng 6000)
// ----------------------------------------------------
const dbSource = new EventSource('http://localhost:6000/stream');
dbSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.status === 'COMPLETED') {
        // Đây là dòng trạng thái thứ 2 sẽ nhảy lên thông báo khi nhà hàng nhận được đơn (kể cả khi mạng phục hồi sau sự cố)
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
        
        // Dòng trạng thái 1: Luôn hiện ngay lập tức
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

async function toggleChaos() {
    try {
        const response = await fetch('http://localhost:4000/toggle-chaos');
        const data = await response.json();
        const statusBadge = document.getElementById('network-status');
        const btnChaos = document.getElementById('btn-chaos');
        
        if (data.status) {
            statusBadge.className = 'status-badge status-error';
            statusBadge.innerText = 'ĐỨT MẠNG / TREO';
            btnChaos.innerHTML = 'Khôi phục mạng POS';
            btnChaos.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        } else {
            statusBadge.className = 'status-badge status-ok';
            statusBadge.innerText = 'MẠNG POS ỔN ĐỊNH';
            btnChaos.innerHTML = '🔌 Giả lập sập mạng POS (Chaos Mode)';
            btnChaos.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        }
    } catch (error) {
        alert('Không thể kết nối đến Mock POS.');
    }
}

let driverWs = null;
let gpsInterval = null;

function toggleDriver() {
    const btnDriver = document.getElementById('btn-driver');
    if (driverWs) {
        clearInterval(gpsInterval);
        driverWs.close();
        driverWs = null;
        btnDriver.innerHTML = '📡 Bật App Tài xế (Bắt đầu đẩy GPS)';
        btnDriver.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        logToBox('driver-log', `[${new Date().toLocaleTimeString()}] 🔴 Đã tắt ứng dụng tài xế.`);
    } else {
        driverWs = new WebSocket('ws://localhost:5001');
        const driverId = `DRV-${Math.floor(Math.random() * 1000)}`;
        
        driverWs.onopen = () => {
            logToBox('driver-log', `[${new Date().toLocaleTimeString()}] 🟢 Đã kết nối WebSocket (ID: ${driverId})`);
            btnDriver.innerHTML = 'Tắt App Tài xế';
            btnDriver.style.background = 'linear-gradient(135deg, #64748b, #475569)';
            
            gpsInterval = setInterval(() => {
                const lat = 10.762622 + (Math.random() * 0.01);
                const lng = 106.660172 + (Math.random() * 0.01);
                const payload = JSON.stringify({ type: 'GPS_UPDATE', driverId, lat, lng });
                driverWs.send(payload);
                logToBox('driver-log', `[${new Date().toLocaleTimeString()}] 🚀 Đẩy tọa độ: [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
            }, 5000);
        };
        driverWs.onclose = () => {
            logToBox('driver-log', `[${new Date().toLocaleTimeString()}] 🔴 Đã ngắt kết nối với máy chủ.`);
            clearInterval(gpsInterval);
            driverWs = null;
            btnDriver.innerHTML = '📡 Bật App Tài xế (Bắt đầu đẩy GPS)';
            btnDriver.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        };
        driverWs.onerror = () => {
            logToBox('driver-log', `[${new Date().toLocaleTimeString()}] ❌ Lỗi kết nối WebSocket.`);
        };
    }
}

async function triggerRecon() {
    logToBox('recon-log', `[${new Date().toLocaleTimeString()}] ⏳ Yêu cầu chạy đối soát thủ công...`);
    try {
        await fetch('http://localhost:6001/trigger', { method: 'POST' });
    } catch (error) {
        logToBox('recon-log', `[${new Date().toLocaleTimeString()}] ❌ Lỗi kết nối tới Reconciliation Service`);
    }
}

const adapterSource = new EventSource('http://localhost:4001/stream');
adapterSource.onmessage = (event) => logToBox('adapter-log', JSON.parse(event.data).log);

const posSource = new EventSource('http://localhost:4000/stream');
posSource.onmessage = (event) => logToBox('pos-log', JSON.parse(event.data).log);

const locationSource = new EventSource('http://localhost:5002/stream');
locationSource.onmessage = (event) => logToBox('location-log', JSON.parse(event.data).log);

const reconSource = new EventSource('http://localhost:6001/stream');
reconSource.onmessage = (event) => logToBox('recon-log', JSON.parse(event.data).log);