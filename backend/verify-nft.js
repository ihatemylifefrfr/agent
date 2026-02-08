const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Generate random API key
function generateApiKey() {
  return 'agent_' + Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Verify NFT ownership using Helius API directly
async function verifyNFTOwnership(walletAddress) {
  try {
    console.log('Checking wallet:', walletAddress);

    // Call Helius API directly
    const response = await axios.post(
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
      {
        jsonrpc: '2.0',
        id: 'verify-nft',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: walletAddress,
          page: 1,
          limit: 1000
        }
      }
    );

    const assets = response.data.result.items;
    console.log(`Found ${assets.length} NFTs`);

    // Find NFT from your collection
    const nft = assets.find(asset => {
      const collection = asset.grouping?.find(g => g.group_key === 'collection');
      return collection && collection.group_value === process.env.COLLECTION_ADDRESS;
    });

    if (!nft) {
      return {
        success: false,
        error: 'No NFT from this collection found'
      };
    }

    console.log('✅ Found NFT:', nft.content.metadata.name);

    // Extract traits
    const traits = nft.content.metadata.attributes || [];
    const mintAddress = nft.id;

    // Check if agent already registered
    const existing = await pool.query(
      'SELECT * FROM agents WHERE wallet_address = $1',
      [walletAddress]
    );

    let agent;
    if (existing.rows.length > 0) {
      // Already registered
      agent = existing.rows[0];
      console.log('Agent already registered');
    } else {
      // Register new agent
      const apiKey = generateApiKey();
      const result = await pool.query(
        `INSERT INTO agents (wallet_address, mint_address, traits, api_key)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [walletAddress, mintAddress, JSON.stringify(traits), apiKey]
      );
      agent = result.rows[0];
      console.log('✅ New agent registered!');
    }

    return {
      success: true,
      agent_id: agent.id,
      api_key: agent.api_key,
      traits: agent.traits,
      nft_name: nft.content.metadata.name
    };

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { verifyNFTOwnership };