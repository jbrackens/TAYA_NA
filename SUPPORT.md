# Support

Use this file to route local development issues quickly.

## Local Stack

Check container health:

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined
docker compose ps
docker compose logs --tail=100 gateway auth
```

## Player App

Start the app:

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/talon-backoffice/packages/app
NEXT_PUBLIC_API_URL=http://localhost:18080 \
NEXT_PUBLIC_AUTH_URL=http://localhost:18081 \
NEXT_PUBLIC_WS_URL=ws://localhost:18080/ws \
npm run dev -- -p 3010
```

Open `http://localhost:3010/predict`.

## Demo Accounts

- Player: `demo@phoenix.local` / `demo123`
- Admin: `admin@phoenix.local` / `admin123`

## Bug Reports

Include:

- Page or API endpoint
- Expected behavior
- Actual behavior
- Screenshot or curl output
- Browser console errors
- Relevant container logs
- Commit hash
