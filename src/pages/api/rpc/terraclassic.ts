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
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const DEFAULT_UPSTREAMS = [
  'https://terra-classic-rpc.publicnode.com:443',
  'https://rpc.terra-classic.hexxagon.io',
];

const UPSTREAMS = (process.env.TERRACLASSIC_RPC_URLS || '')
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
