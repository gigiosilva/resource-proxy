const express = require('express');
const axios = require('axios');
const cors = require('cors');
const compression = require('compression');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');

const app = express();

app.use(cors());

app.use(compression());

app.get('/proxy-res', async (req, res) => {
  try {
    const queryString = req.originalUrl;

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

    const response = await axios.get(fullUrl, { responseType: 'stream' });

    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

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

app.get('/proxy-res-limited', async (req, res) => {
  try {
    const queryString = req.originalUrl;

    // Extract the URL parameter from the query string
    const match = queryString.match(/(?<=url=).*$/);

    if (!match) {
      res.status(400).send('Missing or invalid URL parameter');
      return;
    }

    const encodedUrl = match[0];
    const fullUrl = decodeURIComponent(encodedUrl);

    // Validate the URL
    const urlPattern = /^https?:\/\//;
    if (!urlPattern.test(fullUrl)) {
      res.status(400).send('Invalid URL');
      return;
    }

    // Fetch the headers of the resource to determine content type
    const headResponse = await axios.head(fullUrl);
    const contentType = headResponse.headers['content-type'];

    // Process based on content type
    if (contentType.startsWith('video/')) {
      // Handle video processing
      const response = await axios.get(fullUrl, { responseType: 'stream' });

      const passThrough = new PassThrough();

      // Use FFmpeg to crop the video to 5 seconds
      ffmpeg(response.data)
        .setStartTime(0)
        .setDuration(5)
        .outputOptions('-movflags frag_keyframe+empty_moov') // Enables streaming-friendly MP4
        .format('mp4')
        .on('error', (err) => {
          console.error('FFmpeg error:', err.message);
          if (!res.headersSent) {
            res.status(500).send('Error processing video');
          }
        })
        .on('end', () => {
          console.log('Video processing completed');
        })
        .pipe(passThrough);

      // Set headers for the cropped video
      res.setHeader('Content-Type', 'video/mp4');
      passThrough.pipe(res);
    } else if (contentType.startsWith('image/')) {
      // Handle image processing (no changes)
      const response = await axios.get(fullUrl, { responseType: 'stream' });

      // Set headers for the image
      res.setHeader('Content-Type', contentType);
      response.data.pipe(res).on('error', (err) => {
        console.error('Stream error:', err.message);
        if (!res.headersSent) {
          res.status(500).send('Error processing image');
        }
      });
    } else {
      res.status(400).send('Unsupported content type');
    }
  } catch (err) {
    console.error('Error:', err.message);
    if (!res.headersSent) {
      res.status(500).send('Error processing resource');
    }
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Proxy server running on port 3000');
});
