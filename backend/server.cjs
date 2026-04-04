const express = require('express');
const cors = require('cors');
const path = require('path');
const youtubedl = require('youtube-dl-exec');

const app = express();
app.use(cors());
app.use(express.json());

// These headers are the "Secret Sauce" to bypass the Instagram block
const COMMON_FLAGS = {
  noCheckCertificates: true,
  noWarnings: true,
  noPlaylist: true,
  addHeader: [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language: en-US,en;q=0.9',
    'Referer: https://www.instagram.com/',
    'Origin: https://www.instagram.com'
  ]
};

app.post('/api/info', async (req, res) => {
  let { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  // CLEAN THE URL: Strips the ?utm_source and other junk that triggers blocks
  try {
    const clean = new URL(url);
    if (clean.hostname.includes('instagram.com')) {
      url = clean.origin + clean.pathname;
    }
  } catch (e) {}

  try {
    // We use --no-check-formats to speed up the response and avoid metadata blocks
    const info = await youtubedl(url, { 
      dumpSingleJson: true, 
      ...COMMON_FLAGS,
      noCheckFormats: true 
    });

    res.json({ 
      title: info.title || info.description?.slice(0, 40) || "Instagram Reel", 
      thumbnail: info.thumbnail || "" 
    });
  } catch (error) {
    console.error("Scraper Error:", error.message);
    res.status(500).json({ error: "Failed to fetch media info." });
  }
});

app.get('/api/download', async (req, res) => {
  let { url, type, title } = req.query;
  if (!url) return res.status(400).send("No URL provided");

  const isMp3 = type === 'mp3';
  const fileName = `${encodeURIComponent(title || 'download')}.${isMp3 ? 'mp3' : 'mp4'}`;

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', isMp3 ? 'audio/mpeg' : 'video/mp4');

  try {
    const ytProcess = youtubedl.exec(url, {
      output: '-',
      format: isMp3 ? 'bestaudio/best' : 'best[ext=mp4]/best',
      ...COMMON_FLAGS,
      noPart: true,
      noMtime: true,
      // Forces yt-dlp to try harder to find the raw video stream
      extractorArgs: 'instagram:get_video_info' 
    });

    ytProcess.stdout.pipe(res);
    ytProcess.on('error', () => !res.headersSent && res.status(500).end());
    res.on('close', () => { if (ytProcess.kill) ytProcess.kill(); });
  } catch (error) {
    if (!res.headersSent) res.status(500).send("Server error.");
  }
});

const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get(/^((?!\/api).)*$/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`--- Server ready on port ${PORT} ---`));
