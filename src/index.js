import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initApiInterceptor } from './apiLogger';

// Initialize the API Interceptor to capture all fetch requests
initApiInterceptor();

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);