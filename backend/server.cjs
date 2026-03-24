const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// High-compatibility headers
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const MOBILE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

// API: Fetch video info
app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body;
    const isDailymotion = url.includes('dailymotion.com') || url.includes('dai.ly');
    
    const options = { 
      dumpSingleJson: true, 
      noCheckCertificates: true,
      noWarnings: true,
      userAgent: isDailymotion ? USER_AGENT : MOBILE_USER_AGENT,
    };

    // Fix for Dailymotion crash on Render
    if (isDailymotion) {
      options.referer = 'https://www.dailymotion.com/';
      options.extractorArgs = 'dailymotion:impersonate=false';
    }

    const info = await youtubedl(url, options);
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
  const isDailymotion = url.includes('dailymotion.com') || url.includes('dai.ly');
  const isSocial = /instagram\.com|facebook\.com|tiktok\.com/.test(url) || isDailymotion;

  const commonOptions = {
    output: '-',
    noCheckCertificates: true,
    userAgent: isDailymotion ? USER_AGENT : MOBILE_USER_AGENT
  };

  if (isDailymotion) {
    commonOptions.referer = 'https://www.dailymotion.com/';
    commonOptions.extractorArgs = 'dailymotion:impersonate=false';
  }

  if (type === 'mp3') {
    ytProcess = youtubedl.exec(url, {
      ...commonOptions,
      format: 'bestaudio/best',
      extractAudio: true,
      audioFormat: 'mp3',
    });
  } else if (isSocial) {
    // 'b' format is more stable for social media login walls
    ytProcess = youtubedl.exec(url, {
      ...commonOptions,
      format: 'b', 
    });
  } else {
    // High-quality format for YouTube and others
    ytProcess = youtubedl.exec(url, {
      ...commonOptions,
      format: 'bestvideo[height<=1080]+bestaudio/best',
    });
  }

  ytProcess.stdout.pipe(res);

  // Stop the process if user cancels download
  res.on('close', () => {
    if (ytProcess && ytProcess.kill) ytProcess.kill('SIGINT');
  });

  ytProcess.on('error', (err) => {
    console.error("Download Process Error:", err);
    if (!res.headersSent) res.status(500).send("Download failed");
  });
});

// --- SERVE STATIC FRONTEND FILES ---
const distPath = path.join(__dirname, '..', 'dist');
const fallbackDistPath = path.join(__dirname, 'dist');
const finalDist = fs.existsSync(distPath) ? distPath : fallbackDistPath;

app.use(express.static(finalDist));

// Support for React Router / Client-side routing
app.get(/^(?!\/api).+/, (req, res) => {
  const indexPath = path.join(finalDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Frontend not found. Did you run npm run build?");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
