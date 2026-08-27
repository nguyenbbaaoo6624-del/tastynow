// (Cổng 3000): Tiếp nhận yêu cầu đặt món từ khách hàng, 
// Cập nhật luồng đặt món: Khách hàng đặt món -> Gọi Payment Service thanh toán -> Thành công mới đẩy vào RabbitMQ.
const express = require('express');
const amqp = require('amqplib');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const RABBITMQ_URL = 'amqp://admin:password123@localhost:5672';
const QUEUE_NAME = 'order_queue';
let channel = null;

async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log('Order Service đã kết nối RabbitMQ');
    } catch (error) {
        console.error('Lỗi kết nối RabbitMQ:', error);
    }
}
connectRabbitMQ();

app.post('/api/orders', async (req, res) => {
    const orderId = `ORD-${Date.now()}`;
    const orderPayload = { orderId, items: req.body.items, total: 150000, status: 'PENDING' };

    try {
        // 1. GỌI PAYMENT SERVICE (VNPay/MoMo) - ADR-004
        await axios.post('http://localhost:8000/pay', { orderId, amount: 150000 });

        // 2. Lưu vào Database
        await axios.post('http://localhost:6000/orders', orderPayload);

        // 3. Đẩy vào RabbitMQ (SLA < 3s - ADR-001)
        if (channel) {
            channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(orderPayload)), { persistent: true });
        }

        res.status(200).json({ message: 'Đặt món thành công', orderId });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi hệ thống' });
    }
});

app.listen(3000, () => console.log('Order Service chạy tại cổng 3000'));