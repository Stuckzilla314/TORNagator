import React, { useState } from 'react';

/**
 * Renders the login form for the user to input their TORN API key.
 *
 * @param {Object} props - The component props.
 * @param {Function} props.onLogin - The callback function invoked with the valid API key upon successful form submission.
 * @returns {React.JSX.Element} The rendered login form component.
 */
const LoginForm = ({ onLogin }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  /**
   * Handles the form submission.
   * Validates the length of the API key, clears errors on success and invokes the onLogin callback.
   * Sets an error message if the key is invalid.
   *
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (key.trim().length === 16) {
      setError('');
      onLogin(key.trim());
    } else {
      setError('Please enter a valid 16-character TORN API key.');
    }
  };

  /**
   * Boolean flag indicating if the current trimmed key is exactly 16 characters long.
   * Used to enable or disable the submit button.
   *
   * @type {boolean}
   */
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
      <div style={{
        marginTop: '2rem',
        padding: '1.2rem',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        textAlign: 'left',
        fontSize: '0.8rem',
        color: '#ccc',
        maxWidth: '650px',
        margin: '2rem auto 0 auto',
        lineHeight: '1.5',
        fontFamily: "'Inter', -apple-system, sans-serif"
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#3498db', fontSize: '0.95rem', fontWeight: 'bold' }}>
          🛡️ Torn API Terms of Service & Data Transparency
        </h3>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#aaa' }}>
          This application runs entirely locally on your system. Your API key and retrieved data are saved only on your local device (localStorage and sessionStorage) and are never shared or stored remotely.
        </p>

        <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.75rem',
            color: '#ddd'
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
                <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 'bold', width: '20%' }}>Data Storage</th>
                <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 'bold', width: '20%' }}>Data Sharing</th>
                <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 'bold', width: '20%' }}>Purpose of Use</th>
                <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 'bold', width: '20%' }}>Key Storage & Sharing</th>
                <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 'bold', width: '20%' }}>Key Access Level</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '8px 6px', verticalAlign: 'top' }}><strong>Only locally</strong><br /><span style={{ color: '#888', fontSize: '0.7rem' }}>Stored in browser's local/session storage</span></td>
                <td style={{ padding: '8px 6px', verticalAlign: 'top' }}><strong>Nobody</strong><br /><span style={{ color: '#888', fontSize: '0.7rem' }}>Data never leaves your local device</span></td>
                <td style={{ padding: '8px 6px', verticalAlign: 'top' }}><strong>Personal assistance</strong><br /><span style={{ color: '#888', fontSize: '0.7rem' }}>Travel profit calculations, faction war helper, and stats overlay</span></td>
                <td style={{ padding: '8px 6px', verticalAlign: 'top' }}><strong>Stored locally / Not shared</strong><br /><span style={{ color: '#888', fontSize: '0.7rem' }}>Retained on device for auto-refresh</span></td>
                <td style={{ padding: '8px 6px', verticalAlign: 'top' }}><strong>Limited or Full</strong><br /><span style={{ color: '#888', fontSize: '0.7rem' }}>Required to read travel, faction status, and item logs</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <p style={{ margin: 0, fontSize: '0.72rem', color: '#888', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.8rem' }}>
          <strong>Third-Party Integration:</strong> TORNagator integrates automatically with <a href="https://weav3r.dev" target="_blank" rel="noopener noreferrer" style={{ color: '#3498db', textDecoration: 'none' }}>weav3r.dev</a> to display public bazaar and market price estimations. No API keys or private user data are ever shared with Weav3r.
        </p>
      </div>
    </div>
  );
};

export default LoginForm;