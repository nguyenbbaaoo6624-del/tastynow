const WebSocket = require('ws');
const { createClient } = require('redis');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

let clients = [];
function sendLog(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    let icon = '📍';
    if(type === 'error') icon = '❌';
    if(type === 'success') icon = '✅';
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
app.listen(5002, () => console.log('Location Service UI Stream chạy tại cổng 5002'));

const REDIS_URL = 'redis://localhost:6379';
let redisClient;

async function startLocationService() {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', (err) => sendLog(`[Redis] Lỗi: ${err.message}`, 'error'));
    await redisClient.connect();
    sendLog('Đã kết nối thành công tới Redis (GeoCache)', 'success');

    const wss = new WebSocket.Server({ port: 5001 });
    sendLog('WebSocket Server đang chạy tại: ws://localhost:5001', 'success');

    wss.on('connection', (ws) => {
        sendLog('🟢 Một tài xế vừa kết nối (WebSocket Mở)', 'success');
        ws.on('message', async (message) => {
            try {
                // Tối ưu: Ép kiểu Buffer sang String trước khi parse
                const data = JSON.parse(message.toString());
                if (data.type === 'GPS_UPDATE') {
                    await redisClient.geoAdd('driver_locations', {
                        longitude: data.lng,
                        latitude: data.lat,
                        member: data.driverId
                    });
                    sendLog(`Cập nhật GPS cho ${data.driverId}: [${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}]`);
                }
            } catch (error) {
                sendLog('Lỗi parse dữ liệu', 'error');
            }
        });
        ws.on('close', () => sendLog('🔴 Tài xế đã ngắt kết nối', 'error'));
    });
}
startLocationService();