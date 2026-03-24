const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream'); // Required for streaming Cobalt to the client

const app = express();
app.use(cors());
app.use(express.json());

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const MOBILE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

// API: Fetch video info
app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body;
    const isDailymotion = url.includes('dailymotion.com') || url.includes('dai.ly');

    // DAILYMOTION FIX: Use official oEmbed API to bypass bot blocks for info
    if (isDailymotion) {
      const oembedUrl = `https://www.dailymotion.com/services/oembed?url=${encodeURIComponent(url)}`;
      const oembedRes = await fetch(oembedUrl);
      const oembedData = await oembedRes.json();
      return res.json({ title: oembedData.title, thumbnail: oembedData.thumbnail_url });
    }

    // Standard yt-dlp info fetch for YouTube, Instagram, etc.
    const info = await youtubedl(url, { 
      dumpSingleJson: true, 
      noCheckCertificates: true,
      noWarnings: true,
      userAgent: MOBILE_USER_AGENT,
    });
    res.json({ title: info.title, thumbnail: info.thumbnail });
  } catch (error) {
    console.error("Info Fetch Error:", error);
    res.status(500).json({ error: "Could not fetch info" });
  }
});

// API: Handle download
app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query; 
  const safeTitle = (title || "download").replace(/[<>:"/\\|?*]/g, '').substring(0, 100);
  const finalFileName = type === 'mp3' ? `MP3-${safeTitle}.mp3` : `1080p-${safeTitle}.mp4`;
  
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFileName)}"`);
  res.setHeader('Content-Type', type === 'mp3' ? 'audio/mpeg' : 'video/mp4');

  const isDailymotion = url.includes('dailymotion.com') || url.includes('dai.ly');

  // DAILYMOTION FIX: Route download through Cobalt API to bypass Render IP block
  if (isDailymotion) {
    try {
      const cobaltBody = { url: url };
      if (type === 'mp3') {
        cobaltBody.isAudioOnly = true;
        cobaltBody.aFormat = 'mp3';
      } else {
        cobaltBody.vQuality = '1080';
      }

      const cobaltRes = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT
        },
        body: JSON.stringify(cobaltBody)
      });
      
      const cobaltData = await cobaltRes.json();
      
      if (cobaltData && cobaltData.url) {
        // Stream the Cobalt media URL directly to the user via Node 20's Readable.fromWeb
        const mediaRes = await fetch(cobaltData.url);
        return Readable.fromWeb(mediaRes.body).pipe(res);
      } else {
        throw new Error("Cobalt API did not return a valid stream URL.");
      }
    } catch (cobaltError) {
      console.error("Routing Error:", cobaltError);
      if (!res.headersSent) return res.status(500).send("Download failed via routing.");
      return;
    }
  }

  // STANDARD YT-DLP FOR EVERYTHING ELSE
  let ytProcess;
  const isSocial = /instagram\.com|facebook\.com|tiktok\.com/.test(url);

  const commonOptions = {
    output: '-',
    noCheckCertificates: true,
    userAgent: MOBILE_USER_AGENT
  };

  if (type === 'mp3') {
    ytProcess = youtubedl.exec(url, {
      ...commonOptions,
      format: 'bestaudio/best',
      extractAudio: true,
      audioFormat: 'mp3',
    });
  } else if (isSocial) {
    ytProcess = youtubedl.exec(url, {
      ...commonOptions,
      format: 'b', 
    });
  } else {
    ytProcess = youtubedl.exec(url, {
      ...commonOptions,
      format: 'bestvideo[height<=1080]+bestaudio/best',
    });
  }

  ytProcess.stdout.pipe(res);

  res.on('close', () => {
    if (ytProcess && ytProcess.kill) ytProcess.kill('SIGINT');
  });

  ytProcess.on('error', (err) => {
    console.error("Download Process Error:", err);
    if (!res.headersSent) res.status(500).send("Download failed");
  });
});

// --- SERVE STATIC FRONTEND FILES ---
const distPath = path.join(__dirname, '..', 'dist');
const fallbackDistPath = path.join(__dirname, 'dist');
const finalDist = fs.existsSync(distPath) ? distPath : fallbackDistPath;

app.use(express.static(finalDist));

app.get(/^(?!\/api).+/, (req, res) => {
  const indexPath = path.join(finalDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Frontend not found.");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
