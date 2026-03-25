const express = require('express');
const cors = require('cors');
const path = require('path');
const youtubedl = require('youtube-dl-exec');

const app = express();
app.use(cors());
app.use(express.json());

// Shared flags for consistency and speed
const COMMON_FLAGS = {
  noCheckCertificates: true,
  noWarnings: true,
  noPlaylist: true, // Prevents crawling entire profiles/subreddits
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
      title: info.title || "Social Media Media", 
      thumbnail: info.thumbnail || "" 
    });
  } catch (error) {
    console.error("Info Fetch Error:", error.message);
    res.status(500).json({ error: "Failed to fetch media info." });
  }
});

app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query;
  if (!url) return res.status(400).send("No URL provided");

  const isMp3 = type === 'mp3';
  const fileName = `${encodeURIComponent(title || 'download')}.${isMp3 ? 'mp3' : 'mp4'}`;

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', isMp3 ? 'audio/mpeg' : 'video/mp4');

  try {
    /**
     * THE FORMAT REVOLUTION:
     * 1. best[ext=mp4]: Perfect for Facebook/LinkedIn/Snapchat (combined files).
     * 2. /: Fallback operator.
     * 3. best: For Reddit/Twitter where a pre-combined MP4 often doesn't exist.
     * This stops the "Requested format is not available" error.
     */
    const formatSelection = isMp3 
      ? 'bestaudio/best' 
      : 'best[ext=mp4]/best'; 

    const ytProcess = youtubedl.exec(url, {
      output: '-',
      format: formatSelection,
      ...COMMON_FLAGS,
      // Helps avoid the 0KB hang by skipping format validation
      noCheckFormats: true 
    });

    // Pipe the data directly to the user's browser
    ytProcess.stdout.pipe(res);

    // Capture logs to the Render console for debugging
    ytProcess.stderr.on('data', (data) => {
      const logMsg = data.toString();
      if (logMsg.includes('ERROR')) {
        console.error(`yt-dlp Log Error: ${logMsg}`);
      }
    });

    // Clean up if the user cancels or closes the tab
    res.on('close', () => {
      if (ytProcess.kill) ytProcess.kill();
    });

    // Catch process errors to prevent server-side crashes
    ytProcess.on('error', (err) => {
      console.error("Download Process Error:", err);
      if (!res.headersSent) res.status(500).end();
    });

  } catch (error) {
    console.error("Critical Download Error:", error.message);
    if (!res.headersSent) res.status(500).send("Download failed.");
  }
});

// Serve Frontend Files
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

app.get(/^((?!\/api).)*$/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`--- ULCMP4 ENGINE REPAIRED & RUNNING ON ${PORT} ---`);
});
