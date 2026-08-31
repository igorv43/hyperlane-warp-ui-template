# Administration Fee — Configuration Guide

This UI can charge a small **administration fee** on each transfer to keep the
interface online. The fee is:

- **Fixed in USD** (default **$0.50**), converted to the origin chain's **native
  coin** (LUNC / BNB / ETH / SOL) in **real time** at send time (Binance price,
  CoinGecko fallback).
- Charged **inside the same transfer** — the user approves **once** and the fee
  goes out together with the bridge transaction.
- **Fully opt-in and self-hosted**: nothing is charged unless *you* set your own
  wallet for that chain. This is a decentralized project — every operator points
  the fee to their own wallets.

The fee is clearly disclosed to the user in the transfer review screen
("Administration Fee ($0.50) ~X LUNC — to keep this interface running").

---

## 1. Configure your wallets

Open `.env` (copy from `.env.example`) and fill in the wallets that should
**receive** the fee. Leave a chain **empty to disable** the fee on that chain.

```bash
# Fee amount in USD (default 0.5). Set 0 to disable everywhere.
NEXT_PUBLIC_ADMIN_FEE_USD=0.5

# Receiving wallets — native address format per chain.
# Empty = fee OFF on that chain.
NEXT_PUBLIC_ADMIN_FEE_WALLET_TERRACLASSIC=terra1youraddress...
NEXT_PUBLIC_ADMIN_FEE_WALLET_BSC=0xYourAddress...
NEXT_PUBLIC_ADMIN_FEE_WALLET_ETHEREUM=0xYourAddress...
NEXT_PUBLIC_ADMIN_FEE_WALLET_SOLANA=YourSolanaPubkey...
```

| Chain | Env variable | Address format | Native | Decimals |
|---|---|---|---|---|
| Terra Classic | `NEXT_PUBLIC_ADMIN_FEE_WALLET_TERRACLASSIC` | `terra1...` | LUNC | 6 |
| BSC | `NEXT_PUBLIC_ADMIN_FEE_WALLET_BSC` | `0x...` | BNB | 18 |
| Ethereum | `NEXT_PUBLIC_ADMIN_FEE_WALLET_ETHEREUM` | `0x...` | ETH | 18 |
| Solana | `NEXT_PUBLIC_ADMIN_FEE_WALLET_SOLANA` | base58 pubkey | SOL | 9 |

> **Next.js note:** `NEXT_PUBLIC_*` variables are baked in at **build time**.
> After editing `.env`, rebuild the app (`pnpm build`, or redeploy your image).

---

## 2. How the single approval works, per chain

| Chain | Mechanism | Approvals |
|---|---|---|
| **Terra Classic** | The fee `MsgSend` is bundled with the warp message(s) in one `signAndBroadcast`. | **1** |
| **Solana** | A `SystemProgram.transfer` instruction (the fee) is injected into the same transaction. | **1** |
| **BSC / Ethereum** | Batched with the transfer via **EIP-5792** (`wallet_sendCalls`). Wallets without EIP-5792 fall back to a second small fee tx (transfer goes first — the user is never charged without receiving the transfer). | **1** (modern wallets) / 2 (fallback) |

ERC-20 approvals (when a token needs `approve`) are unrelated and untouched — the
fee never adds an extra approval on top of the transfer itself.

---

## 3. Real-time pricing

The native price is fetched at send time:

1. **Binance** ticker (`LUNCUSDT`, `BNBUSDT`, `ETHUSDT`, `SOLUSDT`) — primary.
2. **CoinGecko** `simple/price` — fallback.

`fee_native = ceil( USD_fee / native_price )` (rounded up, never undercharges).
If **both** price sources fail, the fee is **skipped for that transfer** — a
price hiccup never blocks the user's bridge.

---

## 4. Disabling the fee

- Disable **one chain**: leave its wallet variable empty.
- Disable **everywhere**: set `NEXT_PUBLIC_ADMIN_FEE_USD=0`, or leave all wallets empty.

---

## 5. Where it lives in the code

| Purpose | File |
|---|---|
| Config (amount + wallets per chain) | `src/consts/adminFee.ts` |
| Real-time quote (price → native amount) | `src/features/transfer/adminFee/quote.ts` |
| UI hook (live display) | `src/features/transfer/adminFee/useAdminFeeQuote.ts` |
| Payment builders (per protocol) | `src/features/transfer/adminFee/build.ts` |
| Execution wiring | `src/features/transfer/useTokenTransfer.ts` |
| Cosmos (bundled MsgSend) | `src/custom/useCustomCosmosTransactionFns.ts` |
| EVM (EIP-5792 + fallback) | `src/custom/useCustomEvmTransactionFns.ts` |
| Disclosure line in the form | `src/features/transfer/TransferTokenForm.tsx` |
