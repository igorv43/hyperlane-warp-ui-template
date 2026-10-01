/**
 * Server-side BSC RPC proxy with upstream fallback — same rationale as
 * /api/rpc/terraclassic. Public BSC RPC nodes are unreliable for direct
 * browser calls: some reject cross-origin requests outright (no CORS
 * headers), others rate-limit (429), and DNS for a couple of the commonly
 * listed ones has gone stale. Proxying server-side avoids CORS entirely and
 * retries a list of upstreams instead of failing the whole transfer when one
 * of them has a bad day.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const DEFAULT_UPSTREAMS = [
  'https://bsc-dataseed.bnbchain.org',
  'https://bsc-dataseed1.binance.org',
  'https://bsc-rpc.publicnode.com',
  'https://bsc.drpc.org',
];

const UPSTREAMS = (process.env.BSC_RPC_URLS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const upstreams = UPSTREAMS.length ? UPSTREAMS : DEFAULT_UPSTREAMS;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = JSON.stringify(req.body);
  let lastStatus = 502;
  let lastText = JSON.stringify({ error: 'Upstream RPC error' });

  for (const upstream of upstreams) {
    try {
      const r = await fetch(upstream, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      });
      if (r.ok) {
        const text = await r.text();
        res.status(200).setHeader('content-type', 'application/json');
        return res.send(text);
      }
      lastStatus = r.status;
      lastText = await r.text();
    } catch {
      lastStatus = 502;
      lastText = JSON.stringify({ error: `Upstream unreachable: ${upstream}` });
    }
  }

  res.status(lastStatus).setHeader('content-type', 'application/json');
  return res.send(lastText);
}
