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
  addHeader: [
    'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
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
    const isSnap = url.includes('snapchat.com');

    const downloadOptions = {
      output: '-',
      // 'best' is the fastest for Snap because it grabs the direct CDN link 
      // without trying to mux/combine video and audio.
      format: isMp3 ? 'bestaudio' : (isSnap ? 'best' : 'bestvideo[height<=1080]+bestaudio/best'),
      ...COMMON_FLAGS,
      // Forces yt-dlp to stop searching for extra metadata once it finds the stream
      noPlaylist: true,
      concurrentFragments: 5 
    };

    const ytProcess = youtubedl.exec(url, downloadOptions);

    ytProcess.stdout.pipe(res);

    res.on('close', () => {
      if (ytProcess.kill) ytProcess.kill();
    });
  } catch (error) {
    console.error("Download Error:", error);
    res.status(500).send("Download failed.");
  }
});

const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

app.get(/^((?!\/api).)*$/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`--- ULCMP4 SNAP-SPEED OPTIMIZED ---`));
