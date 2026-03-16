import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import play from 'play-dl';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

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
