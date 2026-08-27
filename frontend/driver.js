// Giao diện Driver App. Thiết lập kết nối WebSocket, chạy vòng lặp đẩy tọa độ GPS ngẫu nhiên về máy chủ mỗi 5 giây (ADR-002), 
// lắng nghe lệnh nhận đơn (Push Model) từ hệ thống.
function logToBox(boxId, message) {
    const box = document.getElementById(boxId);
    const div = document.createElement('div');
    div.className = 'log-line';
    div.innerHTML = message;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
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
        
        driverWs.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'NEW_ORDER') {
                logToBox('driver-log', `[${new Date().toLocaleTimeString()}] 🔔 NHẬN ĐƠN MỚI (Push Model): ${data.orderId}`);
                btnDriver.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            }
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