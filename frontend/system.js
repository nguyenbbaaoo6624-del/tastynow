// Dashboard hệ thống nội bộ và nhà hàng. Theo dõi log luồng dữ liệu RabbitMQ, giám sát Mock POS, 
// cung cấp nút giả lập sập mạng (Chaos Mode), nút kích hoạt đối soát và hiển thị bảng dữ liệu đơn hàng tranh chấp (Dispute DB - ADR-004).
function logToBox(boxId, message) {
    const box = document.getElementById(boxId);
    const div = document.createElement('div');
    div.className = 'log-line';
    div.innerHTML = message;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
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

const reconSource = new EventSource('http://localhost:6001/stream');
reconSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    logToBox('recon-log', data.log);
    
    if (data.disputes && data.disputes.length > 0) {
        const tbody = document.getElementById('dispute-body');
        tbody.innerHTML = '';
        data.disputes.forEach(d => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${d.time}</td><td>${d.orderId}</td><td>${d.reason}</td>`;
            tbody.appendChild(tr);
        });
    }
};