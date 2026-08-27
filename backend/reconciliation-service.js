// Thực thi ADR-004: Đối soát đơn hàng.
// (Cổng 6001): Tiến trình đối soát chạy ngầm (Batch Processing - ADR-004). 
// Đối chiếu dữ liệu giữa Database và Mock POS, lọc ra các đơn hàng lỗi/lệch và đẩy vào danh sách Dispute DB.
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
app.use(cors());

let clients = [];
const disputeDB = []; 

function sendLog(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    let icon = '📊';
    if(type === 'error') icon = '❌';
    if(type === 'success') icon = '✅';
    if(type === 'warn') icon = '⚠️';
    const log = `[${time}] ${icon} ${message}`;
    console.log(log);
    
    clients.forEach(c => c.write(`data: ${JSON.stringify({ log, disputes: disputeDB })}\n\n`));
}

app.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
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
            
            if (!posOrder || dbOrder.status !== 'COMPLETED') {
                const existingDispute = disputeDB.find(d => d.orderId === dbOrder.orderId);
                if (!existingDispute) {
                    disputeDB.push({
                        orderId: dbOrder.orderId,
                        reason: !posOrder ? 'POS mất kết nối/Thiếu dữ liệu' : 'Kẹt ở trạng thái PENDING',
                        time: new Date().toLocaleTimeString()
                    });
                }
                mismatched++;
                sendLog(`Đẩy đơn ${dbOrder.orderId} vào Dispute DB`, 'error');
            } else {
                matched++;
            }
        });

        sendLog(`KẾT QUẢ ĐỐI SOÁT: Khớp ${matched} | Đưa vào Dispute DB ${mismatched}`, mismatched > 0 ? 'warn' : 'success');
    } catch (error) {
        sendLog('Lỗi khi lấy dữ liệu đối soát', 'error');
    }
}

cron.schedule('* * * * *', runReconciliation);

app.post('/trigger', (req, res) => {
    runReconciliation();
    res.status(200).send();
});

app.listen(6001, () => console.log('Reconciliation Service chạy cổng 6001'));