import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import play from 'play-dl';
import fs from 'fs';
import path from 'path';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Multer setup for file uploads (if needed for temporary storage)
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Razorpay Instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', playdl: true });
});

app.post('/api/extract-youtube', async (req, res) => {
  const { url } = req.body;

  if (!url || play.yt_validate(url) === false) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    const info = await play.video_info(url);
    const stream = await play.stream(url);

    const title = info.video_details.title || 'audio';
    // Sanitize filename
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_');
    const filename = `${safeTitle}.mp3`;

    // play-dl streams are usually webm/opus or similar, but we can set content type to audio/mpeg 
    // and let the browser handle it, or just generic audio
    // The stream object has a 'type' property
    
    res.header('Content-Type', 'audio/mpeg'); 
    res.header('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe the stream directly to the response
    stream.stream.pipe(res);

  } catch (error) {
    console.error('YouTube extraction error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to extract audio' });
    }
  }
});

app.post('/api/payments/order', async (req, res) => {
  const { amount, currency = 'INR', receipt } = req.body;

  try {
    const options = {
      amount: amount * 100, // amount in the smallest currency unit (paise for INR)
      currency,
      receipt,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Razorpay order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.post('/api/payments/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || '')
    .update(sign.toString())
    .digest("hex");

  if (razorpay_signature === expectedSign) {
    res.json({ success: true, message: "Payment verified successfully" });
  } else {
    res.status(400).json({ success: false, message: "Invalid signature" });
  }
});

// Vite Middleware
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  // Serve static files in production
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
