const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Using a standard Desktop User-Agent for better compatibility with Dailymotion
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body;
    const isDailymotion = url.includes('dailymotion.com') || url.includes('dai.ly');
    
    const options = { 
      dumpSingleJson: true, 
      noCheckCertificates: true,
      userAgent: USER_AGENT,
      // Prevents the crash by disabling the impersonation retry logic
      noImpersonate: true 
    };

    // Dailymotion specifically needs a referer to avoid blocks
    if (isDailymotion) {
      options.referer = 'https://www.dailymotion.com/';
    }

    const info = await youtubedl(url, options);
    res.json({ title: info.title, thumbnail: info.thumbnail });
  } catch (error) {
    console.error("Info Fetch Error:", error);
    res.status(500).json({ error: "Could not fetch info" });
  }
});

app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query; 
  const safeTitle = (title || "download").replace(/[<>:"/\\|?*]/g, '').substring(0, 100);
  const finalFileName = type === 'mp3' ? `MP3-${safeTitle}.mp3` : `1080p-${safeTitle}.mp4`;
  
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFileName)}"`);
  res.setHeader('Content-Type', type === 'mp3' ? 'audio/mpeg' : 'video/mp4');

  let ytProcess;
  const isSocial = /instagram\.com|facebook\.com|tiktok\.com|dailymotion\.com|dai\.ly/.test(url);

  const commonOptions = {
    output: '-',
    noCheckCertificates: true,
    userAgent: USER_AGENT,
    noImpersonate: true // Critical: stops the crash on Render
  };

  if (url.includes('dailymotion.com') || url.includes('dai.ly')) {
    commonOptions.referer = 'https://www.dailymotion.com/';
  }

  if (type === 'mp3') {
    ytProcess = youtubedl.exec(url, {
      ...commonOptions,
      format: 'bestaudio/best',
      extractAudio: true,
      audioFormat: 'mp3',
    });
  } else if (isSocial) {
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

  ytProcess.stdout.pipe(res);

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
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(finalDist, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
