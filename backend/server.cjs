const express = require('express');
const cors = require('cors');
const path = require('path');
const youtubedl = require('youtube-dl-exec');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const COMMON_FLAGS = {
  noCheckCertificates: true,
  noWarnings: true,
  addHeader: [
    'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  ]
};

// 1. Info Route with Dailymotion Manual Scraping
app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  if (url.includes('dailymotion.com') || url.includes('dai.ly')) {
    try {
      const { data: html } = await axios.get(url, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' } 
      });
      const title = html.match(/<meta property="og:title" content="(.*?)"/)?.[1] || "Dailymotion Video";
      const thumbnail = html.match(/<meta property="og:image" content="(.*?)"/)?.[1] || "";
      return res.json({ title, thumbnail });
    } catch (err) {
      console.warn("Dailymotion scraping fallback...");
    }
  }

  try {
    const info = await youtubedl(url, { dumpSingleJson: true, ...COMMON_FLAGS });
    res.json({ title: info.title, thumbnail: info.thumbnail });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch media info." });
  }
});

// 2. Download Route with Dailymotion Bypass
app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query;
  if (!url) return res.status(400).send("No URL provided");

  const isMp3 = type === 'mp3';
  const fileName = `${encodeURIComponent(title || 'download')}.${isMp3 ? 'mp3' : 'mp4'}`;

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', isMp3 ? 'audio/mpeg' : 'video/mp4');

  const downloadFlags = {
    output: '-',
    format: isMp3 ? 'bestaudio' : 'bestvideo+bestaudio/best',
    ...COMMON_FLAGS
  };

  // If it's Dailymotion, we force the "Generic" extractor to bypass impersonation errors
  if (url.includes('dailymotion.com') || url.includes('dai.ly')) {
    downloadFlags.allowedExtractors = 'generic,dailymotion';
    // We also use a simpler format for Dailymotion to avoid the m3u8 impersonation loop
    if (!isMp3) downloadFlags.format = 'best'; 
  }

  try {
    const ytProcess = youtubedl.exec(url, downloadFlags);
    ytProcess.stdout.pipe(res);
    res.on('close', () => { if (ytProcess.kill) ytProcess.kill(); });
  } catch (error) {
    res.status(500).send("Download failed.");
  }
});

const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get(/^((?!\/api).)*$/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`--- ULCMP4 FINAL RESTORE ON ${PORT} ---`));
