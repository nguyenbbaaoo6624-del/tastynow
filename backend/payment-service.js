// (Cổng 8000) Cấu kiện này mô phỏng việc giao tiếp với Cổng thanh toán (VNPay/MoMo) trước khi đơn hàng được lên lịch.
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/pay', (req, res) => {
    const { orderId, amount } = req.body;
    console.log(`[Payment Service] Đang xử lý thanh toán VNPay/MoMo cho đơn ${orderId}...`);
    
    // Giả lập thời gian phản hồi từ VNPay là 100ms
    setTimeout(() => {
        console.log(`[Payment Service] Thanh toán thành công đơn ${orderId}`);
        res.status(200).json({ success: true, transactionId: `VNPAY_${Date.now()}` });
    }, 100);
});

app.listen(8000, () => console.log('Payment Service chạy tại cổng 8000'));