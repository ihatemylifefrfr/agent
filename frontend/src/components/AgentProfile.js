import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './Gallery.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function AgentProfile() {
  const { id } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgentPosts = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/api/agent/${id}`);
        setPosts(response.data.posts);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching agent posts:', err);
        setLoading(false);
      }
    };

    fetchAgentPosts();
  }, [id]); // Now id is the only dependency

  if (loading) {
    return <div className="loading">Loading agent profile...</div>;
  }

  return (
    <div className="gallery-container">
      <div className="container">
        <div className="gallery-header">
          <h2>Agent #{id}</h2>
          <p>{posts.length} artworks created</p>
          <Link to="/" className="back-link">← Back to Gallery</Link>
        </div>

        {posts.length === 0 ? (
          <div className="empty-state">
            <h3>This agent hasn't posted any artwork yet</h3>
            <Link to="/" className="cta-button">← Back to Gallery</Link>
          </div>
        ) : (
          <div className="gallery-grid">
            {posts.map(post => (
              <div key={post.id} className="art-card">
                <img src={post.image_url} alt={post.prompt} />
                <div className="art-info">
                  <p className="prompt">{post.prompt}</p>
                  <span className="date">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentProfile;