const express = require('express');
const cors = require('cors');
const path = require('path');
const youtubedl = require('youtube-dl-exec');
const axios = require('axios'); // Now active via your package.json [cite: 1]

const app = express();
app.use(cors()); [cite: 2]
app.use(express.json()); [cite: 2]

// Helper to decode HTML entities and Unicode in scraped Instagram URLs
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
  const { url } = req.body; [cite: 3]
  if (!url) return res.status(400).json({ error: "No URL provided" }); [cite: 3]
  
  try {
    // 1. Attempt to get info from yt-dlp [cite: 3]
    let info = {};
    try {
      info = await youtubedl(url, { 
        dumpSingleJson: true, 
        ...COMMON_FLAGS 
      });
    } catch (e) {
      console.log("yt-dlp info failed, relying on scraper fallback.");
    }
    
    const isInstagram = url.includes('instagram.com');
    let accurateThumbnail = info.thumbnail || ""; [cite: 9]

    // 2. SCRAPER FALLBACK: If Instagram thumbnail is missing or generic [cite: 1, 9]
    if (isInstagram && (!accurateThumbnail || accurateThumbnail.includes('instagram_logo'))) {
      try {
        const { data: html } = await axios.get(url, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        });

        // Use regex to find high-res scontent image URLs
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
    
    // 3. Title Logic [cite: 4, 5, 6, 7, 8]
    let accurateTitle;
    const isReddit = url.includes('reddit.com');
    const isPinterest = url.includes('pinterest.com') || url.includes('pin.it');
    const isBilibili = url.includes('bilibili.com') || url.includes('b23.tv');

    if (isReddit || isPinterest || isBilibili) {
      accurateTitle = info.title || info.fulltitle || "Media Content"; [cite: 4, 5]
    } else {
      accurateTitle = (info.description && info.description.length > 2) 
        ? info.description.split('\n')[0] [cite: 8]
        : (info.title && info.title !== "Instagram" ? info.title : info.fulltitle || "Media File"); [cite: 8]
    }
    
    res.json({ 
      title: accurateTitle, 
      thumbnail: accurateThumbnail 
    });
  } catch (error) { [cite: 10]
    res.status(500).json({ error: "Failed to fetch media info." }); [cite: 10]
  }
});

app.get('/api/download', async (req, res) => { [cite: 11]
  const { url, type, title } = req.query; [cite: 11]
  if (!url) return res.status(400).send("No URL provided"); [cite: 11]

  const isMp3 = type === 'mp3'; [cite: 11]
  const cleanTitle = (title || 'download').replace(/[/\\?%*:|"<>]/g, '-').substring(0, 100); [cite: 11]
  const fileName = `${encodeURIComponent(cleanTitle)}.${isMp3 ? 'mp3' : 'mp4'}`; [cite: 11]

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`); [cite: 11]
  res.setHeader('Content-Type', isMp3 ? 'audio/mpeg' : 'video/mp4'); [cite: 11]

  try {
    let formatSelection = isMp3 ? 'bestaudio/best' : (url.includes('reddit.com') ? 'bestvideo+bestaudio/best' : 'best[ext=mp4]/b/best'); [cite: 12]

    const ytProcess = youtubedl.exec(url, {
      output: '-',
      format: formatSelection,
      ...COMMON_FLAGS,
      noCheckFormats: true,
      noPart: true,
      noMtime: true,
      youtubeSkipDashManifest: true 
    });

    ytProcess.stdout.pipe(res); [cite: 13]
    ytProcess.on('error', (err) => { [cite: 13]
      if (!res.headersSent) res.status(500).end(); [cite: 13]
    });
    res.on('close', () => { if (ytProcess.kill) ytProcess.kill(); }); [cite: 15]
  } catch (error) { [cite: 16]
    if (!res.headersSent) res.status(500).send("Server error."); [cite: 16]
  }
});

const distPath = path.resolve(process.cwd(), 'dist'); [cite: 17]
app.use(express.static(distPath)); [cite: 17]
app.get(/^((?!\/api).)*$/, (req, res) => res.sendFile(path.join(distPath, 'index.html'))); [cite: 17]

const PORT = process.env.PORT || 10000; [cite: 18]
app.listen(PORT, () => console.log(`--- Server running at ${PORT} ---`)); [cite: 18]
