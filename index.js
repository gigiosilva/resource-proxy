const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Use CORS middleware
app.use(cors()); // Allow all origins by default

app.get('/proxy-res', async (req, res) => {
  try {
    const queryString = req.originalUrl;

    const match = queryString.match(/(?<=url=).*$/);

    if (!match) {
      return res.status(400).send('Missing or invalid URL parameter');
    }

    const encodedUrl = match[0];

    const fullUrl = decodeURIComponent(encodedUrl);

    // Validate the URL (optional but recommended)
    const urlPattern = /^https?:\/\//;
    if (!urlPattern.test(fullUrl)) {
      return res.status(400).send('Invalid URL');
    }

    // Stream the content to the client
    const response = await axios.get(fullUrl, { responseType: 'stream' });

    // Pass headers (like content-type and content-length) from the original response
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Add CORS headers explicitly for better control
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS'); // Allow specific methods

    response.data.pipe(res);
  } catch (err) {
    console.error('Error fetching resource:', err.message);
    res.status(500).send('Error fetching resource');
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Proxy server running on port 3000');
});
