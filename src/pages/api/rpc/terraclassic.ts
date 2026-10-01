/**
 * Server-side Terra Classic (Cosmos) RPC proxy with upstream fallback.
 *
 * The Hyperlane SDK's default Cosmos provider builders (StargateClient /
 * CosmWasmClient) only ever connect to the FIRST configured rpcUrls entry —
 * there is no automatic fallback to the others if it fails. So when the lone
 * public endpoint has an outage (e.g. terra-classic-rpc.publicnode.com
 * returning 503), every balance check and transfer on Terra Classic breaks
 * even though a second RPC is listed in the chain metadata.
 *
 * This proxy fixes that at the transport layer instead of patching the SDK:
 * the client POSTs its Tendermint JSON-RPC requests here, and we retry each
 * upstream in order until one responds successfully. Point the UI at it via:
 *   NEXT_PUBLIC_RPC_OVERRIDES={"terraclassic":{"http":"https://<domain>/api/rpc/terraclassic"}}
 *
 * The body is forwarded as a raw, untouched buffer rather than being parsed
 * and re-serialized — cosmos-kit's endpoint health check (getFastestEndpoint)
 * POSTs with NO body at all to probe reachability, and a real Tendermint RPC
 * node replies 200 to that. Re-serializing an empty body via
 * JSON.stringify(req.body) turns it into the literal string '""', which the
 * node correctly rejects as a malformed JSON-RPC request (500) — breaking
 * cosmos-kit's probe and, with it, every Cosmos-side signing flow, since it
 * never falls through to actually requesting a wallet signature.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
  },
};

const DEFAULT_UPSTREAMS = [
  'https://terra-classic-rpc.publicnode.com:443',
  'https://rpc.terra-classic.hexxagon.io',
];

const UPSTREAMS = (process.env.TERRACLASSIC_RPC_URLS || '')
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
