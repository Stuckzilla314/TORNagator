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
        <label htmlFor="api_key" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', margin: '-1px', padding: '0', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: '0' }}>
          TORN API Key
        </label>
        <input
          id="api_key"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="16 Character API Key"
          required
          style={{ padding: '0.5rem', width: '250px', marginBottom: '1rem', color: '#000' }}
        />
        <br />
        <button type="submit" style={{ padding: '0.5rem 2rem', cursor: 'pointer', backgroundColor: '#444', color: '#fff', border: 'none' }}>
          Access API
        </button>
      </form>
      <p style={{ fontSize: '0.78rem', marginTop: '1.5rem', color: '#aaa', maxWidth: '300px', margin: '1.5rem auto 0 auto', lineHeight: '1.4' }}>
        <strong>Torn API ToS Compliance:</strong> This application runs entirely locally on your system. Your API key and data are saved only in your local storage and are never shared or transmitted to any external server.
      </p>
    </div>
  );
};

export default LoginForm;