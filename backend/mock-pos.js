const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.text({ type: '*/xml' }));

let isChaosMode = false;
let clients = [];

// Hàm đẩy log ra cả Terminal và giao diện Web
function sendLog(message, isError = false) {
    const time = new Date().toLocaleTimeString();
    const log = `[${time}] ${isError ? '❌ ' : '✅ '} ${message}`;
    console.log(log);
    clients.forEach(c => c.write(`data: ${JSON.stringify({ log })}\n\n`));
}

// Mở luồng kết nối SSE cho Web
app.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    clients.push(res);
    req.on('close', () => { clients = clients.filter(c => c !== res); });
});

app.post('/soap/order', (req, res) => {
    sendLog(`Nhận yêu cầu in bill... (Chaos Mode: ${isChaosMode ? 'BẬT' : 'TẮT'})`);
    if (isChaosMode) {
        sendLog('SỰ CỐ: Giả lập rớt mạng / Máy POS bị treo!', true);
        return setTimeout(() => res.status(504).send('<error>Gateway Timeout</error>'), 5000);
    }
    setTimeout(() => {
        sendLog('THÀNH CÔNG: Đã in bill xuống bếp.');
        res.status(200).send('<response>OK</response>');
    }, 500);
});

app.get('/toggle-chaos', (req, res) => {
    isChaosMode = !isChaosMode;
    sendLog(`Đã chuyển trạng thái mạng: ${isChaosMode ? 'ĐỨT MẠNG' : 'BÌNH THƯỜNG'}`, isChaosMode);
    res.send({ status: isChaosMode });
});

app.listen(4000, () => console.log('Mock POS System chạy tại cổng 4000'));