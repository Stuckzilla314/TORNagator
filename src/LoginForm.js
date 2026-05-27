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

  const isKeyValid = key.trim().length === 16;

  return (
    <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#222', color: '#fff', borderRadius: '8px' }}>
      <h2>Torn Buddy Login</h2>
      <p>Enter your Private API Key to continue</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="apiKey" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>API Key</label>
        <input
          id="apiKey"
          type="password"
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            if (error) setError('');
          }}
          placeholder="16 Character API Key"
          aria-invalid={!!error}
          aria-describedby={error ? "api-key-error" : undefined}
          style={{ padding: '0.5rem', width: '250px', marginBottom: '0.5rem', color: '#000', borderColor: error ? '#ff4444' : undefined }}
        />
        {error && (
          <div id="api-key-error" role="alert" style={{ color: '#ff4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        <br />
        <button
          type="submit"
          disabled={!isKeyValid}
          style={{
            padding: '0.5rem 2rem',
            cursor: isKeyValid ? 'pointer' : 'not-allowed',
            backgroundColor: isKeyValid ? '#3498db' : '#444',
            color: isKeyValid ? '#fff' : '#888',
            border: 'none',
            borderRadius: '4px',
            transition: 'background-color 0.2s'
          }}
        >
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