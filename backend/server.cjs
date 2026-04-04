const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const axios = require('axios'); // Install this: npm install axios

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIG ---
const RAPID_API_KEY = 'YOUR_RAPID_API_KEY_HERE'; // Get a free key from RapidAPI

app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  
  try {
    // TRY 1: Your original method (yt-dlp)
    console.log("Attempting local extraction...");
    const info = await youtubedl(url, { 
        dumpSingleJson: true, 
        noCheckCertificates: true,
        addHeader: ['User-Agent: Mozilla/5.0', 'Referer: https://www.instagram.com/'] 
    });
    
    return res.json({ 
        title: info.title || "Instagram Reel", 
        thumbnail: info.thumbnail || "",
        downloadUrl: null // Use local stream
    });

  } catch (error) {
    console.log("Local extraction failed. Triggering External Bridge...");
    
    // TRY 2: External Bridge (Like iGram)
    try {
      const options = {
        method: 'GET',
        url: 'https://instagram-downloader-v16.p.rapidapi.com/api/v1/urltoinfo',
        params: { url: url },
        headers: {
          'X-RapidAPI-Key': RAPID_API_KEY,
          'X-RapidAPI-Host': 'instagram-downloader-v16.p.rapidapi.com'
        }
      };

      const response = await axios.request(options);
      const data = response.data.data;

      // This returns the direct MP4 link from their high-speed servers
      return res.json({
        title: "Instagram Reel (High Speed)",
        thumbnail: data.thumbnail,
        externalUrl: data.video_url // We pass this back to the frontend
      });

    } catch (apiErr) {
      res.status(500).json({ error: "All extraction methods failed." });
    }
  }
});
