# SportLink Server

Express + TypeScript backend for the sports events matchmaking app.

## What it includes
- CRUD endpoints for events
- Join / leave event endpoints
- Statistics endpoint
- Server-side validation
- Server-side pagination
- RAM-only storage (no database, no file persistence)
- Tests with Vitest + Supertest

## Run locally

```bash
npm install
npm run dev
```

The server starts on:

```bash
https://localhost:3001
```

## Bronze auth / HTTPS setup

Create a certificate that includes the server LAN IP, then point both apps at it:

```bash
mkdir ../certs
mkcert -key-file ../certs/sportlink-key.pem -cert-file ../certs/sportlink-cert.pem localhost 127.0.0.1 192.168.1.134
```

In `server/.env`, set `SSL_KEY_PATH`, `SSL_CERT_PATH`, strong `SESSION_SECRET` and
`AUTH_TOKEN_SECRET`, and include the client origin in `CLIENT_ORIGINS`.

Run the backend on the server machine:

```bash
npm run dev
```

Run the client on the other machine with HTTPS and LAN URLs, for example:

```bash
$env:SSL_KEY_PATH="../certs/sportlink-key.pem"
$env:SSL_CERT_PATH="../certs/sportlink-cert.pem"
npm run dev -- --host 0.0.0.0
```

Login/register now return a signed bearer token plus an HTTP-only session cookie.
The backend checks role permissions from the authenticated session and expires it
after `SESSION_IDLE_TIMEOUT_MS` of inactivity.

## Build

```bash
npm run build
npm start
```

## Run tests

```bash
npm test
npm run coverage
```

## Endpoints

### Health
- `GET /api/health`

### Events
- `GET /api/events`
- `GET /api/events/:id`
- `POST /api/events`
- `PUT /api/events/:id`
- `DELETE /api/events/:id`
- `POST /api/events/:id/join`
- `POST /api/events/:id/leave`

### Statistics
- `GET /api/statistics`

## Query params for events list
- `page`
- `limit`
- `sport`
- `date`
- `location`
- `joinedOnly=true`
- `user`

Example:

```bash
GET /api/events?page=1&limit=5&sport=Football
```

## Example create body

```json
{
  "title": "Football Match",
  "sport": "Football",
  "city": "Cluj-Napoca",
  "date": "2026-05-10",
  "startTime": "18:00",
  "duration": "2 hours",
  "location": "Central Park",
  "maxParticipants": 10,
  "description": "Friendly football match.",
  "participants": []
}
```

## Example join/leave body

```json
{
  "userName": "Rares"
}
```
