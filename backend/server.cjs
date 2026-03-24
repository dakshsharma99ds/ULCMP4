const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

const app = express();
app.use(cors());
app.use(express.json());

const MOBILE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

// --- HELPER: COBALT v10 BYPASS ---
async function fetchViaCobalt(url, type = 'video') {
  // Use the modern v10 endpoint
  const response = await fetch('https://api.cobalt.tools/api/json', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: url,
      // 'downloadMode' is the v10 standard
      downloadMode: type === 'mp3' ? 'audio' : 'video',
      videoQuality: '1080',
    })
  });
  return await response.json();
}

// API: Fetch video info
app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body;

    // Safety: Prevent crashes from non-URL text
    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ error: "Please enter a valid URL." });
    }

    // Problem sites that block Render IPs
    const isProblemSite = /instagram\.com|x\.com|twitter\.com|dailymotion\.com|dai\.ly|facebook\.com/.test(url);

    if (isProblemSite) {
      const data = await fetchViaCobalt(url);
      if (data.status === 'error') throw new Error(data.text);
      
      return res.json({ 
        title: "Social Media Media", 
        thumbnail: "https://placehold.co/600x400?text=Ready+to+Download" 
      });
    }

    const info = await youtubedl(url, { 
      dumpSingleJson: true, 
      noCheckCertificates: true,
      userAgent: MOBILE_USER_AGENT 
    });
    res.json({ title: info.title, thumbnail: info.thumbnail });
  } catch (error) {
    console.error("Info Fetch Error:", error);
    res.status(500).json({ error: "Could not fetch info." });
  }
});

// API: Handle download
app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query; 
  
  if (!url || !url.startsWith('http')) return res.status(400).send("Invalid URL");

  const safeTitle = (title || "download").replace(/[<>:"/\\|?*]/g, '').substring(0, 100);
  const finalFileName = type === 'mp3' ? `MP3-${safeTitle}.mp3` : `1080p-${safeTitle}.mp4`;
  
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFileName)}"`);
  res.setHeader('Content-Type', type === 'mp3' ? 'audio/mpeg' : 'video/mp4');

  const isProblemSite = /instagram\.com|x\.com|twitter\.com|dailymotion\.com|dai\.ly|facebook\.com/.test(url);

  if (isProblemSite) {
    try {
      const data = await fetchViaCobalt(url, type);
      if (data.url) {
        const mediaRes = await fetch(data.url);
        return Readable.fromWeb(mediaRes.body).pipe(res);
      }
    } catch (err) {
      console.error("Cobalt Error:", err);
    }
  }

  // Fallback for Reddit, LinkedIn, etc.
  let ytProcess;
  const commonOptions = { output: '-', noCheckCertificates: true, userAgent: MOBILE_USER_AGENT };

  if (type === 'mp3') {
    ytProcess = youtubedl.exec(url, { ...commonOptions, format: 'bestaudio/best', extractAudio: true, audioFormat: 'mp3' });
  } else {
    ytProcess = youtubedl.exec(url, { ...commonOptions, format: 'bestvideo[height<=1080]+bestaudio/best' });
  }

  ytProcess.stdout.pipe(res);

  // Stop zombie processes on Render
  res.on('close', () => { if (ytProcess?.kill) ytProcess.kill('SIGINT'); });
  ytProcess.on('error', (err) => {
    console.error("Download Error:", err);
    if (!res.headersSent) res.status(500).send("Download failed");
  });
});

// --- SERVE STATIC FRONTEND ---
const distPath = path.join(__dirname, '..', 'dist');
const fallbackDistPath = path.join(__dirname, 'dist');
const finalDist = fs.existsSync(distPath) ? distPath : fallbackDistPath;

app.use(express.static(finalDist));
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(finalDist, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
