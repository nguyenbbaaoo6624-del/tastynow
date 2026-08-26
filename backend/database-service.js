// Mô phỏng cơ sở dữ liệu lưu trữ trạng thái đơn hàng.
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = new Map();
let clients = [];

app.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Bắt buộc xả bộ đệm để gửi dữ liệu ngay lập tức
    
    clients.push(res);
    console.log(`[DB] Cập nhật: Có ${clients.length} client đang theo dõi trạng thái đơn hàng.`);
    req.on('close', () => { 
        clients = clients.filter(c => c !== res); 
    });
});

app.post('/orders', (req, res) => {
    const { orderId, total, status } = req.body;
    db.set(orderId, { orderId, total, status, system: 'DB' });
    res.status(201).send();
});

app.put('/orders/:id', (req, res) => {
    const id = req.params.id;
    let order = db.get(id);
    
    if (!order) {
        order = { orderId: id, total: 0, system: 'DB' };
    }
    
    order.status = req.body.status;
    db.set(id, order);
    
    console.log(`[DB] Đã cập nhật trạng thái đơn ${id} thành ${order.status}. Đang gửi thông báo tới Customer App...`);
    
    // Đẩy sự kiện về Frontend lập tức
    clients.forEach(c => c.write(`data: ${JSON.stringify({ orderId: id, status: order.status })}\n\n`));
    res.status(200).send();
});

app.get('/orders', (req, res) => {
    res.json(Array.from(db.values()));
});

app.listen(6000, () => console.log('Database Service chạy tại cổng 6000'));