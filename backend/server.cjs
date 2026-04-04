const express = require('express');
const cors = require('cors');
const path = require('path');
const youtubedl = require('youtube-dl-exec');

const app = express();
app.use(cors());
app.use(express.json());

// Path to your cookie file
const COOKIE_PATH = path.join(__dirname, 'cookies.txt');

const COMMON_FLAGS = {
  noCheckCertificates: true,
  noWarnings: true,
  noPlaylist: true,
  // This flag uses your saved login session to bypass "Login Walls" 
  cookiefile: COOKIE_PATH, 
  addHeader: [
    // Matches a standard browser to keep the cookies stealthy 
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language: en-US,en;q=0.9',
    'Referer: https://www.instagram.com/'
  ]
};

app.post('/api/info', async (req, res) => {
  let { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  // Clean the URL to remove tracking parameters that can cause blocks
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('instagram.com')) {
      url = urlObj.origin + urlObj.pathname;
    }
  } catch (e) {}

  try {
    const info = await youtubedl(url, { 
      dumpSingleJson: true, 
      ...COMMON_FLAGS,
      noCheckFormats: true 
    });

    res.json({ 
      title: info.title || "Instagram Media", 
      thumbnail: info.thumbnail || "" 
    });
  } catch (error) {
    console.error("Scraper Error:", error.message);
    res.status(500).json({ error: "Failed to fetch media info." });
  }
});

app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query;
  if (!url) return res.status(400).send("No URL provided");

  const isMp3 = type === 'mp3';
  const isReddit = url.includes('reddit.com');
  const fileName = `${encodeURIComponent(title || 'download')}.${isMp3 ? 'mp3' : 'mp4'}`;

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', isMp3 ? 'audio/mpeg' : 'video/mp4');

  try {
    let formatSelection = isMp3 ? 'bestaudio/best' : (isReddit ? 'bestvideo+bestaudio/best' : 'best[ext=mp4]/b/best');

    const ytProcess = youtubedl.exec(url, {
      output: '-',
      format: formatSelection,
      ...COMMON_FLAGS,
      noPart: true,
      noMtime: true,
      // Helps prioritize the video extraction logic for Instagram
      extractorArgs: 'instagram:get_video_info'
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
    if (!res.headersSent) res.status(500).send("Server error.");
  }
});

const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get(/^((?!\/api).)*$/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`--- Server ready with cookie support on port ${PORT} ---`));
