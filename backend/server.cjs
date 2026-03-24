const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

console.log("--- VERIFIED: RUNNING COBALT V10 SYSTEM ---");

const app = express();
app.use(cors());
app.use(express.json());

const MOBILE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

// Clean URLs to prevent the "httphttps://" bug
function cleanUrl(url) {
  if (!url) return "";
  let cleaned = url.trim();
  if (cleaned.startsWith('httphttps://')) {
    cleaned = cleaned.replace('httphttps://', 'https://');
  }
  return cleaned;
}

async function fetchViaCobalt(url, type = 'video') {
  const response = await fetch('https://api.cobalt.tools/api/json', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: url,
      downloadMode: type === 'mp3' ? 'audio' : 'video',
      videoQuality: '1080',
    })
  });
  return await response.json();
}

app.post('/api/info', async (req, res) => {
  try {
    let { url } = req.body;
    url = cleanUrl(url);

    if (!url || !url.startsWith('http')) return res.status(400).json({ error: "Invalid URL" });

    // Added dailymotion and dai.ly to the bypass list
    const isProblemSite = /instagram\.com|instagr\.am|x\.com|twitter\.com|facebook\.com|fb\.watch|tiktok\.com|dailymotion\.com|dai\.ly/.test(url);

    if (isProblemSite) {
      console.log("Using Cobalt Bypass for Info:", url);
      const data = await fetchViaCobalt(url);
      
      if (data.status === 'error') {
         return res.status(400).json({ error: "Cobalt error: " + data.text });
      }
      
      return res.json({ 
        title: "Social Media Content", 
        thumbnail: "https://placehold.co/600x400?text=Ready+to+Download" 
      });
    }

    const info = await youtubedl(url, { dumpSingleJson: true, noCheckCertificates: true, userAgent: MOBILE_USER_AGENT });
    res.json({ title: info.title, thumbnail: info.thumbnail });
  } catch (error) {
    console.error("Info Fetch Error:", error.message);
    res.status(500).json({ error: "Server error fetching content info." });
  }
});

app.get('/api/download', async (req, res) => {
  let { url, type, title } = req.query; 
  url = cleanUrl(url);

  if (!url) return res.status(400).send("No URL");

  const safeTitle = (title || "download").replace(/[<>:"/\\|?*]/g, '').substring(0, 100);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeTitle)}.${type === 'mp3' ? 'mp3' : 'mp4'}"`);

  const isProblemSite = /instagram\.com|instagr\.am|x\.com|twitter\.com|facebook\.com|fb\.watch|tiktok\.com|dailymotion\.com|dai\.ly/.test(url);

  if (isProblemSite) {
    try {
      console.log("Using Cobalt Bypass for Download:", url);
      const data = await fetchViaCobalt(url, type);
      if (data.url) {
        const mediaRes = await fetch(data.url);
        return Readable.fromWeb(mediaRes.body).pipe(res);
      }
    } catch (err) { 
      console.error("Bypass Error:", err); 
      return res.status(500).send("Download bypass failed.");
    }
  }

  const options = { output: '-', noCheckCertificates: true, userAgent: MOBILE_USER_AGENT };
  const ytProcess = type === 'mp3' 
    ? youtubedl.exec(url, { ...options, format: 'bestaudio/best', extractAudio: true, audioFormat: 'mp3' })
    : youtubedl.exec(url, { ...options, format: 'bestvideo[height<=1080]+bestaudio/best' });

  ytProcess.stdout.pipe(res);
  res.on('close', () => { if (ytProcess?.kill) ytProcess.kill('SIGINT'); });
});

const distPath = path.join(__dirname, '..', 'dist');
const finalDist = fs.existsSync(distPath) ? distPath : path.join(__dirname, 'dist');
app.use(express.static(finalDist));
app.get(/^(?!\/api).+/, (req, res) => res.sendFile(path.join(finalDist, 'index.html')));

app.listen(process.env.PORT || 10000, () => console.log("Server active on 10000"));
