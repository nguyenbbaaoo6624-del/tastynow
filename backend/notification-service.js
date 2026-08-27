//(Cổng 9000) Bóc tách luồng gửi thông báo SSE từ Database sang cấu kiện độc lập. 
// Dịch vụ này chuyên trách đẩy thông báo (Push Notification) về cho Customer App.
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let clients = [];

// Luồng SSE kết nối với Customer App
app.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    clients.push(res);
    console.log(`[Notification Service] Có ${clients.length} thiết bị khách hàng đang lắng nghe.`);
    req.on('close', () => { clients = clients.filter(c => c !== res); });
});

// API nhận sự kiện từ hệ thống lõi để đẩy thông báo
app.post('/notify', (req, res) => {
    const { orderId, status } = req.body;
    console.log(`[Notification Service] Đang đẩy Push Notification cho đơn ${orderId} (Trạng thái: ${status})`);
    
    clients.forEach(c => c.write(`data: ${JSON.stringify({ orderId, status })}\n\n`));
    res.status(200).send();
});

app.listen(9000, () => console.log('Notification Service chạy tại cổng 9000'));