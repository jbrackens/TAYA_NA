# Phoenix UI Vie.gg

This is the Vie.gg repository for building the brand specific app that base on
the `@phoenix-ui/app` core.

## Requirements

- NVM
- Node v14.9.0
- Yarn v1.17.3

### Pre-requisites
#### .npmrc setup
`npm login --registry=https://registry.npmjs.org/`

## Usage

- `nvm use`
- `yarn bootstrap`
- `yarn dev`

## Scripts

### Dockerized
- `dockerize` - creates a `phoenix-ui/app-darkstormlabs` Docker image of `@phoenix-ui/app-darkstormlabs` package
- `run-docker:dev` - runs `phoenix-ui/app-darkstormlabs` image on `localhost` with `.env.development` applied

### Runnable Node.js server

- `build:local` - build version with `.env.local` applied
- `build:dev` - build version with `.env.development` applied
- `build:stage` - build version with `.env.staging` applied
- `build:prod` - build version with `.env.production` applied
- `start` - runs bundled & [hybrid app](https://nextjs.org/docs/deployment#nodejs-server) from `.next` directory as Vie.gg Customer App

### Static HTMLs

- `build:export:local` - build & optimize version with `.env.local` applied
- `build:export:dev` - build & optimize version with `.env.development` applied
- `build:export:stage` - build & optimize version with `.env.staging` applied
- `build:export:prod` - build & optimize version with `.env.production` applied

### Scoping build scripts

`--scope @phoenix-ui/<package_name>` for example if we want to build the staging
version of vie.gg brand app:

```
build:export:stage --scope @phoenix-ui/app-darkstormlabs
```

## Packages

- **@phoenix-ui/app-darkstormlabs** - Next.js React Isomorphic App - Brand UI
- **@phoenix-ui/mock-server-darkstormlabs** - API Mock Server (by-pass of
  `@phoenix-ui/mock-server` from core)

### Using git

When integrating a PR into `develop`:
- rebase, fast-forward (`git merge --ff-only`), squash: OK, all allowed since they retain linear history
- 2-parent aka _true_ merge (`git merge --no-ff`): discouraged, coz it tangles up the history

When releasing `develop` to `master`:
- rebase, squash: forbidden, since it'd lead to `develop` & `master` histories diverging
- fast-forward (`git merge --ff-only develop`): OK, preferred since it retains linear history
- 2-parent aka _true_ merge (`git merge --no-ff develop`): OK, tangles up history but acceptable if cannot be avoided

Note that `git merge` by default runs in `--ff` mode, which fast-forwards the branch if possible, and creates a 2-parent merge commit otherwise.

So, in a nutshell, **to release `develop` to `master`**, open a PR from `develop` to `master`,
get it approved & passing the CI check, then execute `git checkout master && git merge develop && git push -u origin master`.
