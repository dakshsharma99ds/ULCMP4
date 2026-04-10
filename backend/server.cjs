const express = require('express');
const cors = require('cors');
const path = require('path');
const youtubedl = require('youtube-dl-exec');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Helper to decode HTML entities and Unicode in scraped Instagram URLs
const decodeUrl = (str) => {
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
  ],
  preferFreeFormats: true,
  youtubeSkipDashManifest: true
};

app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });
  
  try {
    let info = {};
    try {
      info = await youtubedl(url, { 
        dumpSingleJson: true, 
        ...COMMON_FLAGS 
      });
    } catch (e) {
      console.log("yt-dlp info failed, relying on embed scraper.");
    }
    
    const isInstagram = url.includes('instagram.com');
    let accurateThumbnail = info.thumbnail || "";

    // START: Instagram Thumbnail Fix (Embed Bypass + Scraper)
    if (isInstagram && (!accurateThumbnail || accurateThumbnail.includes('instagram_logo'))) {
      try {
        // Step A: Convert to Embed URL to bypass login wall
        const baseUrl = url.split('?')[0].replace(/\/+$/, '');
        const embedUrl = `${baseUrl}/embed/`;
        
        const { data: html } = await axios.get(embedUrl, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          timeout: 5000
        });

        // Step B: Look for 'thumbnail_url' in the embed JSON metadata first
        const jsonMatch = html.match(/"thumbnail_url":"([^"]+)"/);
        if (jsonMatch) {
          accurateThumbnail = decodeUrl(jsonMatch[1]);
        } else {
          // Step C: Fallback to your Regex scraper logic
          const allImgUrls = [...html.matchAll(/src="(https:\/\/[^"]*scontent[^"]*\.jpg[^"]*)"/g)].map(m =>
            decodeUrl(m[1])
          );
          const mediaImgUrls = [...new Set(allImgUrls.filter(u => u.includes("t51.2885") || u.includes("t51.12461") || u.includes("scontent")))];
          if (mediaImgUrls.length > 0) {
            accurateThumbnail = mediaImgUrls[0];
          }
        }
      } catch (scrapeErr) {
        console.error("Instagram embed scraper failed:", scrapeErr.message);
      }
    }
    // END: Instagram Thumbnail Fix

    let accurateTitle;
    const isReddit = url.includes('reddit.com');
    const isPinterest = url.includes('pinterest.com') || url.includes('pin.it');

    if (isReddit || isPinterest) {
      accurateTitle = info.title || info.fulltitle || "Media Content";
    } else {
      accurateTitle = (info.description && info.description.length > 2) 
        ? info.description.split('\n')[0]
        : (info.title && info.title !== "Instagram" ? info.title : info.fulltitle || "Media File");
    }
    
    res.json({ 
      title: accurateTitle, 
      thumbnail: accurateThumbnail 
    });
  } catch (error) {
    console.error("Main API Error:", error.message);
    res.status(500).json({ error: "Failed to fetch media info." });
  }
});

app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query;
  if (!url) return res.status(400).send("No URL provided");

  const isMp3 = type === 'mp3';
  const cleanTitle = (title || 'download').replace(/[/\\?%*:|"<>]/g, '-').substring(0, 100);
  const fileName = `${encodeURIComponent(cleanTitle)}.${isMp3 ? 'mp3' : 'mp4'}`;

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', isMp3 ? 'audio/mpeg' : 'video/mp4');

  try {
    let formatSelection = isMp3 ? 'bestaudio/best' : (url.includes('reddit.com') ? 'bestvideo+bestaudio/best' : 'best[ext=mp4]/b/best');

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
      if (!res.headersSent) res.status(500).end();
    });
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
