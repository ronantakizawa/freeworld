const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Set proper MIME types for different file extensions
app.use((req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript');
  } else if (req.path.endsWith('.glb')) {
    res.setHeader('Content-Type', 'model/gltf-binary');
  } else if (req.path.endsWith('.mp3')) {
    res.setHeader('Content-Type', 'audio/mpeg');
  }
  next();
});

// Route for the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'City Explorer server is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'File not found' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🌆 City Explorer server running on http://localhost:${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} in your browser`);
  console.log(`🎮 Make sure your MicroBit is connected via serial`);
});