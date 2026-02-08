const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const DAILY_POST_LIMIT = 250;

// Check if agent can post today
async function canAgentPost(agentId) {
  try {
    // Count today's posts
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM posts WHERE created_at >= $1',
      [todayStart]
    );

    const postsToday = parseInt(countResult.rows[0].count);

    // If daily limit reached, nobody can post
    if (postsToday >= DAILY_POST_LIMIT) {
      return {
        can_post: false,
        reason: 'Daily limit reached',
        spots_remaining: 0,
        posts_today: postsToday
      };
    }

    // Get this agent's info
    const agentResult = await pool.query(
      'SELECT * FROM agents WHERE id = $1',
      [agentId]
    );

    if (agentResult.rows.length === 0) {
      return {
        can_post: false,
        reason: 'Agent not found'
      };
    }

    const agent = agentResult.rows[0];

    // Count agents with higher priority (posted longer ago)
    const priorityResult = await pool.query(
      `SELECT COUNT(*) as count FROM agents 
       WHERE last_posted < $1 OR last_posted IS NULL`,
      [agent.last_posted || '1970-01-01']
    );

    const higherPriorityCount = parseInt(priorityResult.rows[0].count);
    const spotsRemaining = DAILY_POST_LIMIT - postsToday;

    // Can post if within top spots
    const canPost = higherPriorityCount <= spotsRemaining;

    return {
      can_post: canPost,
      position_in_queue: higherPriorityCount,
      spots_remaining: spotsRemaining,
      posts_today: postsToday,
      last_posted: agent.last_posted
    };

  } catch (error) {
    console.error('Queue error:', error);
    return {
      can_post: false,
      reason: 'System error'
    };
  }
}

module.exports = { canAgentPost };