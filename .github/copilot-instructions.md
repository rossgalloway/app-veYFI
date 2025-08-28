# Copilot instructions for app-veYFI

Use this guide to be productive quickly in this Next.js + web3 app. Keep changes small, typed, and aligned with existing patterns.

## Architecture overview

- Framework: Next.js 14 (pages router). Entry: `pages/_app.tsx` wraps the app in providers (`WithMom`, `YearnContextApp`, `VotingEscrowContextApp`, `GaugeContextApp`, `OptionContextApp`).
- Routing: Pages under `pages/` render feature tabs/components:
    - `pages/index.tsx`, `pages/gauges.tsx`, `pages/manage.tsx`, `pages/rewards.tsx` map to components in `app/components/*`.
- State/data: React Contexts in `app/contexts/` provide Yearn data, veYFI state, and gauges. Hooks live in `app/hooks/`.
- On-chain: Contract ABIs in `app/abi/`. Read via `wagmi`/`viem` (`useReadContract(s)`, `readContracts`); write via helpers in `app/actions.ts` which wrap `handleTx` from `@builtbymom/web3`.
- Utilities/constants: `app/utils.ts` centralizes chain IDs, addresses, time math, validation, and helpers like `keyBy`, `sort`.

## Web3 patterns (follow these)

- Always coerce/validate addresses with `toAddress` and types (`TAddress`). Use bigint for amounts. For display math, convert with `toNormalizedBN`.
- Reads: Prefer batched reads with `useReadContracts`/`readContracts`; decode with `decodeAs*` helpers. Example: see `useVotingEscrow.tsx` and `useGauge.tsx`.
- Writes: Add functions in `app/actions.ts` using the pattern:
    - Validate inputs with `assert`/`assertAddress`.
    - Build calls through `handleTx` (ensures status handling). For allowance flows, check via `allowanceOf` and call `approve` before the main action (see `approveAndStake`).
    - Use `toWagmiProvider(props.connector)` when the signer is required.
- Chain: `VEYFI_CHAIN_ID` is 1 (mainnet). Addresses/constants are defined in `app/utils.ts` and `@yearn-finance/web-lib/utils/constants`.

## Contexts you’ll likely extend

- `YearnContextApp` (`app/contexts/useYearn.tsx`): Aggregates prices, earned, vault lists, and balances. Persists user prefs via `useLocalStorageValue`. Exposes `getToken/getBalance/getPrice` and totals.
- `VotingEscrowContextApp` (`app/contexts/useVotingEscrow.tsx`): Exposes `votingEscrow`, user `positions`, and `allowances`; `refresh()` refetches all.
- `GaugeContextApp` (`app/contexts/useGauge.tsx`): Builds a map of gauges from vaults, and user positions per gauge; provides `refresh()`.

## Querystring pattern (gotcha)

- `useSearchParams()` returns `ReadonlyURLSearchParams`. If an API expects `URLSearchParams`, wrap with `new URLSearchParams(searchParams.toString())`. See `app/hooks/useVeYFIQueryArgs.ts` and avoid passing `ReadonlyURLSearchParams` directly.

## Styling and assets

- TailwindCSS (see `style.css` and `tailwind.config.js`). Fonts are local via `next/font/local` in `_app.tsx`.
- Images allowlisted in `next.config.js`. Public assets under `public/`.

## Environment and external services

- Exposed env in `next.config.js` under `env`: RPC URLs per chain, WalletConnect, Alchemy/Infura keys, Yearn/SmolD app endpoints, and Plausible rewrites. These must be present in your environment for features to work.

## Dev workflows

- Scripts (`package.json`):
    - `npm run dev` – start Next.js.
    - `npm run build` – `tsc` typecheck then `next build`.
    - `npm run start` – production start after build.
    - `npm run export` – static export to `ipfs/`.
    - `npm run lint`, `npm run prettier-format` – lint/format. `tsc -p tsconfig.json --noEmit` for strict type checks.
    - `npm run test` – runs Vitest (no config file found; tests should be colocated and use jsdom when needed).

## TypeScript and linting conventions

- Strict TS everywhere (`noImplicitAny`, `noUnused*`, `strict*` on). Prefer utility types from the libraries, not custom primitives.
- Import order is managed by `eslint-plugin-simple-import-sort`. Use named imports from `@builtbymom/web3`, `wagmi`, and `@yearn-finance/web-lib`.

## When adding features

- Put new contract ABIs under `app/abi/` and import them where used.
- New web3 mutations: add a typed function in `app/actions.ts` following existing patterns (validate, optional allowance, `handleTx`). Surface them via components or context refreshes.
- New data surfaces: extend the relevant Context provider value (memoize, keep `refresh()` consistent). Use batching for reads.
- UI: add a component under `app/components/` and a page (if needed) under `pages/`; wire the tab in `app/components/common/Tabs` if it’s a new tab.

## Testing and debugging tips

- Use `vitest` + `@testing-library/react` for components; mock `wagmi`/`viem` where practical.
- Debug with `npm run inspect` (starts Next with `--inspect`).

Questions to clarify or improve:

- Confirm PWA setup (dependency present but not configured). Should we integrate `next-pwa`?
- Provide a canonical place for shared contract addresses (some live in `app/utils.ts`, others in `@yearn-finance/web-lib`).
- Decide on a consistent querystring utility to avoid `ReadonlyURLSearchParams` friction in hooks.
