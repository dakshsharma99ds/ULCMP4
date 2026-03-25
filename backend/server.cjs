const express = require('express');
const cors = require('cors');
const path = require('path');
const youtubedl = require('youtube-dl-exec');
const axios = require('axios'); // We'll use this for Dailymotion bypass

const app = express();
app.use(cors());
app.use(express.json());

const COMMON_FLAGS = {
  noCheckCertificates: true,
  noWarnings: true,
  addHeader: [
    'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  ]
};

// Get info for the preview
app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  // SPECIAL BYPASS FOR DAILYMOTION
  if (url.includes('dailymotion.com') || url.includes('dai.ly')) {
    try {
      const response = await axios.get(url, { headers: { 'User-Agent': COMMON_FLAGS.addHeader[0].split(':')[1] } });
      const html = response.data;
      // Simple regex to grab title and thumbnail from meta tags
      const title = html.match(/<meta property="og:title" content="(.*?)"/)?.[1] || "Dailymotion Video";
      const thumbnail = html.match(/<meta property="og:image" content="(.*?)"/)?.[1] || "";
      return res.json({ title, thumbnail });
    } catch (err) {
      console.error("Dailymotion Manual Fetch Error:", err.message);
      // Fallback to yt-dlp if manual fetch fails
    }
  }

  try {
    const info = await youtubedl(url, { dumpSingleJson: true, ...COMMON_FLAGS });
    res.json({ title: info.title, thumbnail: info.thumbnail });
  } catch (error) {
    console.error("Info Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch media info." });
  }
});

// Handle the actual download stream
app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query;
  if (!url) return res.status(400).send("No URL provided");

  const isMp3 = type === 'mp3';
  const fileName = `${encodeURIComponent(title || 'download')}.${isMp3 ? 'mp3' : 'mp4'}`;

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', isMp3 ? 'audio/mpeg' : 'video/mp4');

  try {
    // For Dailymotion downloads, we force it to ignore the cookies/impersonation 
    // and just grab the best available stream
    const ytProcess = youtubedl.exec(url, {
      output: '-',
      format: isMp3 ? 'bestaudio' : 'bestvideo+bestaudio/best',
      ...COMMON_FLAGS
    });

    ytProcess.stdout.pipe(res);
    res.on('close', () => { if (ytProcess.kill) ytProcess.kill(); });
  } catch (error) {
    console.error("Download Error:", error);
    res.status(500).send("Download failed.");
  }
});

/**
 * Static File Serving & SPA Routing
 */
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get(/^((?!\/api).)*$/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server restored and running on port ${PORT}`));
