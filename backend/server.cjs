const express = require('express');
const cors = require('cors');
const path = require('path');
const youtubedl = require('youtube-dl-exec');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const decodeUrl = (str) => {
  if (!str) return "";
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => String.fromCharCode(parseInt(grp, 16)))
            .replace(/&amp;/g, '&')
            .replace(/\\/g, '');
};

const COMMON_FLAGS = {
  noCheckCertificates: true,
  noWarnings: true,
  noPlaylist: true,
  addHeader: [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language: en-US,en;q=0.9',
    'Referer: https://www.instagram.com/'
  ]
};

app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });
  
  try {
    let info = {};
    try {
      info = await youtubedl(url, { dumpSingleJson: true, ...COMMON_FLAGS });
    } catch (e) {
      console.log("yt-dlp failed.");
    }
    
    let accurateThumbnail = info.thumbnail || "";
    const isInstagram = url.includes('instagram.com');

    if (isInstagram) {
      // Logic to extract the post ID (shortcode)
      // Works for /p/ABCDEFG/ or /reels/ABCDEFG/
      const match = url.match(/(?:\/p\/|\/reels\/|\/reel\/)([A-Za-z0-9_-]+)/);
      if (match && match[1]) {
        accurateThumbnail = `https://www.instagram.com/p/${match[1]}/media/?size=l`;
      }
    }

    const title = info.title && info.title !== "Instagram" ? info.title : "Instagram Media";
    res.json({ 
      title: title.split('\n')[0], 
      thumbnail: accurateThumbnail 
    });
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query;
  const isMp3 = type === 'mp3';
  const cleanTitle = (title || 'download').replace(/[/\\?%*:|"<>]/g, '-').substring(0, 100);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cleanTitle)}.${isMp3 ? 'mp3' : 'mp4'}"`);
  try {
    const ytProcess = youtubedl.exec(url, {
      output: '-',
      format: isMp3 ? 'bestaudio/best' : 'best[ext=mp4]/b/best',
      ...COMMON_FLAGS,
      noCheckFormats: true,
      noPart: true
    });
    ytProcess.stdout.pipe(res);
    res.on('close', () => { if (ytProcess.kill) ytProcess.kill(); });
  } catch (e) { res.status(500).end(); }
});

const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get(/^((?!\/api).)*$/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server live on ${PORT}`));
