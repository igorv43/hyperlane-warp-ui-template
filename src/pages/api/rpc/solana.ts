/**
 * Server-side Solana RPC proxy. Keeps a paid RPC URL (with its API key) in a
 * server-only env var (SOLANA_RPC_URL — no NEXT_PUBLIC_ prefix, read at
 * request time) so the key never reaches the client bundle or the browser's
 * network tab. Point the UI at it via:
 *   NEXT_PUBLIC_RPC_OVERRIDES={"solanamainnet":{"http":"https://<domain>/api/rpc/solana"}}
 * Origin-gated so third parties cannot burn the paid quota through the proxy.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const ALLOWED_ORIGINS = (
  process.env.SOLANA_RPC_ALLOWED_ORIGINS ||
  'https://bridge.terra-classic.io,https://terraclassic-bridge.xyz'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = String(req.headers.origin || '');
  const originAllowed =
    !origin || ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost');
  if (origin && originAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type,solana-client');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!originAllowed) return res.status(403).json({ error: 'Origin not allowed' });

  const upstream = process.env.SOLANA_RPC_URL;
  if (!upstream) return res.status(500).json({ error: 'SOLANA_RPC_URL not configured' });

  try {
    const r = await fetch(upstream, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const text = await r.text();
    res.status(r.status).setHeader('content-type', 'application/json');
    return res.send(text);
  } catch {
    return res.status(502).json({ error: 'Upstream RPC error' });
  }
}
