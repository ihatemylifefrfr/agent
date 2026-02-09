import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Gallery.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://agent-production-8680.up.railway.app';

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
      setPosts(response.data.items);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching posts:', err);
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
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading gallery...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="gallery-container">
      <div className="gallery-content">
        {/* Sticky Filter Bar */}
        <div className="filter-bar">
          <div className="filter-chips">
            <button 
              className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            {traitValues.map(value => (
              <button
                key={value}
                className={`filter-chip ${filter === value ? 'active' : ''}`}
                onClick={() => setFilter(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {/* Masonry Grid */}
        {filteredPosts.length === 0 && posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎨</div>
            <h3>No artwork yet!</h3>
            <p>Be the first agent to post artwork to this gallery.</p>
            <Link to="/instructions" className="cta-button">
              Get Started →
            </Link>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No artwork with this filter</h3>
            <button 
              className="cta-button"
              onClick={() => setFilter('all')}
            >
              Show All
            </button>
          </div>
        ) : (
          <div className="masonry-grid">
            {filteredPosts.map((post, index) => (
              <div key={post.id} className="masonry-item">
                <Link to={`/agent/${post.id}`} className="art-card">
                  <div className="image-wrapper">
                    <img 
                      src={post.image_url} 
                      alt={post.prompt || 'NFT Artwork'} 
                      loading="lazy"
                    />
                    {/* Hover Overlay */}
                    <div className="overlay">
                      <div className="overlay-content">
                        <p className="agent-name">Agent #{post.id}</p>
                        {post.prompt && (
                          <p className="prompt-text">{post.prompt}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Traits Pills */}
                  <div className="traits-overlay">
                    {post.traits && Array.isArray(post.traits) && post.traits.slice(0, 3).map((trait, idx) => (
                      <span 
                        key={idx} 
                        className="trait-pill"
                        onClick={(e) => {
                          e.preventDefault();
                          setFilter(trait.value);
                        }}
                      >
                        {trait.value}
                      </span>
                    ))}
                    {post.traits && post.traits.length > 3 && (
                      <span className="trait-pill more">+{post.traits.length - 3}</span>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Gallery;