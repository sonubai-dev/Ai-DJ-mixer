import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import ytdl from '@distube/ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

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

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ytdl: true, ffmpeg: true });
});

app.post('/api/extract-youtube', async (req, res) => {
  const { url } = req.body;

  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

    if (!format) {
      return res.status(400).json({ error: 'No audio format found' });
    }

    res.header('Content-Type', 'audio/mpeg');
    res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp3"`);

    // Stream audio directly to client
    // Note: In a real production app, we might want to use ffmpeg to convert to MP3 if the source isn't MP3.
    // ytdl-core usually returns webm/opus or m4a/aac.
    // We can pipe it through ffmpeg to ensure MP3.
    
    const stream = ytdl(url, { format: format });
    
    // Simple pipe for now. The client AudioContext can decode many formats (webm, m4a, mp3).
    // We don't strictly *need* to convert to MP3 on the server if the browser can decode it.
    // However, the prompt asked for "Stream MP3 audio back".
    // Let's try to convert using ffmpeg.
    
    ffmpeg(stream)
      .format('mp3')
      .audioBitrate(128)
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Audio processing failed' });
        }
      })
      .pipe(res, { end: true });

  } catch (error) {
    console.error('YouTube extraction error:', error);
    res.status(500).json({ error: 'Failed to extract audio' });
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
