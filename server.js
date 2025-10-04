const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Endpoint to provide environment variables to the client-side
app.get('/env.js', (req, res) => {
  const supabaseUrl = 'https://altnvsolaqphpndyztup.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaHBuZHl6dHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjI2ODUsImV4cCI6MjA3MzYzODY4NX0.LOvdanWvNL1DaScTDTyXSAbi_4KX_jnJFB1WEdtb-GI';

  // Determine redirect URI based on environment
  const isLocal = req.get('host')?.includes('localhost');
  const redirectUri = isLocal
    ? 'http://localhost:3000/dashboard.html'
    : process.env.GOOGLE_REDIRECT_URI || 'https://altnvsolaqphpndyztup.supabase.co/auth/v1/callback';

  console.log('🔧 Serving env.js with:', {
    host: req.get('host'),
    isLocal,
    redirectUri,
    SUPABASE_URL: supabaseUrl ? 'configured' : 'MISSING',
    SUPABASE_KEY: supabaseKey ? 'configured' : 'MISSING'
  });

  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    window.env = {
      SUPABASE_URL: '${supabaseUrl}',
      SUPABASE_KEY: '${supabaseKey}',
      GOOGLE_REDIRECT_URI: '${redirectUri}'
    };
  `);
});

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '/')));

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
