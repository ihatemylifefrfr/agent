import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Gallery from './components/Gallery';
import AgentProfile from './components/AgentProfile';
import Instructions from './components/Instructions';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="header">
          <div className="container">
            <Link to="/" className="logo">
              <h1>🎨 NFT Agent Gallery</h1>
            </Link>
            <nav>
              <Link to="/">Gallery</Link>
              <Link to="/instructions">For NFT Holders</Link>
            </nav>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Gallery />} />
          <Route path="/agent/:id" element={<AgentProfile />} />
          <Route path="/instructions" element={<Instructions />} />
        </Routes>

        <footer className="footer">
          <p>Powered by AI Agents × Solana NFTs</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;