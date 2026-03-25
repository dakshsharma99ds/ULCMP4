const express = require('express');
const cors = require('cors');
const path = require('path');
const { Readable } = require('stream');

const app = express();
app.use(cors());
app.use(express.json());

/**
 * YOUR PRIVATE COBALT INSTANCE
 * Replace this URL with the one from your new Render Docker Service
 */
const PRIVATE_COBALT_URL = 'https://ulcmp4-api.onrender.com';

/**
 * URL Sanitizer
 * Fixes "httphttps://" or extra spaces from the frontend
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
 * Primary Fetch Logic
 * Communicates directly with your private Docker container
 */
async function fetchViaPrivateCobalt(url, type = 'video') {
  try {
    const response = await fetch(`${PRIVATE_COBALT_URL}/api/json`, {
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

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { status: 'error', text: errData.text || 'Private API Offline' };
    }

    return await response.json();
  } catch (err) {
    console.error("Private API Connection Error:", err.message);
    return { status: 'error', text: 'Could not connect to private download engine.' };
  }
}

/**
 * API Route: Get Media Info
 */
app.post('/api/info', async (req, res) => {
  try {
    let { url } = req.body;
    url = cleanUrl(url);

    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ error: "Please enter a valid link." });
    }

    const data = await fetchViaPrivateCobalt(url);
    if (data.status === 'error') {
      return res.status(400).json({ error: data.text });
    }
    
    // We send a success signal to the frontend
    res.json({ 
      title: "Media Ready", 
      thumbnail: "https://placehold.co/600x400?text=Link+Verified+Successfully" 
    });
  } catch (error) {
    res.status(500).json({ error: "Server error during info fetch." });
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
    const data = await fetchViaPrivateCobalt(url, type);
    
    // Handle both direct and gallery (picker) results
    let downloadUrl = data.url || (data.picker && data.picker[0]?.url);

    if (downloadUrl) {
      const mediaRes = await fetch(downloadUrl);
      const safeTitle = (title || "ulcmp4-download").replace(/[<>:"/\\|?*]/g, '').substring(0, 80);
      
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeTitle)}.${type === 'mp3' ? 'mp3' : 'mp4'}"`);
      res.setHeader('Content-Type', type === 'mp3' ? 'audio/mpeg' : 'video/mp4');
      
      // Stream directly from your private API to the user's browser
      return Readable.fromWeb(mediaRes.body).pipe(res);
    }
    
    res.status(400).send("Private API could not generate a link.");
  } catch (err) {
    res.status(500).send("Internal download error.");
  }
});

/**
 * Static File Serving & SPA Routing (Express 5 Compatible)
 */
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// Regex catch-all: Avoids Express 5 path-to-regexp parsing issues
app.get(/^((?!\/api).)*$/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`--- ULCMP4 PRO LIVE ON PORT ${PORT} ---`);
  console.log(`Targeting Private API: ${PRIVATE_COBALT_URL}`);
});
