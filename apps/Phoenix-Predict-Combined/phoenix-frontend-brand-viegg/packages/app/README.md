# Next.js React Isomorphic Sample Brand App- `@phoenix-ui/app-brand-sample`

## Configuration

To be able to develop locally with different configuration you've to set special
file `.env.local` which by default is ignored while commit because of
[next.js recommendations](https://nextjs.org/docs/basic-features/environment-variables#default-environment-variables)

### Example file

```
ENV_NAME = development
API_GLOBAL_ENDPOINT = http://localhost:3010
WS_GLOBAL_ENDPOINT = ws://localhost:3010
```

## Scripts

- `run-local:dev` - runs development server with hot reload
- `test` - runs tests suites with `--coverage` option
- `build:export:local` - build & optimize version with `.env.local` applied
- `build:export:dev` - build & optimize version with `.env.development` applied
- `build:export:stage` - build & optimize version with `.env.staging` applied
- `build:export:prod` - build & optimize version with `.env.production` applied
