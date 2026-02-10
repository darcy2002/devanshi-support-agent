/**
 * One-time script to get a Google OAuth2 refresh token for Calendar API.
 * Use the same Client ID and Secret that are in your .env so the refresh token works.
 *
 * 1. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env
 * 2. In Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client
 *    add to "Authorized redirect URIs":  http://localhost:3232/oauth2callback
 * 3. Run: node scripts/get-google-refresh-token.js
 * 4. Paste the printed GOOGLE_REFRESH_TOKEN into .env
 */

import 'dotenv/config';
import { google } from 'googleapis';
import http from 'http';

const REDIRECT_PORT = 3232;
const REDIRECT_PATH = '/oauth2callback';
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
  process.exit(1);
}

const redirectUri = `http://localhost:${REDIRECT_PORT}${REDIRECT_PATH}`;
const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent', // force consent so we get a refresh_token every time
});

const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith(REDIRECT_PATH)) {
    res.writeHead(404).end();
    return;
  }
  const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400).end('Missing code in URL. Try again.');
    return;
  }
  try {
    const { tokens } = await oauth2Client.getToken(code);
    if (tokens.refresh_token) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <h1>Success</h1>
        <p>Refresh token obtained. Check the terminal where you ran the script.</p>
        <p>Add this to your backend <code>.env</code>:</p>
        <pre>GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}</pre>
      `);
      console.log('\n--- Add this to your backend .env ---\n');
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('\n--------------------------------------\n');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('No refresh_token in response. Revoke app access at https://myaccount.google.com/permissions and run the script again.');
      console.warn('No refresh_token returned. Revoke access and try again with prompt=consent.');
    }
  } catch (err) {
    console.error(err);
    res.writeHead(500).end('Error: ' + err.message);
  } finally {
    server.close();
    process.exit(0);
  }
});

server.listen(REDIRECT_PORT, async () => {
  console.log('\n1. Open this URL in your browser (logged in with the Google account for the calendar):\n');
  console.log(authUrl);
  console.log('\n2. After authorizing, you will be redirected to localhost. Then check this terminal for GOOGLE_REFRESH_TOKEN.\n');
  const { exec } = await import('child_process');
  const platform = process.platform;
  const open = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${open} "${authUrl}"`, () => {});
});
