'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');

// Load .env when present (Node 20.12+). Real environment variables take precedence.
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envFile);
}

const app = express();
const PORT = Number(process.env.PORT) || 8080;
const HOST = '0.0.0.0';
const UPSTREAM_TIMEOUT_MS = 10000;

app.disable('x-powered-by');

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    application: 'forms-doubleclick-poc'
  });
});

/**
 * Resolves the regional Direct Line domain for a Copilot Studio agent.
 * Copilot Studio exposes it next to the token endpoint at
 * .../powervirtualagents/regionalchannelsettings. Returns null if it cannot be
 * resolved, in which case Web Chat falls back to the global Direct Line domain.
 */
async function getRegionalDirectLineDomain(tokenUrl) {
  const marker = '/powervirtualagents';
  const markerIndex = tokenUrl.pathname.indexOf(marker);
  const apiVersion = tokenUrl.searchParams.get('api-version');
  if (markerIndex === -1 || !apiVersion) return null;

  const settingsUrl = new URL(
    `${tokenUrl.pathname.slice(0, markerIndex)}${marker}/regionalchannelsettings`,
    tokenUrl.origin
  );
  settingsUrl.searchParams.set('api-version', apiVersion);

  try {
    const response = await fetch(settingsUrl, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    if (!response.ok) return null;
    const data = await response.json();
    const directLineBase = data && data.channelUrlsById && data.channelUrlsById.directline;
    if (!directLineBase) return null;
    const base = directLineBase.endsWith('/') ? directLineBase : `${directLineBase}/`;
    return new URL('v3/directline', base).href;
  } catch (err) {
    console.warn('[copilot] Regional channel settings lookup failed:', err.message);
    return null;
  }
}

// Issues a short-lived Direct Line token for the browser. The token endpoint
// URL stays on the server; only the token is returned to the client.
app.get('/api/copilot/token', async (req, res) => {
  res.set('Cache-Control', 'no-store');

  const endpoint = process.env.COPILOT_TOKEN_ENDPOINT;
  if (!endpoint) {
    return res.status(503).json({
      error: 'not_configured',
      message: 'COPILOT_TOKEN_ENDPOINT is not set on the server.'
    });
  }

  let tokenUrl;
  try {
    tokenUrl = new URL(endpoint);
  } catch (err) {
    return res.status(500).json({ error: 'invalid_config', message: 'COPILOT_TOKEN_ENDPOINT is not a valid URL.' });
  }
  if (tokenUrl.protocol !== 'https:') {
    return res.status(500).json({ error: 'invalid_config', message: 'COPILOT_TOKEN_ENDPOINT must use https.' });
  }

  try {
    const tokenResponse = await fetch(tokenUrl, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    if (!tokenResponse.ok) {
      console.error(`[copilot] Token endpoint returned HTTP ${tokenResponse.status}`);
      return res.status(502).json({ error: 'token_failed', message: 'Copilot Studio token request failed.' });
    }

    const data = await tokenResponse.json();
    if (!data || typeof data.token !== 'string') {
      console.error('[copilot] Token endpoint response did not contain a token.');
      return res.status(502).json({ error: 'token_failed', message: 'Copilot Studio token response was invalid.' });
    }

    const directLineDomain = await getRegionalDirectLineDomain(tokenUrl);

    return res.json({
      token: data.token,
      expiresIn: data.expires_in,
      directLineDomain
    });
  } catch (err) {
    console.error('[copilot] Token request error:', err.message);
    return res.status(502).json({ error: 'token_failed', message: 'Copilot Studio token endpoint is unreachable.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, HOST, () => {
  // HOST 0.0.0.0 means "all interfaces"; browsers cannot open it, so print localhost.
  console.log(`Form Interaction Test listening on ${HOST}:${PORT}`);
  console.log(`Open http://localhost:${PORT} (Cloud Shell: Web Preview > port ${PORT})`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Copilot token endpoint: ${process.env.COPILOT_TOKEN_ENDPOINT ? 'configured' : 'not configured'}`);
});
