# Database migrations

These migrations use [golang-migrate](https://github.com/golang-migrate/migrate).
The database connection must be provided through `DATABASE_URL`.

## New database

Apply every migration:

```powershell
$migrationSource = "file://$((Resolve-Path migrations).Path.Replace('\', '/'))"
migrate -source $migrationSource -database $env:DATABASE_URL up
```

## Existing `bd_box` database

The existing database already contains the structure represented by migration
`000001`. Back up the database, mark that migration as the current baseline,
then apply the next migration:

```powershell
$migrationSource = "file://$((Resolve-Path migrations).Path.Replace('\', '/'))"
migrate -source $migrationSource -database $env:DATABASE_URL force 1
migrate -source $migrationSource -database $env:DATABASE_URL up
```

Do not run migration `000001` directly against the existing database, because
its tables already exist.

## Common commands

```powershell
$migrationSource = "file://$((Resolve-Path migrations).Path.Replace('\', '/'))"
migrate -source $migrationSource -database $env:DATABASE_URL version
migrate -source $migrationSource -database $env:DATABASE_URL down 1
```

Never edit a migration that has already been applied. Create a new numbered
migration for every schema change.
