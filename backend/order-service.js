const express = require('express');
const amqp = require('amqplib');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const RABBITMQ_URL = 'amqp://admin:password123@localhost:5672';
const QUEUE_NAME = 'order_queue';

let channel = null;

// Kết nối RabbitMQ
async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log('[Order Service] Đã kết nối thành công tới RabbitMQ');
    } catch (error) {
        console.error('[Order Service] Lỗi kết nối RabbitMQ:', error);
    }
}
connectRabbitMQ();

// API Đặt món - Hiện thực ADR-001 (SLA < 3s)
app.post('/api/orders', async (req, res) => {
    const orderData = {
        orderId: `ORD-${Date.now()}`,
        items: req.body.items || ['1x Cơm Tấm', '1x Trà Đá'],
        total: 50000,
        timestamp: new Date().toISOString()
    };

    if (channel) {
        // Đẩy vào Queue
        channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(orderData)), { persistent: true });
        console.log(`[Order Service] Đã đẩy đơn hàng ${orderData.orderId} vào Queue.`);
        
        // Phản hồi ngay lập tức cho App
        return res.status(200).json({
            message: 'Đang gửi đơn đến nhà hàng...',
            orderId: orderData.orderId,
            sla_achieved: true
        });
    } else {
        return res.status(500).json({ error: 'Lỗi hệ thống Message Broker' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Order Service đang chạy tại: http://localhost:${PORT}`);
});