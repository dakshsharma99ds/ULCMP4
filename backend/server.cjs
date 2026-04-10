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
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language: en-US,en;q=0.9',
    'Sec-Fetch-Mode: navigate',
    'Referer: https://www.instagram.com/'
  ],
  preferFreeFormats: true,
  youtubeSkipDashManifest: true
};

app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });
  
  try {
    const info = await youtubedl(url, { 
      dumpSingleJson: true, 
      ...COMMON_FLAGS 
    });
    
    const isInstagram = url.includes('instagram.com');
    const isReddit = url.includes('reddit.com');
    const isSnapchat = url.includes('snapchat.com');
    const isPinterest = url.includes('pinterest.com') || url.includes('pin.it');
    
    // Title logic
    let accurateTitle = "Media Content";
    if (info.description && info.description.length > 2) {
      accurateTitle = info.description.split('\n')[0];
    } else {
      accurateTitle = info.title || info.fulltitle || "Media File";
    }

    // THUMBNAIL SCAVENGER LOGIC
    let accurateThumbnail = "";
    
    // 1. Check primary thumbnail field
    if (info.thumbnail) {
      accurateThumbnail = info.thumbnail;
    } 
    // 2. Check thumbnails array (often used for Instagram posts)
    else if (info.thumbnails && info.thumbnails.length > 0) {
      accurateThumbnail = info.thumbnails[info.thumbnails.length - 1].url;
    } 
    // 3. Check for display_url (fallback for some extractors)
    else if (info.display_url) {
      accurateThumbnail = info.display_url;
    }

    res.json({ 
      title: accurateTitle, 
      thumbnail: accurateThumbnail 
    });
    
  } catch (error) {
    console.error("Backend Error:", error.message);
    res.status(500).json({ error: "Could not fetch media info. The link might be private or blocked." });
  }
});

app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query;
  if (!url) return res.status(400).send("No URL provided");

  const isMp3 = type === 'mp3';
  const isReddit = url.includes('reddit.com');

  const cleanTitle = (title || 'download').replace(/[/\\?%*:|"<>]/g, '-').substring(0, 100);
  const fileName = `${encodeURIComponent(cleanTitle)}.${isMp3 ? 'mp3' : 'mp4'}`;

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', isMp3 ? 'audio/mpeg' : 'video/mp4');

  try {
    let formatSelection = isMp3 ? 'bestaudio/best' : (isReddit ? 'bestvideo+bestaudio/best' : 'best[ext=mp4]/b/best');

    const ytProcess = youtubedl.exec(url, {
      output: '-',
      format: formatSelection,
      ...COMMON_FLAGS,
      noCheckFormats: true,
      noPart: true,
      noMtime: true
    });

    ytProcess.stdout.pipe(res);

    ytProcess.on('error', (err) => {
      console.error("Download Error:", err.message);
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
app.listen(PORT, () => console.log(`--- Server running at ${PORT} ---`));
