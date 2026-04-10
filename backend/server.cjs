const express = require('express');
const cors = require('cors');
const path = require('path');
const youtubedl = require('youtube-dl-exec');
const axios = require('axios'); // Required for the manual scraper

const app = express();
app.use(cors());
app.use(express.json());

// Helper to decode HTML entities and Unicode found in Instagram source code
const decodeUrl = (str) => {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => String.fromCharCode(parseInt(grp, 16)))
            .replace(/&amp;/g, '&');
};

const COMMON_FLAGS = {
  noCheckCertificates: true,
  noWarnings: true,
  noPlaylist: true,
  addHeader: [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language: en-US,en;q=0.9',
    'Referer: https://www.instagram.com/'
  ],
  preferFreeFormats: true,
  youtubeSkipDashManifest: true
};

app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });
  
  try {
    // 1. Try to get metadata using yt-dlp
    let info = {};
    try {
      info = await youtubedl(url, { dumpSingleJson: true, ...COMMON_FLAGS });
    } catch (e) {
      console.log("yt-dlp metadata fetch failed, using scraper fallback.");
    }
    
    const isInstagram = url.includes('instagram.com');
    let accurateThumbnail = info.thumbnail || "";

    // 2. SCRAPER FALLBACK: If it's Instagram and thumbnail is missing or is just a logo
    if (isInstagram && (!accurateThumbnail || accurateThumbnail.includes('instagram_logo'))) {
      try {
        const { data: html } = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' }
        });

        // The Regex logic for Instagram "scontent" images
        const allImgUrls = [...html.matchAll(/src="(https:\/\/[^"]*scontent[^"]*\.jpg[^"]*)"/g)].map(m =>
          decodeUrl(m[1])
        );

        const mediaImgUrls = [...new Set(allImgUrls.filter(u => u.includes("t51.82787-15") || u.includes("t51.2885")))];
        const highResImgUrls = mediaImgUrls.filter(u => !u.includes("s150x150") && !u.includes("s240x240") && !u.includes("s320x320"));

        if (highResImgUrls.length > 0) {
          accurateThumbnail = highResImgUrls[0];
        } else if (mediaImgUrls.length > 0) {
          accurateThumbnail = mediaImgUrls[0];
        }
      } catch (scrapeErr) {
        console.error("Manual scraper failed:", scrapeErr.message);
      }
    }
    
    // Title logic prioritizing description for Instagram
    let accurateTitle;
    const isReddit = url.includes('reddit.com');
    const isPinterest = url.includes('pinterest.com');
    const isBilibili = url.includes('bilibili.com');

    if (isReddit || isPinterest || isBilibili) {
      accurateTitle = info.title || info.fulltitle || "Media Content"; [cite: 4, 5]
    } else {
      accurateTitle = (info.description && info.description.length > 2) 
        ? info.description.split('\n')[0] [cite: 6, 8]
        : (info.title && info.title !== "Instagram" ? info.title : info.fulltitle || "Media File"); [cite: 6, 8]
    }
    
    res.json({ 
      title: accurateTitle, 
      thumbnail: accurateThumbnail 
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch media info." }); [cite: 10]
  }
});

app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query; [cite: 11]
  if (!url) return res.status(400).send("No URL provided"); [cite: 11]

  const isMp3 = type === 'mp3'; [cite: 11]
  const isReddit = url.includes('reddit.com'); [cite: 11]

  const cleanTitle = (title || 'download').replace(/[/\\?%*:|"<>]/g, '-').substring(0, 100); [cite: 11]
  const fileName = `${encodeURIComponent(cleanTitle)}.${isMp3 ? 'mp3' : 'mp4'}`; [cite: 11]

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`); [cite: 11]
  res.setHeader('Content-Type', isMp3 ? 'audio/mpeg' : 'video/mp4'); [cite: 11]

  try {
    let formatSelection = isMp3 ? 'bestaudio/best' : (isReddit ? 'bestvideo+bestaudio/best' : 'best[ext=mp4]/b/best'); [cite: 12]

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

    ytProcess.stdout.pipe(res); [cite: 13]
    ytProcess.on('error', (err) => {
      if (!res.headersSent) res.status(500).end(); [cite: 13]
    });
    res.on('close', () => { if (ytProcess.kill) ytProcess.kill(); }); [cite: 15]
  } catch (error) {
    if (!res.headersSent) res.status(500).send("Server error."); [cite: 16]
  }
});

const distPath = path.resolve(process.cwd(), 'dist'); [cite: 17]
app.use(express.static(distPath)); [cite: 17]
app.get(/^((?!\/api).)*$/, (req, res) => res.sendFile(path.join(distPath, 'index.html'))); [cite: 17]

const PORT = process.env.PORT || 10000; [cite: 18]
app.listen(PORT, () => console.log(`--- Server running at ${PORT} ---`)); [cite: 18]
