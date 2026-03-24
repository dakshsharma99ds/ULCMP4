const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// API: Fetch video info
app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body;
    const info = await youtubedl(url, { dumpSingleJson: true, noCheckCertificates: true });
    res.json({ title: info.title, thumbnail: info.thumbnail });
  } catch (error) {
    res.status(500).json({ error: "Could not fetch info" });
  }
});

// API: Handle download
app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query; 
  const safeTitle = (title || "download").replace(/[<>:"/\\|?*]/g, '').substring(0, 100);
  const finalFileName = type === 'mp3' ? `MP3-${safeTitle}.mp3` : `1080p-${safeTitle}.mp4`;
  
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFileName)}"`);
  res.setHeader('Content-Type', type === 'mp3' ? 'audio/mpeg' : 'video/mp4');

  let ytProcess;
  const isSocial = url.includes('instagram.com') || url.includes('facebook.com') || url.includes('tiktok.com');

  if (type === 'mp3') {
    ytProcess = youtubedl.exec(url, {
      output: '-',
      format: 'bestaudio/best',
      extractAudio: true,
      audioFormat: 'mp3',
      noCheckCertificates: true,
    });
    ytProcess.stdout.pipe(res);
  } else if (isSocial) {
    ytProcess = youtubedl.exec(url, {
      output: '-',
      format: 'best',
      noCheckCertificates: true,
    });
    ytProcess.stdout.pipe(res);
  } else {
    // Standard MP4 processing
    ytProcess = youtubedl.exec(url, {
      output: '-',
      format: 'bestvideo[height<=1080]+bestaudio/best',
      noCheckCertificates: true,
    });
    ytProcess.stdout.pipe(res);
  }
});

// SERVE STATIC FRONTEND FILES
// Vite builds files into the 'dist' folder
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback: send all other requests to the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Use Render's PORT or default to 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
