# Next.js React Isomorphic App - `@phoenix-ui/office`

## Configuration

To be able to develop locally with different configuration you've to set special
file `.env.local` which by default is ignored while commit because of
[next.js recommendations](https://nextjs.org/docs/basic-features/environment-variables#default-environment-variables)

### Example .env.local file

```
ENV_NAME=development
API_GLOBAL_ENDPOINT=http://localhost:3010
WS_GLOBAL_ENDPOINT=ws://localhost:3010
```

## Scripts

### Development

- `run-local:dev` - runs development server with hot reload
- `test` - runs tests suites with `--coverage` option

### Other scripts

See core [README.md](../../README.md#scripts)
