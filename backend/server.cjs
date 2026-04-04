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

// CRITICAL: This strips the tracking junk that breaks the conversion
const sanitizeUrl = (url) => {
  try {
    const u = new URL(url);
    if (u.hostname.includes('instagram.com')) {
      return `${u.origin}${u.pathname}`; // Keeps only the /reel/ID/ part
    }
    return url;
  } catch (e) {
    return url;
  }
};

app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });
  
  const cleanUrl = sanitizeUrl(url);
  console.log(`Processing Info for: ${cleanUrl}`);

  try {
    const info = await youtubedl(cleanUrl, { dumpSingleJson: true, ...COMMON_FLAGS });
    res.json({ 
      title: info.title || info.description?.slice(0, 50) || "Instagram Media", 
      thumbnail: info.thumbnail || "",
      uploader: info.uploader || ""
    });
  } catch (error) {
    console.error("Scraper Error:", error.message);
    res.status(500).json({ error: "Failed to extract media info." });
  }
});

app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query;
  if (!url) return res.status(400).send("No URL provided");

  const cleanUrl = sanitizeUrl(url);
  const isMp3 = type === 'mp3';
  const fileName = `${encodeURIComponent(title || 'download')}.${isMp3 ? 'mp3' : 'mp4'}`;

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', isMp3 ? 'audio/mpeg' : 'video/mp4');

  try {
    const ytProcess = youtubedl.exec(cleanUrl, {
      output: '-',
      format: isMp3 ? 'bestaudio' : 'best[ext=mp4]/best',
      ...COMMON_FLAGS,
      noPart: true,
      noMtime: true
    });

    ytProcess.stdout.pipe(res);
    ytProcess.on('error', () => !res.headersSent && res.status(500).end());
    res.on('close', () => ytProcess.kill && ytProcess.kill());
  } catch (error) {
    if (!res.headersSent) res.status(500).send("Server error.");
  }
});

const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get(/^((?!\/api).)*$/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`--- Server ready on port ${PORT} ---`));
