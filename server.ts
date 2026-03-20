import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import play from 'play-dl';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
});

// Initialize Supabase Admin (using service role for server-side operations)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Set up a quirky SQLite database
const db = new Database('quirky_dj.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS quirky_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fact TEXT NOT NULL,
    weirdness_level INTEGER NOT NULL
  );
`);

// Seed some quirky facts if empty
const count = db.prepare('SELECT COUNT(*) as count FROM quirky_facts').get() as { count: number };
if (count.count === 0) {
  const insert = db.prepare('INSERT INTO quirky_facts (fact, weirdness_level) VALUES (?, ?)');
  insert.run('The first DJ mixer was just two turntables and a microphone taped together.', 8);
  insert.run('Some DJs use vinyl records made of actual chocolate.', 10);
  insert.run('A 120 BPM track syncs perfectly with the average human walking pace.', 5);
  insert.run('Skrillex accidentally created his signature bass drop by dropping his laptop.', 9);
  insert.run('The longest DJ set ever lasted 240 hours. The DJ hallucinated that the crowd was made of pizza.', 11);
}

// API Routes
app.get('/api/quirky-facts', (req, res) => {
  const facts = db.prepare('SELECT * FROM quirky_facts ORDER BY RANDOM() LIMIT 1').get();
  res.json(facts);
});

// Multer setup for file uploads (if needed for temporary storage)
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', playdl: true });
});

// Helper to check and reset daily limit
async function checkDailyLimit(userId: string) {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('daily_count, last_reset')
    .eq('id', userId)
    .single();

  if (error || !profile) return { canGenerate: true, count: 0 };

  const lastReset = new Date(profile.last_reset);
  const now = new Date();
  const diffHours = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

  if (diffHours >= 24) {
    // Reset counter
    await supabaseAdmin
      .from('profiles')
      .update({ daily_count: 0, last_reset: now.toISOString() })
      .eq('id', userId);
    return { canGenerate: true, count: 0 };
  }

  return { canGenerate: profile.daily_count < 5, count: profile.daily_count };
}

app.post('/api/extract-youtube', async (req, res) => {
  const { url, userId, title: bodyTitle } = req.body;

  const isLocal = url === 'local_upload';
  if (!isLocal && (!url || play.yt_validate(url) === false)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    let unlocked = true;
    if (userId) {
      const { canGenerate, count } = await checkDailyLimit(userId);
      if (!canGenerate) {
        unlocked = false;
      } else {
        // Increment count
        await supabaseAdmin
          .from('profiles')
          .update({ daily_count: count + 1 })
          .eq('id', userId);
      }
    }

    let title = bodyTitle || 'audio';
    if (!isLocal) {
      const info = await play.video_info(url);
      title = bodyTitle || info.video_details.title || 'audio';
    }
    
    // Store mix in DB
    const { data: mix, error: mixError } = await supabaseAdmin
      .from('mixes')
      .insert({
        userId: userId,
        name: title,
        url: url,
        unlocked: unlocked,
        createdAt: new Date().toISOString(),
        mode: 'AI Mix', // Default mode for tracking
        settings: {},
        tracks: []
      })
      .select()
      .single();

    if (mixError) throw mixError;

    res.json({ 
      success: true, 
      mixId: mix.id, 
      unlocked: unlocked,
      title: title
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Failed to process audio' });
  }
});

// Razorpay: Create Order
app.post('/api/razorpay/order', async (req, res) => {
  const { mixId } = req.body;
  
  try {
    const options = {
      amount: 500, // ₹5 in paise
      currency: 'INR',
      receipt: `receipt_${mixId}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Razorpay Order Error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// Razorpay: Verify Payment
app.post('/api/razorpay/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mixId } = req.body;

  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret')
    .update(sign.toString())
    .digest("hex");

  if (razorpay_signature === expectedSign) {
    // Payment successful: Unlock the mix
    try {
      await supabaseAdmin
        .from('mixes')
        .update({ unlocked: true })
        .eq('id', mixId);

      res.json({ success: true, message: "Payment verified successfully" });
    } catch (error) {
      console.error('Unlock Error:', error);
      res.status(500).json({ error: 'Payment verified but failed to unlock mix' });
    }
  } else {
    res.status(400).json({ error: "Invalid signature" });
  }
});

// Download Route (Secure)
app.get('/api/download/:mixId', async (req, res) => {
  const { mixId } = req.params;

  try {
    const { data: mix, error } = await supabaseAdmin
      .from('mixes')
      .select('*')
      .eq('id', mixId)
      .single();

    if (error || !mix) return res.status(404).json({ error: 'Mix not found' });
    if (!mix.unlocked) return res.status(403).json({ error: 'Mix is locked. Please pay to download.' });

    const stream = await play.stream(mix.url);
    const safeTitle = mix.name.replace(/[^a-z0-9]/gi, '_');
    const filename = `${safeTitle}.mp3`;

    res.header('Content-Type', 'audio/mpeg'); 
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    stream.stream.pipe(res);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download audio' });
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
