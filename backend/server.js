const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { generateImage, createPromptFromTraits } = require('./generate-image');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// CORS Configuration
app.use(cors({
  origin: [
    'https://agent-phi-beige.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running!' });
});

// 🔥 Gallery/Feed endpoint - Fetch NFTs from database
app.get('/api/feed', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.id,
        a.wallet_address,
        a.mint_address,
        a.traits,
        a.created_at,
        p.image_url,
        p.prompt,
        p.created_at as post_date
      FROM agents a
      LEFT JOIN posts p ON a.id = p.agent_id
      ORDER BY p.created_at DESC NULLS LAST, a.created_at DESC
      LIMIT 50
    `);

    const items = result.rows.map(row => ({
      id: row.id,
      name: `Agent #${row.id}`,
      wallet_address: row.wallet_address,
      mint_address: row.mint_address,
      image_url: row.image_url || 'https://via.placeholder.com/512?text=No+Image',
      prompt: row.prompt,
      traits: row.traits,
      created_at: row.created_at,
      post_date: row.post_date
    }));

    res.json({ 
      success: true,
      items: items
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      items: []
    });
  }
});

// Get single NFT/Agent by ID
app.get('/api/agent/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        a.*,
        COALESCE(json_agg(
          json_build_object(
            'id', p.id,
            'image_url', p.image_url,
            'prompt', p.prompt,
            'created_at', p.created_at
          ) ORDER BY p.created_at DESC
        ) FILTER (WHERE p.id IS NOT NULL), '[]') as posts
      FROM agents a
      LEFT JOIN posts p ON a.id = p.agent_id
      WHERE a.id = $1
      GROUP BY a.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Agent not found' 
      });
    }

    res.json({ 
      success: true,
      agent: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// 🆕 POST endpoint - Create artwork post with API key
app.post('/api/post', async (req, res) => {
  try {
    const { api_key, traits } = req.body;

    console.log('📥 Received post request:', { api_key: api_key?.substring(0, 10) + '...', traits });

    if (!api_key) {
      return res.status(400).json({ 
        success: false,
        error: 'API key is required' 
      });
    }

    // Verify agent exists and get agent_id
    const agentResult = await pool.query(
      'SELECT id, traits FROM agents WHERE api_key = $1',
      [api_key]
    );

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Invalid API key. Agent not found.' 
      });
    }

    const agent = agentResult.rows[0];
    const agentTraits = traits || agent.traits;

    console.log('✅ Agent found:', agent.id);
    console.log('🎨 Generating image with traits:', agentTraits);

    // Generate image using the traits
    const imageResult = await generateImage(agentTraits);

    if (!imageResult.success) {
      console.error('❌ Image generation failed:', imageResult.error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to generate image: ' + imageResult.error 
      });
    }

    console.log('✅ Image generated:', imageResult.image_url);

    // Save post to database
    const postResult = await pool.query(
      `INSERT INTO posts (agent_id, image_url, prompt)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [agent.id, imageResult.image_url, imageResult.prompt]
    );

    // Update agent stats
    await pool.query(
      `UPDATE agents 
       SET last_posted = NOW(), total_posts = total_posts + 1
       WHERE id = $1`,
      [agent.id]
    );

    console.log('✅ Post saved to database:', postResult.rows[0].id);

    res.json({ 
      success: true,
      post: postResult.rows[0],
      image_url: imageResult.image_url,
      prompt: imageResult.prompt,
      message: 'Artwork posted successfully!'
    });

  } catch (error) {
    console.error('❌ Error creating post:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Generate NFT artwork endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const { traits, agentId } = req.body;
    
    if (!traits) {
      return res.status(400).json({ 
        success: false,
        error: 'Traits are required' 
      });
    }

    const result = await generateImage(traits);

    // If agentId provided, save the post to database
    if (agentId && result.success) {
      await pool.query(`
        INSERT INTO posts (agent_id, image_url, prompt)
        VALUES ($1, $2, $3)
      `, [agentId, result.image_url, result.prompt]);

      await pool.query(`
        UPDATE agents 
        SET last_posted = NOW(), total_posts = total_posts + 1
        WHERE id = $1
      `, [agentId]);
    }

    res.json(result);
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Create new agent/NFT
app.post('/api/agent', async (req, res) => {
  try {
    const { wallet_address, mint_address, traits, api_key } = req.body;

    const result = await pool.query(`
      INSERT INTO agents (wallet_address, mint_address, traits, api_key)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [wallet_address, mint_address, JSON.stringify(traits), api_key]);

    res.json({ 
      success: true,
      agent: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});