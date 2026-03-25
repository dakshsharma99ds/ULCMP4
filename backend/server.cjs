const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

const app = express();
app.use(cors());
app.use(express.json());

// List of public Cobalt instances to ensure high availability
const COBALT_INSTANCES = [
  'https://cobalt.api.hyper.lol',
  'https://api.cobalt.tools',
  'https://cobalt-api.v-center.space'
];

async function fetchViaCobalt(url, type = 'video') {
  for (const instance of COBALT_INSTANCES) {
    try {
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
      console.error(`Instance ${instance} failed, trying next...`);
    }
  }
  return { status: 'error', text: 'All download services are currently busy.' };
}

app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const data = await fetchViaCobalt(url);
    if (data.status === 'error') return res.status(400).json({ error: data.text });
    
    res.json({ 
      title: "Media Content", 
      thumbnail: "https://placehold.co/600x400?text=Link+Ready" 
    });
  } catch (error) {
    res.status(500).json({ error: "Fetch failed." });
  }
});

app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query; 
  if (!url) return res.status(400).send("No URL provided");

  try {
    const data = await fetchViaCobalt(url, type);
    let downloadUrl = data.url || (data.picker && data.picker[0]?.url);

    if (downloadUrl) {
      const mediaRes = await fetch(downloadUrl);
      const safeTitle = (title || "download").replace(/[<>:"/\\|?*]/g, '').substring(0, 80);
      
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeTitle)}.${type === 'mp3' ? 'mp3' : 'mp4'}"`);
      res.setHeader('Content-Type', type === 'mp3' ? 'audio/mpeg' : 'video/mp4');
      
      return Readable.fromWeb(mediaRes.body).pipe(res);
    }
    res.status(400).send("No download link found.");
  } catch (err) {
    console.error("Download Error:", err);
    res.status(500).send("Server Error");
  }
});

// Serve frontend
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`ULCMP4 Server running on port ${PORT}`));
