const express = require('express');
const cors = require('cors');
const path = require('path');
const youtubedl = require('youtube-dl-exec');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Enhanced decoder for Instagram's obfuscated URLs
const decodeUrl = (str) => {
  if (!str) return "";
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => String.fromCharCode(parseInt(grp, 16)))
            .replace(/&amp;/g, '&')
            .replace(/\\/g, '');
};

const COMMON_FLAGS = {
  noCheckCertificates: true,
  noWarnings: true,
  noPlaylist: true,
  addHeader: [
    'User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language: en-US,en;q=0.9',
    'Sec-Fetch-Site: cross-site',
    'Sec-Fetch-Mode: navigate',
    'Sec-Fetch-Dest: document'
  ]
};

app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });
  
  try {
    let info = {};
    try {
      info = await youtubedl(url, { dumpSingleJson: true, ...COMMON_FLAGS });
    } catch (e) {
      console.log("yt-dlp metadata failed.");
    }
    
    let accurateThumbnail = info.thumbnail || "";
    const isInstagram = url.includes('instagram.com');

    if (isInstagram && (!accurateThumbnail || accurateThumbnail.includes('instagram_logo'))) {
      try {
        // Method 1: Try the __a=1 query (Instagram's internal JSON endpoint)
        const jsonUrl = `${url.split('?')[0]}?__a=1&__d=dis`;
        const response = await axios.get(jsonUrl, { 
          headers: { 'User-Agent': 'Instagram 219.0.0.12.117 Android' },
          timeout: 5000 
        });
        
        if (response.data?.graphql?.shortcode_media?.display_url) {
          accurateThumbnail = response.data.graphql.shortcode_media.display_url;
        } else {
          // Method 2: Fallback to the public OG:Image tag scraper
          const { data: html } = await axios.get(url, { headers: COMMON_FLAGS.addHeader });
          
          // Look for meta og:image which is rarely blocked
          const ogMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
          if (ogMatch) {
            accurateThumbnail = decodeUrl(ogMatch[1]);
          } else {
            // Method 3: Regex for scontent (last resort)
            const imgMatch = html.match(/"display_url":"([^"]+)"/);
            if (imgMatch) accurateThumbnail = decodeUrl(imgMatch[1]);
          }
        }
      } catch (err) {
        console.error("Scraper failed to bypass wall.");
      }
    }

    const accurateTitle = (info.description && info.description.length > 2) 
        ? info.description.split('\n')[0]
        : (info.title && info.title !== "Instagram" ? info.title : "Instagram Post");
    
    res.json({ title: accurateTitle, thumbnail: accurateThumbnail });
  } catch (error) {
    res.status(500).json({ error: "Server busy. Try again." });
  }
});

// Download route remains same...
app.get('/api/download', async (req, res) => {
  const { url, type, title } = req.query;
  const isMp3 = type === 'mp3';
  const cleanTitle = (title || 'download').replace(/[/\\?%*:|"<>]/g, '-').substring(0, 100);
  
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cleanTitle)}.${isMp3 ? 'mp3' : 'mp4'}"`);
  res.setHeader('Content-Type', isMp3 ? 'audio/mpeg' : 'video/mp4');

  try {
    const ytProcess = youtubedl.exec(url, {
      output: '-',
      format: isMp3 ? 'bestaudio/best' : 'best[ext=mp4]/b/best',
      ...COMMON_FLAGS,
      noCheckFormats: true,
      noPart: true
    });
    ytProcess.stdout.pipe(res);
    res.on('close', () => { if (ytProcess.kill) ytProcess.kill(); });
  } catch (e) { res.status(500).end(); }
});

const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get(/^((?!\/api).)*$/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server live on ${PORT}`));
