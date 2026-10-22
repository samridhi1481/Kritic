# GatiSetu — Intelligent Railway Operations & Maintenance

GatiSetu is an intelligent railway operations platform designed to support railway maintenance planning, corridor intelligence, operational risk assessment, and coordinated decision-making.

## Project Overview

GatiSetu brings railway operational information and intelligence into one interface to help teams identify potential risks, understand external developments, and coordinate maintenance activities.

## Current Technology Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js
- **External intelligence:** TinyFish Search API
- **Package manager:** pnpm

## Current Implementation

### Member 1 — TinyFish Search Integration

The current implementation includes:

- A backend proxy for TinyFish Search API requests.
- Server-side API-key configuration.
- A Live Corridor Intelligence panel in the Command Center.
- Railway-related search results with source links.
- Search and refresh functionality.
- Backend tests for the existing implementation.

**Known limitation:** Search results may include unrelated information. External results must be treated as unverified intelligence signals, not confirmed railway incidents.

## Repository Structure

```text
Kritic/
├── server/
│   ├── index.mjs
│   └── index.test.mjs
├── src/
│   ├── components/
│   │   └── CorridorIntelligence.tsx
│   ├── Overview.tsx
│   ├── App.tsx
│   └── ...
├── .env.example
├── .gitignore
├── package.json
├── pnpm-lock.yaml
└── README.md
```

Verify file names against the current repository before adding more files.

## Local Setup

Requirements: Node.js 22.12 or newer and pnpm (Corepack is included with Node.js).

### 1. Clone the repository

```bash
git clone https://github.com/samridhi1481/Kritic.git
cd Kritic
```

### 2. Install dependencies

```bash
corepack pnpm install
```

### 3. Configure the TinyFish API key

Use `.env.example` as a template to create a local `.env` file in the project root.

```env
TINYFISH_API_KEY=your_tinyfish_api_key
```

Replace the placeholder with a valid key. Never commit `.env`, expose the key in React code, or include it in screenshots or public documentation.

### 4. Run the application

Start the backend and frontend in separate terminals from the repository root:

```bash
pnpm server
```

```bash
pnpm dev
```

The API listens on `http://127.0.0.1:3001`; Vite serves the frontend on port `8443` by default and proxies `/api` requests to the backend. Add a valid `TINYFISH_API_KEY` to `.env` before expecting external search results. Without a key, the panel displays the backend's configuration error.

Run the full test suite and production build with:

```bash
pnpm test
pnpm build
```

`pnpm test` runs both the backend's built-in Node tests and the corridor-intelligence UI tests. The overview's KPIs, network diagram, schedule, and insight cards remain demo data; corridor intelligence is the only module currently backed by the server API.

## Backend Integration Contract

The existing corridor-intelligence endpoint is:

`POST /api/corridor-intelligence`

Before integrating another module, inspect `server/index.mjs` and the existing frontend request to confirm the exact request fields, response structure, and error format.

Modules consuming this endpoint should handle loading, empty, and error states and should display source links when available.

## Instructions for Team Members

1. Pull the latest code from the shared repository before working.
2. Read this README and inspect the relevant existing code.
3. Work on your assigned module without replacing the existing application.
4. Reuse agreed API contracts when connecting modules.
5. Coordinate before changing shared files, interfaces, or dependencies.
6. Test your module and fix errors before pushing.
7. Document your module's inputs, outputs, setup, and testing results in this README.
8. Push your changes to the shared repository without force-pushing.

## Testing Checklist

- [x] Dependencies install successfully from the lockfile.
- [x] Backend starts successfully without an API key and returns the documented configuration error.
- [x] Frontend starts successfully.
- [ ] TinyFish search requests return valid results.
- [x] Source links render correctly for returned results.
- [x] Loading, empty, and backend-error states are covered by UI tests.
- [x] Existing backend tests pass.
- [x] Corridor-intelligence UI tests pass.
- [x] Production build succeeds.
- [x] Responsive layout checked at 390px and 1024px viewport widths.
- [x] No local `.env` or API key is included in the change set.

The live TinyFish request remains unverified until a valid `TINYFISH_API_KEY` is configured locally.

## Security

Keep API keys and secrets on the backend. If an API key is exposed, revoke it and generate a replacement. `.env.example` must contain placeholders only.

## Team Contributions

Each team member should document their assigned feature, its integration requirements, and its testing status so the team can combine all modules into a working GatiSetu demonstration.
