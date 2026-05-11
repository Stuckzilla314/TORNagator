import React, { useState } from 'react';

const LoginForm = ({ onLogin }) => {
  const [key, setKey] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (key.trim().length === 16) {
      onLogin(key.trim());
    } else {
      alert('Please enter a valid 16-character TORN API key.');
    }
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#222', color: '#fff', borderRadius: '8px' }}>
      <h2>Torn Buddy Login</h2>
      <p>Enter your Private API Key to continue</p>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="16 Character API Key"
          style={{ padding: '0.5rem', width: '250px', marginBottom: '1rem', color: '#000' }}
        />
        <br />
        <button type="submit" style={{ padding: '0.5rem 2rem', cursor: 'pointer', backgroundColor: '#444', color: '#fff', border: 'none' }}>
          Access API
        </button>
      </form>
      <p style={{ fontSize: '0.8rem', marginTop: '1rem', color: '#888' }}>
        Your key is only used to fetch data and is not stored on any external server.
      </p>
    </div>
  );
};

export default LoginForm;