const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Bypasses basic bot detection by mimicking a mobile device
const MOBILE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

// API: Fetch video info
app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body;
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

  const commonOptions = {
    output: '-',
    noCheckCertificates: true,
    userAgent: MOBILE_USER_AGENT
  };

  if (type === 'mp3') {
    ytProcess = youtubedl.exec(url, {
      ...commonOptions,
      format: 'bestaudio/best',
      extractAudio: true,
      audioFormat: 'mp3',
    });
  } else if (isSocial) {
    // Uses 'b' for pre-merged files to bypass social media login walls
    ytProcess = youtubedl.exec(url, {
      ...commonOptions,
      format: 'b', 
    });
  } else {
    ytProcess = youtubedl.exec(url, {
      ...commonOptions,
      format: 'bestvideo[height<=1080]+bestaudio/best',
    });
  }

  // Pipe the download stream to the user
  ytProcess.stdout.pipe(res);

  // CRITICAL: Cleanup process if the user cancels the download
  res.on('close', () => {
    if (ytProcess && ytProcess.kill) {
      ytProcess.kill('SIGINT');
    }
  });

  ytProcess.on('error', (err) => {
    console.error("Download Process Error:", err);
    if (!res.headersSent) res.status(500).send("Download failed");
  });
});

// --- SERVE STATIC FRONTEND FILES ---
// Logic to handle different directory structures on Render vs Local
const distPath = path.join(__dirname, '..', 'dist');
const fallbackDistPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
} else {
  app.use(express.static(fallbackDistPath));
}

// Final catch-all to serve index.html for React Router compatibility
app.get(/^(?!\/api).+/, (req, res) => {
  const indexPath = fs.existsSync(path.join(distPath, 'index.html')) 
    ? path.join(distPath, 'index.html') 
    : path.join(fallbackDistPath, 'index.html');
  
  res.sendFile(indexPath);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
