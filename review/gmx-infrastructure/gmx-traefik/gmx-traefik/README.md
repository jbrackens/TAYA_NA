# gmx-traefik

1. `docker network create gmx-internal`
2. Database locally are accessible at `postgres`
3. Database root: `postgres@postgres`
4. __PG admin__ available via `http://localhost:8000/pgadmin/`
5. PgAdmin login is `postgres@postgres` with password `postgres`
6. Redis from inside is under `redis:6379` location
7. __Redis Commander__ available via `http://localhost:8000/rediscmd/`
8. Traefik dashboard available at `http://localhost:8080`
9. All Djagno apps should have `STATUC_URL` equals to `/static/<STATIC_ROOT>`
10. SFTP server exposed internally as `sftp_server` with `microservice:microservice` creds