// (Cổng 5001 WSS / 5002 HTTP): Duy trì kết nối trạng thái (Stateful) với tài xế qua WebSocket. 
// Lưu trữ tọa độ GPS (mô phỏng GeoCache) và cung cấp API đẩy thông báo có đơn mới ngược về ứng dụng tài xế.
const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const clientsSSE = [];
const drivers = new Map(); 
const driverSockets = new Map(); 

app.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    clientsSSE.push(res);
    req.on('close', () => {
        const index = clientsSSE.indexOf(res);
        if (index !== -1) clientsSSE.splice(index, 1);
    });
});

function logToUI(message) {
    console.log(message);
    clientsSSE.forEach(c => c.write(`data: ${JSON.stringify({ log: message })}\n\n`));
}

app.get('/drivers', (req, res) => {
    res.json(Object.fromEntries(drivers));
});

app.post('/push-order', (req, res) => {
    const { driverId, orderId } = req.body;
    const ws = driverSockets.get(driverId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'NEW_ORDER', orderId }));
        logToUI(`[Matching] Đã Push đơn ${orderId} tới thiết bị tài xế ${driverId}`);
    }
    res.status(200).send();
});

app.listen(5002, () => console.log('Location Service UI Stream cổng 5002'));

const wss = new WebSocket.Server({ port: 5001 }, () => console.log('WebSocket Server cổng 5001'));
wss.on('connection', (ws) => {
    let currentDriverId = null;
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'GPS_UPDATE') {
            currentDriverId = data.driverId;
            drivers.set(data.driverId, { lat: data.lat, lng: data.lng });
            driverSockets.set(data.driverId, ws);
            logToUI(`[GeoCache] Đã cập nhật tọa độ Driver ${data.driverId}: [${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}]`);
        }
    });
    ws.on('close', () => {
        if (currentDriverId) {
            drivers.delete(currentDriverId);
            driverSockets.delete(currentDriverId);
            logToUI(`[System] Driver ${currentDriverId} ngắt kết nối`);
        }
    });
});