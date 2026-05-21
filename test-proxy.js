const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');

const app = express();
app.use('/', createProxyMiddleware({
  target: 'https://www.torn.com',
  changeOrigin: true,
  onProxyRes: function (proxyRes, req, res) {
    delete proxyRes.headers['x-frame-options'];
    delete proxyRes.headers['content-security-policy'];
  }
}));

app.listen(3001, () => console.log('Proxy on 3001'));
