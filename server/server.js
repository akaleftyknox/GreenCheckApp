const express = require('express');
const cors = require('cors');
// Import your existing API handlers
const processImage = require('./api/processImage').default;
const analyzeIngredients = require('./api/analyzeIngredients');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Convert your Vercel API routes to Express routes
app.post('/api/processImage', async (req, res) => {
  try {
    await processImage(req, res);
  } catch (error) {
    console.error('Process Image Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/analyzeIngredients', async (req, res) => {
  try {
    await analyzeIngredients(req, res);
  } catch (error) {
    console.error('Analyze Ingredients Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});