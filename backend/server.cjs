const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const { spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body;
    const info = await youtubedl(url, { dumpSingleJson: true, noCheckCertificates: true });
    res.json({ title: info.title, thumbnail: info.thumbnail });
  } catch (error) {
    res.status(500).json({ error: "Could not fetch info" });
  }
});

app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query; 
  const safeTitle = (title || "download").replace(/[<>:"/\\|?*]/g, '').substring(0, 100);
  const finalFileName = type === 'mp3' ? `MP3-${safeTitle}.mp3` : `1080p-${safeTitle}.mp4`;
  
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFileName)}"`);
  res.setHeader('Content-Type', type === 'mp3' ? 'audio/mpeg' : 'video/mp4');

  console.log(`--- Processing: ${safeTitle} ---`);

  let ytProcess;
  let ffmpegProcess;

  // Use simple streaming for Facebook/Instagram/Tumblr to avoid the format crash
  const isSocial = url.includes('facebook.com') || url.includes('instagram.com') || url.includes('tumblr.com');

  if (type === 'mp3') {
    ytProcess = youtubedl.exec(url, {
      output: '-',
      format: 'bestaudio/best',
      extractAudio: true,
      audioFormat: 'mp3',
      noCheckCertificates: true,
    });
    ytProcess.stdout.pipe(res);
  } else if (isSocial) {
    // DIRECT STREAM for Facebook: avoids the SIGTERM/Format error
    ytProcess = youtubedl.exec(url, {
      output: '-',
      format: 'best', // Let FB decide the best single file
      noCheckCertificates: true,
    });
    ytProcess.stdout.pipe(res);
  } else {
    // COMPLEX STREAM for YouTube/Others (1080p)
    ffmpegProcess = spawn('ffmpeg', [
      '-i', 'pipe:0',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k',
      '-f', 'mp4', '-movflags', 'frag_keyframe+empty_moov+faststart',
      'pipe:1'
    ]);

    ytProcess = youtubedl.exec(url, {
      output: '-',
      format: 'bestvideo[height<=1080]+bestaudio/best',
      noCheckCertificates: true,
    });

    ytProcess.stdout.pipe(ffmpegProcess.stdin);
    ffmpegProcess.stdout.pipe(res);
    ffmpegProcess.stdin.on('error', () => {});
  }

  req.on('close', () => {
    if (ytProcess) ytProcess.kill();
    if (ffmpegProcess) ffmpegProcess.kill();
  });

  if (ytProcess) {
    ytProcess.on('error', (err) => console.error("YT-DL Error:", err.message));
  }
});

app.listen(5000, () => console.log(`Server running at http://localhost:5000`));