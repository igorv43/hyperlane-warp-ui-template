/**
 * Server-side BSC RPC proxy with upstream fallback — same rationale as
 * /api/rpc/terraclassic. Public BSC RPC nodes are unreliable for direct
 * browser calls: some reject cross-origin requests outright (no CORS
 * headers), others rate-limit (429), and DNS for a couple of the commonly
 * listed ones has gone stale. Proxying server-side avoids CORS entirely and
 * retries a list of upstreams instead of failing the whole transfer when one
 * of them has a bad day.
 *
 * The body is forwarded as a raw, untouched buffer rather than being parsed
 * and re-serialized — see /api/rpc/terraclassic for why re-serializing an
 * empty probe body breaks RPC health checks that some wallet libraries do
 * before signing.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
  },
};

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

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rawBody = await readRawBody(req);
  const body = rawBody.length > 0 ? rawBody : undefined;
  const contentType = req.headers['content-type'];

  let lastStatus = 502;
  let lastText = JSON.stringify({ error: 'Upstream RPC error' });

  for (const upstream of upstreams) {
    try {
      const r = await fetch(upstream, {
        method: 'POST',
        headers: contentType ? { 'content-type': contentType } : undefined,
        body,
      });
      if (r.ok) {
        const text = await r.text();
        res.status(200).setHeader('content-type', r.headers.get('content-type') || 'application/json');
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
