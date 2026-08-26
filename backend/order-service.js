const express = require('express');
const amqp = require('amqplib');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

const RABBITMQ_URL = 'amqp://admin:password123@localhost:5672';
const QUEUE_NAME = 'order_queue';
let channel = null;

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

app.post('/api/orders', async (req, res) => {
    const orderData = {
        orderId: `ORD-${Date.now()}`,
        items: req.body.items || ['1x Cơm Tấm', '1x Trà Đá'],
        total: 50000,
        timestamp: new Date().toISOString()
    };

    try {
        // Lưu vào DB trạng thái PENDING
        await axios.post('http://localhost:6000/orders', {
            orderId: orderData.orderId,
            total: orderData.total,
            status: 'PENDING'
        });

        if (channel) {
            channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(orderData)), { persistent: true });
            console.log(`[Order Service] Đã đẩy đơn hàng ${orderData.orderId} vào Queue.`);
            
            return res.status(200).json({
                message: 'Đang gửi đơn đến nhà hàng...',
                orderId: orderData.orderId,
                sla_achieved: true
            });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Lỗi hệ thống ghi nhận đơn' });
    }
});

app.listen(3000, () => console.log('Order Service đang chạy tại cổng 3000'));