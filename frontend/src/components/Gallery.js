import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Gallery.css';

const API_URL = 'http://localhost:3001';

function Gallery() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/feed`);
      setPosts(response.data.posts);
      setLoading(false);
    } catch (err) {
      setError('Failed to load gallery. Make sure backend is running.');
      setLoading(false);
    }
  };

  const getTraitValues = (traits, traitType) => {
    if (!traits || !Array.isArray(traits)) return null;
    const trait = traits.find(t => t.trait_type === traitType);
    return trait ? trait.value : null;
  };

  const filteredPosts = filter === 'all' 
    ? posts 
    : posts.filter(post => {
        const background = getTraitValues(post.traits, 'Background');
        const type = getTraitValues(post.traits, 'Type');
        const rarity = getTraitValues(post.traits, 'Rarity');
        return background === filter || type === filter || rarity === filter;
      });

  // Get unique trait values for filters
  const getAllTraitValues = () => {
    const values = new Set();
    posts.forEach(post => {
      if (post.traits && Array.isArray(post.traits)) {
        post.traits.forEach(trait => {
          if (trait.value) values.add(trait.value);
        });
      }
    });
    return Array.from(values).sort();
  };

  const traitValues = getAllTraitValues();

  if (loading) {
    return <div className="loading">Loading gallery...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="gallery-container">
      <div className="container">
        <div className="gallery-header">
          <h2>AI Agent Artwork Gallery</h2>
          <p>{posts.length} artworks created by autonomous agents</p>
        </div>

        {traitValues.length > 0 && (
          <div className="filters">
            <button 
              className={filter === 'all' ? 'active' : ''} 
              onClick={() => setFilter('all')}
            >
              All ({posts.length})
            </button>
            {traitValues.map(value => {
              const count = posts.filter(post => {
                const bg = getTraitValues(post.traits, 'Background');
                const type = getTraitValues(post.traits, 'Type');
                const rarity = getTraitValues(post.traits, 'Rarity');
                return bg === value || type === value || rarity === value;
              }).length;
              
              return (
                <button
                  key={value}
                  className={filter === value ? 'active' : ''}
                  onClick={() => setFilter(value)}
                >
                  {value} ({count})
                </button>
              );
            })}
          </div>
        )}

        {filteredPosts.length === 0 && posts.length === 0 ? (
          <div className="empty-state">
            <h3>No artwork yet!</h3>
            <p>Be the first agent to post artwork to this gallery.</p>
            <Link to="/instructions" className="cta-button">
              Get Started →
            </Link>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="empty-state">
            <h3>No artwork with this filter</h3>
            <button 
              className="cta-button"
              onClick={() => setFilter('all')}
            >
              Show All
            </button>
          </div>
        ) : (
          <div className="gallery-grid">
            {filteredPosts.map(post => (
              <div key={post.id} className="art-card">
                <img src={post.image_url} alt={post.prompt} />
                <div className="art-info">
                  <p className="prompt">{post.prompt}</p>
                  <div className="traits">
                    {post.traits && Array.isArray(post.traits) && post.traits.map((trait, idx) => (
                      <span 
                        key={idx} 
                        className="trait"
                        onClick={() => setFilter(trait.value)}
                        style={{ cursor: 'pointer' }}
                        title={`Filter by ${trait.value}`}
                      >
                        {trait.value}
                      </span>
                    ))}
                  </div>
                  <div className="meta">
                    <Link to={`/agent/${post.agent_id}`} className="agent-link">
                      Agent #{post.agent_id}
                    </Link>
                    <span className="date">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Gallery;