const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors())

app.get('/proxy-res', async (req, res) => {
  try {
    const queryString = req.originalUrl;

    // Extract the URL parameter from the query string
    const match = queryString.match(/(?<=url=).*$/);

    if (!match) {
      return res.status(400).send('Missing or invalid URL parameter');
    }

    const encodedUrl = match[0];
    const fullUrl = decodeURIComponent(encodedUrl);

    const urlPattern = /^https?:\/\//;
    if (!urlPattern.test(fullUrl)) {
      return res.status(400).send('Invalid URL');
    }

    // Make the request and stream the response to the client
    const response = await axios.get(fullUrl, { responseType: 'stream' });

    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    // Pipe the streamed data from the source to the client
    response.data.pipe(res);
  } catch (err) {
    console.error('Error fetching resource:', err.message);
    if (err.response) {
      res.status(err.response.status).send(err.response.data);
    } else {
      res.status(500).send('Error fetching resource');
    }
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Proxy server running on port 3000');
});
