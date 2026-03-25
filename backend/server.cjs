const express = require('express');
const cors = require('cors');
const path = require('path');
const youtubedl = require('youtube-dl-exec');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  try {
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
    });
    res.json({ title: info.title, thumbnail: info.thumbnail });
  } catch (error) {
    console.error("Info Fetch Error:", error);
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
     * THE FIX: 
     * For Facebook (and others), 'best' ensures we get a single file with both A/V.
     * Using 'bestvideo+bestaudio' with stdout ('-') fails because it can't merge 
     * without a local temporary file and FFmpeg.
     */
    const formatSelection = isMp3 
      ? 'bestaudio/best' 
      : 'best[ext=mp4]/best'; // Force best single MP4 file or highest available combined stream

    const ytProcess = youtubedl.exec(url, {
      output: '-',
      format: formatSelection,
      noCheckCertificates: true,
      noWarnings: true,
    });

    ytProcess.stdout.pipe(res);

    // If the user cancels the download, kill the yt-dlp process immediately
    res.on('close', () => {
      if (ytProcess.kill) ytProcess.kill();
    });

    // Optional: Log errors from yt-dlp to your Render console
    ytProcess.stderr.on('data', (data) => console.log(`yt-dlp: ${data}`));

  } catch (error) {
    console.error("Download Error:", error);
    if (!res.headersSent) res.status(500).send("Download failed.");
  }
});

const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get(/^((?!\/api).)*$/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server restored and running on port ${PORT}`));
