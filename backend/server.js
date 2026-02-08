const express = require('express');
const cors = require('cors');
const path = require('path');
const { verifyNFTOwnership } = require('./verify-nft');
const { canAgentPost } = require('./queue');
const { generateImage } = require('./generate-image');
const { savePost, getAgentByApiKey, getRecentPosts, getPostsByAgent } = require('./post-art');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files (skill.md)
app.use(express.static(path.join(__dirname, 'public')));

// Serve skill file
app.get('/skill.md', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'skill.md'));
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Verify NFT and register agent
app.post('/api/verify', async (req, res) => {
  const { wallet } = req.body;

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  const result = await verifyNFTOwnership(wallet);

  if (result.success) {
    res.json(result);
  } else {
    res.status(403).json(result);
  }
});

// Check if agent can post
app.get('/api/can-post', async (req, res) => {
  const { agent_id } = req.query;

  if (!agent_id) {
    return res.status(400).json({ error: 'agent_id required' });
  }

  const result = await canAgentPost(parseInt(agent_id));
  res.json(result);
});

// Agent posts artwork
app.post('/api/post', async (req, res) => {
  const { api_key } = req.body;

  if (!api_key) {
    return res.status(400).json({ error: 'api_key required' });
  }

  try {
    const agent = await getAgentByApiKey(api_key);
    if (!agent) {
      return res.status(403).json({ error: 'Invalid API key' });
    }

    const queueStatus = await canAgentPost(agent.id);
    if (!queueStatus.can_post) {
      return res.status(429).json({
        error: 'Cannot post yet',
        queue_status: queueStatus
      });
    }

    const imageResult = await generateImage(agent.traits);
    if (!imageResult.success) {
      return res.status(500).json({ error: 'Image generation failed' });
    }

    const postResult = await savePost(
      agent.id,
      imageResult.image_url,
      imageResult.prompt
    );

    if (postResult.success) {
      res.json({
        success: true,
        post: postResult.post,
        message: 'Artwork posted successfully!'
      });
    } else {
      res.status(500).json({ error: 'Failed to save post' });
    }

  } catch (error) {
    console.error('Post error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get gallery feed (public)
app.get('/api/feed', async (req, res) => {
  try {
    const posts = await getRecentPosts(50);
    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent's posts
app.get('/api/agent/:id', async (req, res) => {
  try {
    const posts = await getPostsByAgent(parseInt(req.params.id));
    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📄 Skill file available at http://localhost:${PORT}/skill.md`);
});