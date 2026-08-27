// (Cổng 7000): Thực thi thuật toán điều phối (ADR-003). 
// Lấy dữ liệu vị trí tài xế từ Location Service và tự động ép đơn (Push) cho tài xế trực tuyến.
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/match', async (req, res) => {
    const { orderId } = req.body;
    try {
        const locRes = await axios.get('http://localhost:5002/drivers');
        const drivers = locRes.data;
        const driverIds = Object.keys(drivers);
        
        if (driverIds.length === 0) {
            console.log(`[Matching Engine] Đơn ${orderId}: Không có tài xế online.`);
            return res.status(404).send();
        }

        // Mô phỏng ADR-003: Quét GEORADIUS và dùng Push Model ép đơn cho tài xế
        const selectedDriver = driverIds[Math.floor(Math.random() * driverIds.length)];
        console.log(`[Matching Engine] Đã ép đơn ${orderId} cho tài xế ${selectedDriver}`);
        
        await axios.post('http://localhost:5002/push-order', { driverId: selectedDriver, orderId });
        res.status(200).send();
    } catch (error) {
        res.status(500).send();
    }
});

app.listen(7000, () => console.log('Matching Service chạy tại cổng 7000'));