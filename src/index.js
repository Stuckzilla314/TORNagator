import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initApiInterceptor } from './apiLogger';

/**
 * Application Entry Point.
 *
 * Sets up global utilities like the API fetch interceptor for logging,
 * creates the main React root element, and renders the App inside React.StrictMode.
 */

// Initialize the API Interceptor to capture all fetch requests
initApiInterceptor();

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);