const express = require('express');
const cors = require('cors');
const path = require('path');
const { Readable } = require('stream');

const app = express();
app.use(cors());
app.use(express.json());

// List of public Cobalt instances for 2026 reliability
const COBALT_INSTANCES = [
  'https://cobalt.api.hyper.lol',
  'https://api.cobalt.tools',
  'https://cobalt-api.v-center.space'
];

/**
 * Clean URLs to prevent double protocol bugs (e.g., httphttps://)
 */
function cleanUrl(url) {
  if (!url) return "";
  let cleaned = url.trim();
  if (cleaned.startsWith('httphttps://')) {
    cleaned = cleaned.replace('httphttps://', 'https://');
  }
  return cleaned;
}

/**
 * Logic to cycle through Cobalt instances if one is down or rate-limited
 */
async function fetchViaCobalt(url, type = 'video') {
  for (const instance of COBALT_INSTANCES) {
    try {
      console.log(`Attempting download via: ${instance}`);
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
      if (data.status === 'error') {
        console.warn(`Instance ${instance} returned error: ${data.text}`);
        continue;
      }
      return data;
    } catch (err) {
      console.error(`Instance ${instance} failed to respond.`);
    }
  }
  return { status: 'error', text: 'All download services are currently busy. Please try again later.' };
}

/**
 * API Route: Get Media Info
 */
app.post('/api/info', async (req, res) => {
  try {
    let { url } = req.body;
    url = cleanUrl(url);

    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ error: "Please provide a valid URL." });
    }

    const data = await fetchViaCobalt(url);
    if (data.status === 'error') {
      return res.status(400).json({ error: data.text });
    }
    
    res.json({ 
      title: "Media Content", 
      thumbnail: "https://placehold.co/600x400?text=Link+Verified+Successfully" 
    });
  } catch (error) {
    console.error("Info Route Error:", error);
    res.status(500).json({ error: "Server encountered an error fetching info." });
  }
});

/**
 * API Route: Handle Download Streaming
 */
app.get('/api/download', async (req, res) => {
  let { url, type, title } = req.query; 
  url = cleanUrl(url);

  if (!url) return res.status(400).send("No URL provided.");

  try {
    const data = await fetchViaCobalt(url, type);
    let downloadUrl = data.url || (data.picker && data.picker[0]?.url);

    if (downloadUrl) {
      const mediaRes = await fetch(downloadUrl);
      const safeTitle = (title || "ulcmp4-download").replace(/[<>:"/\\|?*]/g, '').substring(0, 80);
      
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeTitle)}.${type === 'mp3' ? 'mp3' : 'mp4'}"`);
      res.setHeader('Content-Type', type === 'mp3' ? 'audio/mpeg' : 'video/mp4');
      
      return Readable.fromWeb(mediaRes.body).pipe(res);
    }
    
    res.status(400).send("Could not find a valid download link.");
  } catch (err) {
    console.error("Download Route Error:", err);
    res.status(500).send("Internal Server Error during download.");
  }
});

/**
 * Static File Serving & Frontend Routing
 */
const distPath = path.resolve(process.cwd(), 'dist');

// Serve actual static assets (JS, CSS, Images)
app.use(express.static(distPath));

/** * FINAL FIX FOR EXPRESS 5: 
 * Using a Regex literal to bypass the path-to-regexp parser.
 * This matches everything except routes starting with /api.
 */
app.get(/^((?!\/api).)*$/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`--- ULCMP4 SERVER LIVE ON PORT ${PORT} ---`);
});
