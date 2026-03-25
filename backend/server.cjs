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
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language: en-US,en;q=0.9'
  ]
};

app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });
  try {
    const info = await youtubedl(url, { dumpSingleJson: true, ...COMMON_FLAGS });
    res.json({ title: info.title || "Video", thumbnail: info.thumbnail || "" });
  } catch (error) {
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
     * THE REDDIT "FORMAT NOT AVAILABLE" KILLER:
     * We use a broad fallback. If 'best' fails, we grab the first available stream.
     * The '0' at the end is a yt-dlp trick to pick the very first format in the list
     * if all other logic fails.
     */
    const formatSelection = isMp3 
      ? 'bestaudio/best' 
      : 'bestvideo+bestaudio/best[ext=mp4]/best/0'; 

    const ytProcess = youtubedl.exec(url, {
      output: '-',
      format: formatSelection,
      ...COMMON_FLAGS,
      noCheckFormats: true,
      noPart: true,
      // Helps Reddit skip the manifest checks that cause the 0B crash
      youtubeSkipDashManifest: true,
      youtubeSkipHlsManifest: true
    });

    ytProcess.stdout.pipe(res);

    // Prevent the server from crashing on ChildProcessError
    ytProcess.on('error', (err) => {
      console.error("yt-dlp Execution Error:", err.message);
      if (!res.headersSent) res.status(500).end();
    });

    ytProcess.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('ERROR')) console.error("yt-dlp Log:", msg);
    });

    res.on('close', () => {
      if (ytProcess.kill) ytProcess.kill();
    });

  } catch (error) {
    console.error("Critical Server Error:", error);
    if (!res.headersSent) res.status(500).send("Server error.");
  }
});

const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get(/^((?!\/api).)*$/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`--- ULCMP4 ENGINE STABILIZED ON ${PORT} ---`));
