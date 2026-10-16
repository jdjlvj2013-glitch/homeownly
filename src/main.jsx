import React from 'react'; import { createRoot } from 'react-dom/client'; import App from './App.jsx'; import './styles.css';
import { handleAuthCallback } from './storage.js';
// Finish any email sign-in/confirmation BEFORE routing or demo seeding.
handleAuthCallback().catch(() => ({ status: 'none' })).then((authResult) =>
  createRoot(document.getElementById('root')).render(<App authResult={authResult} />));
if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js');
