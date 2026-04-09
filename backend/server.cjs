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
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept-Language: en-US,en;q=0.9',
    'Sec-Fetch-Mode: navigate'
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
    
    // Check platform
    const isReddit = url.includes('reddit.com');
    
    /* CHANGE: Added logic to prioritize Title for Reddit, while keeping Description-fallback for Instagram.
       For Reddit, we use info.title. For others (Instagram), we use the caption from info.description.
    */
    let accurateTitle;
    if (isReddit) {
      accurateTitle = info.title || info.fulltitle || "Reddit Video";
    } else {
      // Instagram/Others logic: use description (caption) if it exists, otherwise title
      accurateTitle = (info.description && info.description.length > 2) 
        ? info.description.split('\n')[0] 
        : (info.title && info.title !== "Instagram" ? info.title : info.fulltitle || "Media File");
    }
    
    res.json({ 
      title: accurateTitle, 
      thumbnail: info.thumbnail || "" 
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

    ytProcess.stderr.on('data', (data) => {
      console.log(`yt-dlp Log: ${data.toString()}`);
    });

    res.on('close', () => {
      if (ytProcess.kill) ytProcess.kill();
    });

  } catch (error) {
    console.error("Critical Error:", error.message);
    if (!res.headersSent) res.status(500).send("Server error.");
  }
});

const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get(/^((?!\/api).)*$/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`--- Server running at ${PORT} ---`));
