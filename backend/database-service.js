// (Cổng 6000): Lưu trữ trạng thái vòng đời đơn hàng. 
// Loại bỏ luồng SSE cũ, thay bằng thao tác gọi sang Notification Service khi trạng thái đơn được cập nhật.
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const db = new Map();

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
    
    console.log(`[DB] Cập nhật thành công đơn ${id}. Kích hoạt Notification Service...`);
    
    // Gọi Notification Service đẩy thông báo cho khách (Bóc tách cấu kiện)
    axios.post('http://localhost:9000/notify', { orderId: id, status: order.status }).catch(() => {});
    
    res.status(200).send();
});

app.get('/orders', (req, res) => {
    res.json(Array.from(db.values()));
});

app.listen(6000, () => console.log('Database Service chạy tại cổng 6000'));