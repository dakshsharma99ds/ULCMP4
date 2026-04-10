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
    
    const isReddit = url.includes('reddit.com');
    const isSnapchat = url.includes('snapchat.com');
    const isPinterest = url.includes('pinterest.com') || url.includes('pin.it');
    const isTumblrDirect = url.includes('va.media.tumblr.com');
    const isBilibili = url.includes('bilibili.com') || url.includes('b23.tv');
    const isInstagram = url.includes('instagram.com');
    
    let accurateTitle;
    if (isTumblrDirect) {
      accurateTitle = "Tumblr video";
    } else if (isReddit || isPinterest || isBilibili) {
      accurateTitle = info.title || info.fulltitle || "Media Content";
    } else if (isSnapchat) {
      accurateTitle = (info.description && info.description.length > 2) 
        ? info.description.split('\n')[0] 
        : (info.title && !info.title.includes("Snapchat") ? info.title : info.fulltitle || "Snapchat Content");
    } else {
      accurateTitle = (info.description && info.description.length > 2) 
        ? info.description.split('\n')[0] 
        : (info.title && info.title !== "Instagram" ? info.title : info.fulltitle || "Media File");
    }
    
    // (FIXED AREA) Instagram Thumbnail Scavenger Logic
    let accurateThumbnail = "";
    if (isInstagram) {
      // 1. Check primary field
      if (info.thumbnail) {
        accurateThumbnail = info.thumbnail;
      } 
      // 2. Check thumbnails array (This is where /p/ posts store the high-res image)
      else if (info.thumbnails && info.thumbnails.length > 0) {
        accurateThumbnail = info.thumbnails[info.thumbnails.length - 1].url;
      } 
      // 3. Fallback to display_url or image
      else {
        accurateThumbnail = info.display_url || info.image || "";
      }
    } else {
      accurateThumbnail = info.thumbnail || "";
    }

    res.json({ 
      title: accurateTitle, 
      thumbnail: accurateThumbnail 
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch media info." });
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
    let formatSelection;
    if (isMp3) {
      formatSelection = 'bestaudio/best';
    } else if (isReddit) {
      formatSelection = 'bestvideo+bestaudio/best';
    } else {
      formatSelection = 'best[ext=mp4]/b/best';
    }

    const ytProcess = youtubedl.exec(url, {
      output: '-',
      format: formatSelection,
      ...COMMON_FLAGS,
      noCheckFormats: true,
      noPart: true,
      extractorRetries: 1,
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
    if (!res.headersSent) res.status(500).send("Server error.");
  }
});

const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get(/^((?!\/api).)*$/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`--- Server running at ${PORT} ---`));
