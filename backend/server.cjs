const express = require('express');
const cors = require('cors');
const path = require('path');
const youtubedl = require('youtube-dl-exec');

const app = express();
app.use(cors());
app.use(express.json());

// Helper for shared flags to keep code clean
const COMMON_FLAGS = {
  noCheckCertificates: true,
  noWarnings: true,
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
      title: info.title || "Social Media Video", 
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
  const extension = isMp3 ? 'mp3' : 'mp4';
  const fileName = `${encodeURIComponent(title || 'download')}.${extension}`;

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', isMp3 ? 'audio/mpeg' : 'video/mp4');

  try {
    /**
     * THE FORMAT LOGIC:
     * best[ext=mp4]: Finds a single file with Video+Audio (Perfect for Facebook/LinkedIn).
     * /: The slash acts as a "fallback".
     * best: If no combined MP4 exists, grab the best single stream (Necessary for Reddit).
     */
    const formatSelection = isMp3 
      ? 'bestaudio/best' 
      : 'best[ext=mp4]/best'; 

    const ytProcess = youtubedl.exec(url, {
      output: '-',
      format: formatSelection,
      ...COMMON_FLAGS
    });

    // Pipe the data stream to the browser
    ytProcess.stdout.pipe(res);

    // Capture logs to help debug in Render console
    ytProcess.stderr.on('data', (data) => {
      const log = data.toString();
      if (log.includes('ERROR')) console.error(`yt-dlp Error: ${log}`);
    });

    // If user closes tab/cancels, kill the process to save Render CPU
    res.on('close', () => {
      if (ytProcess.kill) ytProcess.kill();
    });

    // Handle process exit errors
    ytProcess.on('error', (err) => {
      console.error("Process Error:", err);
      if (!res.headersSent) res.status(500).send("Stream error occurred.");
    });

  } catch (error) {
    console.error("Download Request Error:", error.message);
    if (!res.headersSent) res.status(500).send("Download failed.");
  }
});

// Serve Frontend
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get(/^((?!\/api).)*$/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`--- ULCMP4 ENGINE LIVE ON PORT ${PORT} ---`);
});
