const express = require('express');
const cors = require('cors');
const path = require('path');
const youtubedl = require('youtube-dl-exec');

const app = express();
app.use(cors());
app.use(express.json());

const COMMON_FLAGS = {
  noCheckCertificates: true,
  noWarnings: true,
  noPlaylist: true,
  addHeader: [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language: en-US,en;q=0.9',
    'Referer: https://www.instagram.com/'
  ]
};

// Utility to strip tracking parameters that confuse some extractors
const cleanUrl = (url) => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('instagram.com')) {
      // Keep only the base path (e.g., /reel/ID/)
      return `${urlObj.origin}${urlObj.pathname}`;
    }
    return url;
  } catch (e) {
    return url;
  }
};

app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });
  
  const targetUrl = cleanUrl(url);
  
  try {
    const info = await youtubedl(targetUrl, { dumpSingleJson: true, ...COMMON_FLAGS });
    res.json({ 
      title: info.title || "Instagram Video", 
      thumbnail: info.thumbnail || "",
      duration: info.duration || 0 
    });
  } catch (error) {
    console.error("yt-dlp Info Error:", error.message);
    res.status(500).json({ error: "Failed to fetch media info." });
  }
});

app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query;
  if (!url) return res.status(400).send("No URL provided");

  const targetUrl = cleanUrl(url);
  const isMp3 = type === 'mp3';
  const isReddit = targetUrl.includes('reddit.com');
  const fileName = `${encodeURIComponent(title || 'download')}.${isMp3 ? 'mp3' : 'mp4'}`;

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', isMp3 ? 'audio/mpeg' : 'video/mp4');

  try {
    let formatSelection = isMp3 ? 'bestaudio/best' : (isReddit ? 'bestvideo+bestaudio/best' : 'best[ext=mp4]/b/best');

    const ytProcess = youtubedl.exec(targetUrl, {
      output: '-',
      format: formatSelection,
      ...COMMON_FLAGS,
      noCheckFormats: true,
      noPart: true,
      extractorRetries: 2,
      noMtime: true,
      youtubeSkipDashManifest: true 
    });

    ytProcess.stdout.pipe(res);

    ytProcess.on('error', (err) => {
      console.error("yt-dlp Execution Error:", err.message);
      if (!res.headersSent) res.status(500).end();
    });

    res.on('close', () => {
      if (ytProcess.kill) ytProcess.kill();
    });
  } catch (error) {
    console.error("Critical Download Error:", error.message);
    if (!res.headersSent) res.status(500).send("Server error.");
  }
});

const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get(/^((?!\/api).)*$/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`--- Server running at ${PORT} ---`));
