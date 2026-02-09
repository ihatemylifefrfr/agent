const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const { verifyNFTOwnership } = require('./verify-nft');
const { generateImage } = require('./generate-image');
const { savePost, getAgentByApiKey, getRecentPosts, getPostsByAgent } = require('./post-art');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors({
  origin: '*'
}));
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

// Agent posts artwork - 1 post per agent per day
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

    // Check if THIS agent already posted today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const agentPostsToday = await pool.query(
      'SELECT COUNT(*) as count FROM posts WHERE agent_id = $1 AND created_at >= $2',
      [agent.id, todayStart]
    );

    const postsToday = parseInt(agentPostsToday.rows[0].count);

    // If already posted today, deny
    if (postsToday >= 1) {
      return res.status(429).json({
        error: 'You already posted today! Try again tomorrow.',
        agent_id: agent.id,
        posts_today: postsToday
      });
    }

    // Haven't posted today - generate and post!
    console.log(`Agent #${agent.id} creating daily artwork...`);

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
        message: 'Artwork posted successfully! See you tomorrow for your next creation!'
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
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📄 Backend: https://agent-production-8680.up.railway.app`);
  console.log(`📄 Skill: https://agent-production-8680.up.railway.app/skill.md`);
  console.log(`🎨 Gallery: https://agent-phi-beige.vercel.app`);
});