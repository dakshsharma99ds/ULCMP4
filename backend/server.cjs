const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('youtube-dl-exec');

const app = express();
app.use(cors());
app.use(express.json());

// Helper to get info (Title/Thumbnail)
app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  try {
    const info = await exec(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ['User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36']
    });
    res.json({ title: info.title, thumbnail: info.thumbnail });
  } catch (error) {
    console.error("Info Error:", error);
    res.status(500).json({ error: "Failed to fetch media info." });
  }
});

// Helper to stream download
app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query;
  if (!url) return res.status(400).send("No URL provided");

  const isMp3 = type === 'mp3';
  const fileName = `${encodeURIComponent(title || 'video')}.${isMp3 ? 'mp3' : 'mp4'}`;

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', isMp3 ? 'audio/mpeg' : 'video/mp4');

  try {
    const ytProcess = exec(url, {
      output: '-',
      format: isMp3 ? 'bestaudio' : 'bestvideo[height<=1080]+bestaudio/best',
      noCheckCertificates: true,
      noWarnings: true,
    }, { stdio: ['ignore', 'pipe', 'ignore'] });

    ytProcess.stdout.pipe(res);

    res.on('close', () => {
      if (ytProcess.kill) ytProcess.kill();
    });
  } catch (error) {
    console.error("Download Error:", error);
    res.status(500).send("Download failed.");
  }
});

// Static File Serving (Express 5 Fix)
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// Regex catch-all for SPA routing
app.get(/^((?!\/api).)*$/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server restored on port ${PORT}`));
