---
id: database-migrations
title: Database Migrations
sidebar_label: Database Migrations
---

## General Considerations

We're using [Flyway](https://flywaydb.org/) for read-side DB migrations. <br/>
Flyway also manages the schema of the tables used internally by Akka Persistence (`journal`, `snapshots`) and Akka Projections (`akka_projection_offset_store`).
Of course, migration of the events in `journal` will be performed by Akka Persistence-specific tools.

We're using plain SQL migrations and **not** Slick-specific DSLs like what [slick-migration-api](https://github.com/nafg/slick-migration-api) offers. <br/>
SQL, even if more verbose, allows us to execute Flyway without the application code.
It means we can make a relatively tiny archive with SQLs only and execute the migrations in any possible way:
Jenkins, init-containers, by DBAs, from CLI or from code (flyway Java API). <br/>
Additionally, using Flyway with plain SQL is a company-wide standard for DB migrations,
it works for JVM-family apps but also for Python projects we have now.

Unlike with [Play Evolutions](https://www.playframework.com/documentation/latest/Evolutions),
the DB migrations are **not** executed directly from the application.
The reason is that for the sake of security, we shouldn't grant the app's DB user
the permissions to modify the database schema (i.e. run DDL queries). <br/>
Flyway will use a separate DB user, which will most likely have full permissions on the DB
(since just stripping it down to the minimum required set of the permissions might be brittle and not future-proof).

By default, under Postgres (which, unlike e.g. MySQL, supports transactions on schema operations),
Flyway executes [each individual migration in a separate transaction](https://flywaydb.org/documentation/migrations#transactions).
Note that this is distinct from executing **all pending migrations** in a single transaction.
In Phoenix, we have this stronger guarantee enabled
via `org.flywaydb.core.api.configuration.FluentConfiguration#group` Java DSL method or `flywayGroup` sbt config key.

To provide better manageability, we should prefer small, gradual migrations &mdash;
possibly even at the expense of having to write more SQL code than would be required if those migrations were squeezed into a single file.


## Versioning & Compatibility

The migration files are versioned according to [Semantic Versioning](https://semver.org), using `V${major}_${minor}_${patch}__${description}.sql` scheme.

**Major version** must be bumped in the file name every time a non-backward-compatible change is applied. <br/>
Note that in general we should **never** apply non-BW-compatible changes to the columns/tables/domains that are actively used by the app.
The only circumstance where major-version changes are allowed are cleanup migrations
that remove the things that are no longer used by any running version of the app.

Note that we require **backward** compatibility of the migrations (old app &mdash; new DB schema),
but not necessarily **forward** compatibility (new app &mdash; old DB schema). <br/>
We're generally never going to roll back the production DB to the previous state while the new app is already running,
hence new version of the app will never be forced to run against the old unmigrated schema.

Note that [undo migrations](https://flywaydb.org/documentation/command/undo) are **not** supported in [Flyway Community Edition](https://flywaydb.org/download/) that we use.
This of course doesn't mean that we can't provide an equivalent regular (non-undo) migration ourselves if needed,
it just won't be seen by Flyway as an undo migration.

**Minor version** must be bumped for a forward-compatible modification of the schema
that requires a change to how the DB schema is reflected in the application code. <br/>
This will be the vast majority of all migrations.

**Patch version** must be bumped for a forward-compatible modification of the schema
that does **not** require a change to how the DB schema is reflected in the application code.
