import React, { useState } from 'react';

const LoginForm = ({ onLogin }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (key.trim().length === 16) {
      setError('');
      onLogin(key.trim());
    } else {
      setError('Please enter a valid 16-character TORN API key.');
    }
  };

  const handleKeyChange = (e) => {
    setKey(e.target.value);
    if (error) {
      setError('');
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
          onChange={handleKeyChange}
          placeholder="16 Character API Key"
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? "api-key-error" : undefined}
          style={{
            padding: '0.5rem',
            width: '250px',
            marginBottom: error ? '0.5rem' : '1rem',
            color: '#000',
            border: error ? '2px solid #ff4444' : '1px solid #ccc',
            outline: 'none'
          }}
        />
        {error && (
          <div id="api-key-error" role="alert" style={{ color: '#ff4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        <br />
        <button type="submit" style={{ padding: '0.5rem 2rem', cursor: 'pointer', backgroundColor: '#444', color: '#fff', border: 'none', borderRadius: '4px' }}>
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