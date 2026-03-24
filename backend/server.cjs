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
    ytProcess = youtubedl.exec(url, {
      output: '-',
      format: 'bestvideo[height<=1080]+bestaudio/best',
      noCheckCertificates: true,
    });
    ytProcess.stdout.pipe(res);
  }
});

// --- SERVE STATIC FRONTEND FILES ---
app.use(express.static(path.join(__dirname, '..', 'dist')));

// FINAL COMPATIBILITY FIX: Use a Regular Expression for the catch-all
// This avoids the 'Missing parameter name' error in Express 5.x
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
