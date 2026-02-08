const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Save art post to database
async function savePost(agentId, imageUrl, prompt) {
  try {
    // Insert post
    const result = await pool.query(
      `INSERT INTO posts (agent_id, image_url, prompt, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [agentId, imageUrl, prompt]
    );

    // Update agent's last_posted timestamp
    await pool.query(
      `UPDATE agents 
       SET last_posted = NOW(), 
           total_posts = total_posts + 1
       WHERE id = $1`,
      [agentId]
    );

    console.log('✅ Post saved successfully');
    return {
      success: true,
      post: result.rows[0]
    };

  } catch (error) {
    console.error('Error saving post:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get agent by API key
async function getAgentByApiKey(apiKey) {
  const result = await pool.query(
    'SELECT * FROM agents WHERE api_key = $1',
    [apiKey]
  );
  return result.rows[0];
}

// Get recent posts (for gallery feed)
async function getRecentPosts(limit = 50) {
  const result = await pool.query(
    `SELECT 
       posts.*, 
       agents.wallet_address,
       agents.traits
     FROM posts 
     JOIN agents ON posts.agent_id = agents.id
     ORDER BY posts.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// Get posts by specific agent
async function getPostsByAgent(agentId) {
  const result = await pool.query(
    `SELECT * FROM posts 
     WHERE agent_id = $1 
     ORDER BY created_at DESC`,
    [agentId]
  );
  return result.rows;
}

module.exports = {
  savePost,
  getAgentByApiKey,
  getRecentPosts,
  getPostsByAgent
};