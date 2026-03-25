const express = require('express');
const cors = require('cors');
const path = require('path');
const youtubedl = require('youtube-dl-exec');

const app = express();
app.use(cors());
app.use(express.json());

// Common flags for performance and reliability
const COMMON_FLAGS = {
  noCheckCertificates: true,
  noWarnings: true,
  noPlaylist: true,
  addHeader: [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language: en-US,en;q=0.9'
  ]
};

app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  try {
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      ...COMMON_FLAGS
    });
    res.json({ 
      title: info.title || "Social Media Content", 
      thumbnail: info.thumbnail || "" 
    });
  } catch (error) {
    console.error("Info Error:", error.message);
    res.status(500).json({ error: "Could not fetch video info." });
  }
});

app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query;
  if (!url) return res.status(400).send("No URL provided");

  const isMp3 = type === 'mp3';
  const isReddit = url.includes('reddit.com');
  const fileName = `${encodeURIComponent(title || 'download')}.${isMp3 ? 'mp3' : 'mp4'}`;

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', isMp3 ? 'audio/mpeg' : 'video/mp4');

  try {
    /**
     * THE FIX:
     * 1. MP3: Grab best audio.
     * 2. Reddit: Reddit separates audio/video. Without FFmpeg, we MUST pick 
     * one format (b) to avoid the "Requested format not available" error.
     * 3. Others: Try to find a pre-merged MP4 first.
     */
    let formatSelector = isMp3 ? 'bestaudio/best' : 'best[ext=mp4]/best';
    if (isReddit && !isMp3) {
      formatSelector = 'b/best'; // Forces a single stream that exists
    }

    const ytProcess = youtubedl.exec(url, {
      output: '-',
      format: formatSelector,
      ...COMMON_FLAGS,
      noCheckFormats: true, // Prevents the 0B hang
      noPart: true          // Essential for streaming to stdout
    });

    // Pipe the data stream directly to the response
    ytProcess.stdout.pipe(res);

    // Error handling for the stream
    ytProcess.stderr.on('data', (data) => {
      if (data.toString().includes('ERROR')) {
        console.error("yt-dlp error:", data.toString());
      }
    });

    res.on('close', () => {
      if (ytProcess.kill) ytProcess.kill();
    });

    ytProcess.on('error', (err) => {
      console.error("Process Error:", err);
      if (!res.headersSent) res.status(500).end();
    });

  } catch (error) {
    console.error("Critical Error:", error);
    if (!res.headersSent) res.status(500).send("Download failed.");
  }
});

// Frontend setup
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

app.get(/^((?!\/api).)*$/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`--- ULCMP4 ENGINE REPAIRED & RUNNING ON ${PORT} ---`);
});
