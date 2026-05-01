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
http://localhost:3001
```

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
