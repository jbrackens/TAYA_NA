# Realtime Rehearsal

- Started: `2026-03-18T09:41:42Z`
- Finished: `2026-03-18T09:41:46Z`
- Status: `PASS`
- Gateway: `http://localhost:8080`
- Websocket: `ws://localhost:8080/api/v1/ws/web-socket`
- Market ID: `b3e1c0b2-86a9-40e8-ad84-1bcb30010bf9`
- Event ID: `ee5dbe9f-fce7-4629-8cc4-c641772c78a5`
- Channels: `market^b3e1c0b2-86a9-40e8-ad84-1bcb30010bf9`, `fixture^demo^ee5dbe9f-fce7-4629-8cc4-c641772c78a5`, `bets`, `wallets`

## Steps

| Domain | Trigger | Channel | Result | Detail |
| --- | --- | --- | --- | --- |
| market | `PUT /api/v1/markets/{marketID}/odds` | `market^b3e1c0b2-86a9-40e8-ad84-1bcb30010bf9` | PASS | market b3e1c0b2-86a9-40e8-ad84-1bcb30010bf9 odds updated |
| fixture | `PUT /api/v1/events/{eventID}/live-score` | `fixture^demo^ee5dbe9f-fce7-4629-8cc4-c641772c78a5` | PASS | fixture ee5dbe9f-fce7-4629-8cc4-c641772c78a5 live-score updated |
| wallet | `POST /api/v1/wallets/{userID}/deposits` | `wallets` | PASS | wallet balance moved to 255 USD |
| bet | `POST /api/v1/bets` | `bets` | PASS | bet a2daca9f-1902-4f16-bb0a-dd8ab0dd604a opened |
