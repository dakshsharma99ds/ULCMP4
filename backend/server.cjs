const express = require('express');
const cors = require('cors');
const path = require('path');
const youtubedl = require('youtube-dl-exec');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Helper to decode Replit's regex matches
const decodeHtmlEntities = (str) => {
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
  ]
};

app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  try {
    // Attempt to get info from yt-dlp
    let info = {};
    try {
      info = await youtubedl(url, { dumpSingleJson: true, ...COMMON_FLAGS });
    } catch (e) {
      console.log("yt-dlp metadata failed, moving to scraper.");
    }

    let accurateTitle = info.title || info.fulltitle || "Instagram Post";
    let accurateThumbnail = "";

    // 1. Check yt-dlp standard fields
    if (info.thumbnail) accurateThumbnail = info.thumbnail;
    else if (info.thumbnails && info.thumbnails.length > 0) {
      accurateThumbnail = info.thumbnails[info.thumbnails.length - 1].url;
    }

    // 2. FALLBACK: Replit Scraper Logic (If yt-dlp didn't find the image)
    if (url.includes('instagram.com') && !accurateThumbnail) {
      try {
        const { data: html } = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' }
        });

        // Use the Regex block you provided
        const allImgUrls = [...html.matchAll(/src="(https:\/\/[^"]*scontent[^"]*\.jpg[^"]*)"/g)].map(m =>
          decodeHtmlEntities(m[1])
        );

        const mediaImgUrls = [...new Set(allImgUrls.filter(u => u.includes("t51.82787-15") || u.includes("t51.2885")))];
        const highResImgUrls = mediaImgUrls.filter(u => !u.includes("s150x150") && !u.includes("s240x240") && !u.includes("s320x320"));

        accurateThumbnail = highResImgUrls.length > 0 ? highResImgUrls[0] : (mediaImgUrls[0] || "");

        // 3. Last Resort: OpenGraph Tag Scraper
        if (!accurateThumbnail) {
          const ogMatch = html.match(/<meta property="og:image" content="([^"]*)"/);
          if (ogMatch) accurateThumbnail = decodeHtmlEntities(ogMatch[1]);
        }
      } catch (scrapeErr) {
        console.error("Scraper failed:", scrapeErr.message);
      }
    }

    res.json({ title: accurateTitle, thumbnail: accurateThumbnail });

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch media info." });
  }
});

app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query;
  const isMp3 = type === 'mp3';
  const cleanTitle = (title || 'download').replace(/[/\\?%*:|"<>]/g, '-').substring(0, 100);
  const fileName = `${encodeURIComponent(cleanTitle)}.${isMp3 ? 'mp3' : 'mp4'}`;

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', isMp3 ? 'audio/mpeg' : 'video/mp4');

  try {
    const formatSelection = isMp3 ? 'bestaudio/best' : 'best[ext=mp4]/b/best';
    const ytProcess = youtubedl.exec(url, {
      output: '-',
      format: formatSelection,
      ...COMMON_FLAGS,
      noCheckFormats: true,
      noPart: true
    });

    ytProcess.stdout.pipe(res);
    res.on('close', () => { if (ytProcess.kill) ytProcess.kill(); });
  } catch (error) {
    if (!res.headersSent) res.status(500).send("Server error.");
  }
});

const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get(/^((?!\/api).)*$/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`--- Server running at ${PORT} ---`));
