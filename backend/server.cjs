const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

const app = express();
app.use(cors());
app.use(express.json());

// A list of currently active public Cobalt instances (as of March 2026)
const COBALT_INSTANCES = [
  'https://cobalt.api.hyper.lol',
  'https://cobalt-api.v-center.space',
  'https://api.cobalt.tools', // Keep it as a backup
  'https://co.wuk.sh'
];

async function fetchViaCobalt(url, type = 'video') {
  for (const instance of COBALT_INSTANCES) {
    try {
      console.log(`Trying Cobalt instance: ${instance}`);
      const response = await fetch(`${instance}/api/json`, {
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

      if (!response.ok) continue;

      const data = await response.json();
      if (data.status === 'error') continue;
      
      return data;
    } catch (err) {
      console.error(`Instance ${instance} failed, moving to next...`);
    }
  }
  return { status: 'error', text: 'All Cobalt instances failed.' };
}

app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body;
    const isProblemSite = /instagram\.com|instagr\.am|x\.com|twitter\.com|facebook\.com|fb\.watch|tiktok\.com|dailymotion\.com|dai\.ly/.test(url);

    if (isProblemSite) {
      const data = await fetchViaCobalt(url);
      if (data.status === 'error') return res.status(400).json({ error: data.text });
      return res.json({ title: "Social Media Media", thumbnail: "https://placehold.co/600x400?text=Link+Ready" });
    }

    const info = await youtubedl(url, { dumpSingleJson: true, noCheckCertificates: true });
    res.json({ title: info.title, thumbnail: info.thumbnail });
  } catch (error) {
    res.status(500).json({ error: "Fetch failed." });
  }
});

app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query; 
  const isProblemSite = /instagram\.com|instagr\.am|x\.com|twitter\.com|facebook\.com|fb\.watch|tiktok\.com|dailymotion\.com|dai\.ly/.test(url);

  if (isProblemSite) {
    const data = await fetchViaCobalt(url, type);
    let downloadUrl = data.url || (data.picker && data.picker[0]?.url);

    if (downloadUrl) {
      const mediaRes = await fetch(downloadUrl);
      res.setHeader('Content-Disposition', `attachment; filename="download.${type === 'mp3' ? 'mp3' : 'mp4'}"`);
      return Readable.fromWeb(mediaRes.body).pipe(res);
    }
    return res.status(400).send("No download link found.");
  }

  // YouTube fallback
  youtubedl.exec(url, { output: '-', format: type === 'mp3' ? 'bestaudio' : 'bestvideo+bestaudio' }).stdout.pipe(res);
});

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.listen(process.env.PORT || 10000);
