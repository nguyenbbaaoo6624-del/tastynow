// Thực thi ADR-004: Đối soát đơn hàng.
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
app.use(cors());

let clients = [];
function sendLog(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    let icon = '📊';
    if(type === 'error') icon = '❌';
    if(type === 'success') icon = '✅';
    if(type === 'warn') icon = '⚠️';
    const log = `[${time}] ${icon} ${message}`;
    console.log(log);
    clients.forEach(c => c.write(`data: ${JSON.stringify({ log })}\n\n`));
}

app.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    clients.push(res);
    req.on('close', () => { clients = clients.filter(c => c !== res); });
});

async function runReconciliation() {
    sendLog('Bắt đầu tiến trình đối soát (Reconciliation)...');
    try {
        const [dbRes, posRes] = await Promise.all([
            axios.get('http://localhost:6000/orders'),
            axios.get('http://localhost:4000/api/pos/transactions')
        ]);

        const dbOrders = dbRes.data;
        const posOrders = posRes.data;

        let matched = 0;
        let mismatched = 0;

        dbOrders.forEach(dbOrder => {
            const posOrder = posOrders.find(p => p.orderId === dbOrder.orderId);
            if (!posOrder) {
                sendLog(`Lệch dữ liệu: Đơn ${dbOrder.orderId} có trong DB nhưng không có trên POS`, 'error');
                mismatched++;
            } else if (dbOrder.status !== 'COMPLETED') {
                sendLog(`Sai trạng thái: Đơn ${dbOrder.orderId} chưa hoàn tất trong DB nhưng POS đã ghi nhận`, 'warn');
                mismatched++;
            } else {
                matched++;
            }
        });

        sendLog(`KẾT QUẢ ĐỐI SOÁT: Khớp ${matched} đơn | Lệch ${mismatched} đơn`, mismatched > 0 ? 'warn' : 'success');
    } catch (error) {
        sendLog('Lỗi khi lấy dữ liệu đối soát', 'error');
    }
}

// Chạy tự động mỗi phút (Demo Batch Job)
cron.schedule('* * * * *', runReconciliation);

// API chạy thủ công từ UI
app.post('/trigger', (req, res) => {
    runReconciliation();
    res.status(200).send();
});

app.listen(6001, () => console.log('Reconciliation Service chạy tại cổng 6001'));