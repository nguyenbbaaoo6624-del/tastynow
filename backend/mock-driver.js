const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:5001');

const driverId = `DRV-${Math.floor(Math.random() * 1000)}`;

ws.on('open', () => {
    console.log(`[Driver App] 🟢 Tài xế ${driverId} đã kết nối WebSocket tới Location Service`);
    
    // Hiện thực ADR-002: Mô phỏng chu kỳ đẩy GPS mỗi 5 giây
    setInterval(() => {
        // Giả lập tọa độ di chuyển ngẫu nhiên quanh khu vực trung tâm TP.HCM
        const lat = 10.762622 + (Math.random() * 0.01);
        const lng = 106.660172 + (Math.random() * 0.01);
        
        const payload = JSON.stringify({
            type: 'GPS_UPDATE',
            driverId: driverId,
            lat: lat,
            lng: lng
        });
        
        ws.send(payload);
        console.log(`[Driver App] 🚀 Đã đẩy tọa độ: [${lat.toFixed(5)}, ${lng.toFixed(5)}]`);
    }, 5000);
});

ws.on('close', () => {
    console.log('[Driver App] 🔴 Đã mất kết nối tới máy chủ');
    process.exit(1);
});

// Tối ưu: Bổ sung xử lý lỗi kết nối
ws.on('error', (error) => {
    console.error(`[Driver App] ❌ Lỗi WebSocket: ${error.message}`);
});