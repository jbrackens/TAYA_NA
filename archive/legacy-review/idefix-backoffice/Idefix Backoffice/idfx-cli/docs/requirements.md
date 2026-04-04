## Requirements

Requirements here are over and above those required by the core Idefix projects, I assume you already have those (docker, yarn, etc...).

### [bash](https://www.gnu.org/software/bash/)
this utility is writted with bash v5 in mind, this is not the typical version shipped with NIX environments, so updating is **highly** recommended
- you can confirm your shell version using `bash --version`

### [aws-vault](https://github.com/99designs/aws-vault)
`aws-vault` is used to login to our AWS infra setup, allowing you to access other resources from within logged-in shells

### [gh](https://cli.github.com/)
`gh` is a github CLI tool with a wide range of additional features supported on top of the basic `git` command

### [logcli](https://grafana.com/docs/loki/latest/tools/logcli/)
`logcli` is the cli tool for Loki our remote logs management sysetm, it allows us to query our Loki instance to view logs from the terminal

### [chronic](https://github.com/mojombo/chronic)
`chronic` is a ruby library that provide limited NLP processing for dates, making it easier to query logs for specific timeframes

### [stern](https://github.com/stern/stern)
`stern` is a k8s CLI tool that allows for tailing stdout streams from multiple pods and containers at the same time

### [lnav](https://lnav.org/) ([documentation](https://docs.lnav.org/en/latest/))
`lnav` is our log-navigation solution of choice for navigating logs from the terminal

### [jless](https://jless.io/)
`jless` is used to facilitate browsing JSON payloads from specific log messages

### [jq](https://github.com/jqlang/jq) / [gojq](https://github.com/jqlang/jq)
`jq` is a powerful utility that bills itself as SQL for json
- `gojq` is the same jq library re-written in golang
- both commands are used in this script, depending on the context
- for the heavy lifting, `gojq` is on average 30% faster, so this is preferred

### [psql](https://www.postgresql.org/download/)
`psql` is used to interact with postgres servers both remotely and locally
- the version isn't really relevant here, this only reflects the version of the CLI tool, not the pg servers we'll be connecting to

### [flock](https://github.com/discoteq/flock)
`flock` is used to manage thread locks when running importer in parallel, and you'll want to run the importer in parallel

### [mprocs](https://github.com/pvolok/mprocs)
`mprocs` is used to manage multiple running services from a single terminal UI

### [wait-on](https://github.com/jeffbski/wait-on)
`wait-on` is used to handle dependencies between services, by waiting on resources to become available before continuing

### [ngrok](https://ngrok.com/)
`ngrok` is used to setup an SSL tunnel to your local paymentserver instance, to allow interaction with some 3rd party PSPs

### [shell2http](https://github.com/msoap/shell2http)
`shell2http` will start a local http server, exposing rest endpoints that can run specific shell commands
- we use this to make an http call from some services at the right time, and trigger actions such as activating a user, and adding fake balance to save time
