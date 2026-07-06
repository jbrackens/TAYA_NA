# Database backups

Automated logical backups of the Predict PostgreSQL database, plus a verified
restore path. The single-box deployment keeps every balance, position, and
settlement in one Postgres instance, so a backup is the difference between a bad
day and total data loss.

## What runs

`docker-compose.demo.yml` defines a `db-backup` sidecar (`postgres:16-alpine`)
that loops `backup-db.sh` every `BACKUP_INTERVAL_SECONDS` (default 6h), writing
gzipped `pg_dump` output to the `db_backups` volume and pruning dumps older than
`BACKUP_RETENTION_DAYS` (default 7).

The deploy workflow recreates named services only, so activate the sidecar once
on the box (it is `restart: unless-stopped` and survives reboots after that):

```bash
docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d db-backup
docker logs predict_db_backup --tail 20   # confirm the first dump
```

## Scripts

- `backup-db.sh` — one dump + retention prune. Connection from libpq env vars
  (`PGHOST`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`). Writes
  `$BACKUP_DIR/<db>-<UTC>.sql.gz` atomically.
- `restore-db.sh <dump.sql.gz> <target_db> [--force]` — restore into a target
  database. Refuses to restore into the live `predict` DB without `--force`, so
  verification can't clobber production.

## Run a backup on demand

```bash
docker exec predict_db_backup sh /ops/backup-db.sh
docker exec predict_db_backup ls -lh /backups
```

## Verify a backup restores (safe — uses a scratch DB)

```bash
docker exec predict_db_backup sh -c \
  'DUMP=$(ls -t /backups/predict-*.sql.gz | head -1); sh /ops/restore-db.sh "$DUMP" predict_restore_check'
# Compare counts, then drop the scratch DB:
docker exec predict_postgres psql -U predict -d predict_restore_check -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
docker exec predict_postgres psql -U predict -d postgres -c "DROP DATABASE predict_restore_check;"
```

(Validated 2026-05-23: a live dump restored into a scratch DB with identical
counts — 56 tables, 159 markets.)

## Real recovery (DESTRUCTIVE — overwrites live data)

```bash
docker compose stop gateway auth                 # quiesce writers first
docker exec predict_db_backup sh -c \
  'DUMP=$(ls -t /backups/predict-*.sql.gz | head -1); sh /ops/restore-db.sh "$DUMP" predict --force'
docker compose start gateway auth
```

## Offsite (do this before real value)

A backup on the same box does not survive box loss. Set `BACKUP_OFFSITE_CMD` on
the `db-backup` service to push each new dump offsite; it receives the dump path
as `$1`:

```yaml
BACKUP_OFFSITE_CMD: 'aws s3 cp "$1" s3://your-bucket/predict/'
```

Supply the provider credentials via the service environment / a secrets store.
