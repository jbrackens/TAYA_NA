# idfx-cli-tool

Collection of DX terminal utils for interacting with Idefix, exposed by a CLI utility: `idfx`

## Supported Platforms
- Mac
- Linux (_untested_)
- Windows via WSL (_untested_)

The preferred way of installing this tool is [homebrew](https://brew.sh/). This will automatically make sure you have most of the required dependencies, and install any missing ones. The ones that cannot be installed automatically are also easily installable through homebrew, which streamlines the whole process.

For linux and windows (using WSL) platforms, please refer to [this](https://docs.brew.sh/Homebrew-on-Linux), for instructions on installing `LinuxBrew`.

## Installation

`idfx` is distributed through homebrew. Since everything is hosted in our private org repos, please make sure that you are logged in with your EEG github account, that has access to pull from these repos.

`ngrok` and `aws-vault` are _casks_ (brew term for a GUI app), this means that they cannot be specified as dependencies of `idfx` directly, and must be installed manually. Further information about each requirement is available [here](./docs/requirements.md).

```shell
brew install aws-vault ngrok/ngrok/ngrok
brew tap flipadmin/idfx-cli
brew install idfx
```

> **Warning**
> <br>
> As of v0.0.2 `idfx` uses [fnm](https://github.com/Schniz/fnm) as the node version manager of choice, to make sure that the correct node version is loaded for all the different services, since not all of them run on the same version. While the benefits of `fnm` over the alternatives are [well documented](https://github.com/Schniz/fnm/issues/26#issuecomment-717377913), other version managers still be used in parallel, but internally, `idfx` installs `fnm` and will use it exclusively to manage node versions.
> <br>
> <br>
> `brew` will automatically install `fnm` when installing `idfx`, but further configuration may be required, such as [enabling fnm in your shell](https://github.com/Schniz/fnm#shell-setup). At runtime, `idfx` will attempt to do this for you if it notices it hasn't been done. Furthermore, if no fnm _default_ is found, `idfx` will attempt to install the `latest-lts` node version, and assign the `default` profile to it.

### Updating
You can check the version you have installed by running
```shell
brew info idfx
```
Updating to the latest version is as simple as running
```shell
brew update
brew upgrade idfx
```

## Configuration
`idfx` stores all it's data in `~/.idfx` directory, including the config file which is in `yml` format. It will automatically copy a config [template file](./idfx/src/assets/config.tmpl.yml) to this directory the first time you run it, and will interactively prompt you to complete any missing values, with suggested defaults. This will happen on every call until all values of the config file are set.

You can open the config file directly using `idfx config`, and reset the config entirely using `idfx config reset`.

The config template is documented with comments for each config option, and some defaults where applicable.

## Running everything
> I recommend running `docker system prune --volumes` from time to time to remove unused resources, which still take up space, and can lead to docker crashing if it does not have access to enough storage.

Make sure you have:
  - all the repos pulled
  - completed the repos' own pre-requisites:
    - `yarn install`
    - `yarn build:all` for the brand-client ❗(this takes a while, it's normal)
    - etc... (refer to their own READMEs)
  - docker running

Once the above are complete, the process will look something like this:
```shell
# runs `yarn env` in gstech repo, -b will also run `yarn bootstrap`
idfx env -b

# runs `yarn migrate` in gstech repo
idfx migrate

# this populates the databases with data the services expect, to be able to run
# -p runs the script in parallel mode, this is what you want, otherwise the process can take a good deal longer
# -m re-run `yarn migrate` after the process is complete, useful when your branch has new, undeployed, migrations
# Use `idfx import -h` to get more information.
idfx import -pm

# this starts all required services, and opens mprocs terminal to view the services
idfx launch

# running this command will open the local logs, using lnav
# you want to run this in a seprate terminal, since mprocs is running in your previous one
idfx logs
```
> The first 3 commands are typically only needed once for making sure the environment is setup, the launching "magic" happens in `idfx launch`, and that's what you'll want to just start up everything. You can leave the logs view open, it will continue to stream logs between runs.

The script will open the brand client automatically on `http://localhost:3000` once it detects it is available.

Idefix backoffice is hosted on `http://localhost:3002`, it is typically safe to open by the time the brand-client is available, use the email you set in `mock.idefix_user` and `foobar123` to login.

## filter.sql
`idfx filter` will open this file for editing. You should keep this query as close as possible to the format of the [template](./idfx/src/assets/filter.tmpl.sql), and only adjust the `playerIds` in the `IN (...)` clause. The more complicated this query, the longer it will take to resolve what data should be imported. You should figure out what `playerId`s you want, and insert them here.

The query should **always return 2 columns**: `id` and `personId` (_nullable_).

## `~/.idfx`
Use `idfx home` to open this directory.
#### *data/*
This is the cache directory which saves data from previous `import` executions, `-c` flag will load data from here, instead of querying the databases again. `idfx import -r` will purge this directory. Alternatively `-R[n]` flag will delete all but the most recent `n` cache entries for each table.
#### *logs/*
Logs from locally running services are written here, `idfx logs` will open these logs with `lnav` automatically.
#### *tmp/*
Stores temporary files generated during some operations such as importing data, `idfx import -T` will purge this directory.
#### *signals/*
Used interally for signalling when certain services are ready and it is clear to start other, dependant, services.
#### *config.yml*
The active config file, changes take effect the next time you invoke the command. Use `idfx config` to edit this.
####  *filter.sql*
An sql query that should return a list of `playerIds`, which determines what data will be imported. Use `idfx filter` to edit this.
#### *pids*
This is a file used internally to manage multiple threads when importing data.

