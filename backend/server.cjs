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

function cleanUrl(url) {
  if (!url) return "";
  let cleaned = url.trim();
  if (cleaned.startsWith('httphttps://')) cleaned = cleaned.replace('httphttps://', 'https://');
  return cleaned;
}

async function fetchViaCobalt(url, type = 'video') {
  try {
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
    const data = await response.json();
    console.log("Cobalt Response Status:", data.status);
    return data;
  } catch (err) {
    console.error("Cobalt Fetch Fatal Error:", err);
    return { status: 'error', text: 'Network error' };
  }
}

app.post('/api/info', async (req, res) => {
  try {
    let { url } = req.body;
    url = cleanUrl(url);

    const isProblemSite = /instagram\.com|instagr\.am|x\.com|twitter\.com|facebook\.com|fb\.watch|tiktok\.com|dailymotion\.com|dai\.ly/.test(url);

    if (isProblemSite) {
      const data = await fetchViaCobalt(url);
      
      // Handle the "tunnel" or "redirect" statuses from Cobalt
      if (data.status === 'error') return res.status(400).json({ error: data.text });
      
      return res.json({ 
        title: "Social Media Media", 
        thumbnail: data.url || "https://placehold.co/600x400?text=Link+Detected" 
      });
    }

    const info = await youtubedl(url, { dumpSingleJson: true, noCheckCertificates: true, userAgent: MOBILE_USER_AGENT });
    res.json({ title: info.title, thumbnail: info.thumbnail });
  } catch (error) {
    res.status(500).json({ error: "Fetch failed." });
  }
});

app.get('/api/download', async (req, res) => {
  let { url, type, title } = req.query; 
  url = cleanUrl(url);

  const isProblemSite = /instagram\.com|instagr\.am|x\.com|twitter\.com|facebook\.com|fb\.watch|tiktok\.com|dailymotion\.com|dai\.ly/.test(url);

  if (isProblemSite) {
    try {
      const data = await fetchViaCobalt(url, type);
      
      // Find the download URL based on Cobalt's varied response structure
      let downloadUrl = data.url;
      if (data.status === 'picker' && data.picker && data.picker.length > 0) {
        downloadUrl = data.picker[0].url; // Take the first item if it's a gallery/reel
      }

      if (downloadUrl) {
        const mediaRes = await fetch(downloadUrl);
        const safeTitle = (title || "download").replace(/[<>:"/\\|?*]/g, '').substring(0, 100);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeTitle)}.${type === 'mp3' ? 'mp3' : 'mp4'}"`);
        res.setHeader('Content-Type', type === 'mp3' ? 'audio/mpeg' : 'video/mp4');
        return Readable.fromWeb(mediaRes.body).pipe(res);
      }
      return res.status(400).send("No download URL found in Cobalt response.");
    } catch (err) { 
      return res.status(500).send("Bypass failed.");
    }
  }

  // YouTube Standard Path
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

app.listen(process.env.PORT || 10000, () => console.log("Server running..."));
