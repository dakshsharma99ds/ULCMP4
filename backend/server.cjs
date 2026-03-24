const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Common User-Agent to bypass basic bot detection
const MOBILE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

// API: Fetch video info
app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body;
    // Added User-Agent here to prevent info-fetch blocks
    const info = await youtubedl(url, { 
      dumpSingleJson: true, 
      noCheckCertificates: true,
      userAgent: MOBILE_USER_AGENT 
    });
    res.json({ title: info.title, thumbnail: info.thumbnail });
  } catch (error) {
    console.error("Info Fetch Error:", error);
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
      userAgent: MOBILE_USER_AGENT // Added for consistency
    });
    ytProcess.stdout.pipe(res);
  } else if (isSocial) {
    // --- FIX APPLIED HERE ---
    ytProcess = youtubedl.exec(url, {
      output: '-',
      format: 'b', // Using 'b' (best single file) instead of 'best'
      noCheckCertificates: true,
      userAgent: MOBILE_USER_AGENT // Identifying as iPhone
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

  // Basic error handling for the process
  ytProcess.on('error', (err) => {
    console.error("Process Error:", err);
    if (!res.headersSent) res.status(500).send("Download failed");
  });
});

// --- SERVE STATIC FRONTEND FILES ---
app.use(express.static(path.join(__dirname, '..', 'dist')));

// FINAL COMPATIBILITY FIX: Use a Regular Expression for the catch-all
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
