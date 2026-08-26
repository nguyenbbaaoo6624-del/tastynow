const amqp = require('amqplib');
const axios = require('axios');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

let clients = [];

function sendLog(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    let icon = '⚙️';
    if(type === 'error') icon = '❌';
    if(type === 'success') icon = '✅';
    if(type === 'warn') icon = '♻️';
    const log = `[${time}] ${icon} ${message}`;
    console.log(log);
    clients.forEach(c => c.write(`data: ${JSON.stringify({ log })}\n\n`));
}

app.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    clients.push(res);
    req.on('close', () => { clients = clients.filter(c => c !== res); });
});
app.listen(4001, () => console.log('POS Adapter UI Stream chạy tại cổng 4001'));

const RABBITMQ_URL = 'amqp://admin:password123@localhost:5672';
const QUEUE_NAME = 'order_queue';
const MOCK_POS_URL = 'http://localhost:4000/soap/order';

async function startAdapter() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        
        channel.prefetch(1);
        sendLog('Đang chờ nhận đơn hàng từ Queue...');

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const orderData = JSON.parse(msg.content.toString());
                sendLog(`Đã kéo đơn hàng ${orderData.orderId} từ Queue`, 'info');
                
                const xmlPayload = `
                    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
                        <soapenv:Body>
                            <Order>
                                <ID>${orderData.orderId}</ID>
                                <Total>${orderData.total}</Total>
                                <Items>${orderData.items.join(', ')}</Items>
                            </Order>
                        </soapenv:Body>
                    </soapenv:Envelope>
                `.trim();

                try {
                    // 1. Gửi xuống Mock POS
                    await axios.post(MOCK_POS_URL, xmlPayload, {
                        headers: { 'Content-Type': 'text/xml' },
                        timeout: 3000 
                    });
                    sendLog(`Thành công! POS đã nhận.`, 'success');

                    // 2. Cập nhật Database
                    await axios.put(`http://localhost:6000/orders/${orderData.orderId}`, { status: 'COMPLETED' });
                    sendLog(`Đã đồng bộ trạng thái COMPLETED lên Database cho đơn ${orderData.orderId}`, 'success');

                    // 3. Xóa đơn khỏi Queue
                    channel.ack(msg);
                } catch (error) {
                    sendLog(`LỖI GIAO TIẾP HOẶC DB: ${error.message}`, 'error');
                    sendLog(`Kích hoạt Requeue: Trả đơn ${orderData.orderId} về lại Queue.`, 'warn');
                    setTimeout(() => { channel.nack(msg, false, true); }, 3000);
                }
            }
        });
    } catch (error) {
        sendLog(`Lỗi kết nối RabbitMQ: ${error.message}`, 'error');
    }
}
startAdapter();