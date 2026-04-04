# idefix-term-utils
Collection of DX terminal utils for interacting with Idefix

Supported Platforms: Mac, Linux (_untested_), WSL (_untested_)


### `lnav` format installation
1. `lnav -i ./lnav/idefix_log.json`
2. Other helper files contained in `lnav` folder in this repo must be copied to `~/.config/lnav/installed` next to installed `idefix_log.json`

##### Dependencies
`jlessExpand.sh` is designed on `kitty` terminal and uses `kitty @ remote` to show results next to `lnav`.
Naturally, it depends on `jless` being installed. (`brew install jless`)


## `functions`

### lokinav
`knav` (using `stern`) is great for tailing logs in realtime from `kubectl`, but falls short for historical data, being limited to only logs from the longest running active pod in the deployment.
`lokinav` uses `logcli` to integrate directly with `loki`, which manages historical log aggregation. `logcli` essentially exposes the `grafana` query language within a CLI environment. `lokinav` builds on this by decorating the command with some nice-to-have features and simplifies the process of piping the raw logs to `lnav` in a way that is supported by the `idefix_log.json` format.
* _requirements_: `lnav`, `logcli`, `ruby` + `chronic` (`gem install --user-install chronic`)
* _usage_: `lokinav [options] [prod|dev] <container-regexes...>`
* _options_:
  * `--env` 'prod' | 'dev' _default: prod_
  * `--from` passed to `logcli`. ⭐️ _added [NLP](https://github.com/mojombo/chronic#examples) support_
  * `--to` passed to `logcli`. ⭐️ _added [NLP](https://github.com/mojombo/chronic#examples) support_
  * `--since` passed to `logcli`.
  * `--limit` passed to `logcli`.

_Refer to logcli option [reference](https://grafana.com/docs/loki/latest/tools/logcli/#logcli-command-reference) for info on options passed to logcli_

* _args_:
  * `[prod|dev]` first positional argument can be used to specify environment (instead of `--env` option)
  * `<container-regexes...>` space-separated phrases used in grafana query to match against container names
    * internally, these are transformed to: `".*$1.*|.*$2.*|etc.."`
* _examples_:
  * `lokinav --env=prod --from="2 weeks ago sat 7p" --to="1 week ago monday 10a" walletserver rewardserver luckydino`
  * `lokinav --from="3 hrs before last sat 7pm" --to="last sat 7pm" dev rewardserver affmore`
  * `lokinav --from="2021-01-19T10:00:00Z" --limit=100 paymentserver`
  * `lokinav --since="24h" dev gstech-backend`

### gsrelease
Creates a new release with auto-incremented version number and release notes
* Requires: gh
* Usage: (ideally master branch is checked-out)
````
  $(gsrelease)
````
### knav
Pipes log streams from multiple kube services into lnav
* Requires: lnav, stern, aws-vault (AWS/kubectl configured)
* Usage:
must be run from within an aws-vault authenticated shell
appropraite kubernetes context and namespace must be set beforehand
````
  knav dev-gstech-backend dev-luckydino-backend ...
````