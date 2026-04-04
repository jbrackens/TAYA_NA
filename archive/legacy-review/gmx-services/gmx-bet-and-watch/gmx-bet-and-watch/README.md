# Bet and Watch
The server application that manages access to streaming (live video) content. Consists of 2 components:
  * [Web gateway](web-gateway/README.md)
  * [Events](events-impl/README.md) 

#### ToC
- [Integrations](#integrations)
- [Credentials and external access](#credentials-and-external-access)
	- [RMX OIDC](#rmx-oidc)
	- [ATR Sport Mediastream API](#atr-sport-mediastream-api)
	- [SBTech Odds Feed API](#sbtech-odds-feed-api)
	- [SBTech Data API](#sbtech-data-api)
- [Local development](#local-development)
- [API documentation](#api-documentation)
- [CI/CD](#cicd)
	- [Lab environment](#lab-environment)
	- [Prod environment](#prod-environment)


## Integrations
System:
  * is not using any dedicated storage, and all data is kept in memory
  * is consuming external APIs:
    * **RMX OIDC** - for authentication
    * **ATR Sport Mediastream API** - for available ATR events and streaming content
    * **SIS Stream API** - for available SIS events and streaming content
    * **SBTech Odds Feed API** - for available SBTech events
    * **SBTech Data API** - for user details and bets
  * requires environment variables listed in `.env.template`
  
  
## Credentials and external access
#### RMX OIDC
  * 1Password: **rmx:oidc:prod:predictor_game:user_info**
#### ATR Sport Mediastream API
  * application needs to have it's **IP whitelisted**
  * for `SMS_API_OPERATOR` use the first part of the string - before the first dot
  * 1Password: **SMS-Bet&Watch-PartnerDetails-RedZoneSports-V2-1**
  * 1Password: **SMS-Bet&Watch-PartnerDetails-SportNation-V2-1**
#### SIS Stream API
  * 1Password: **sis.tv:access:argyll**
#### SBTech Odds Feed API
  * application needs to have it's **IP whitelisted**
  * no credentials
#### SBTech Data API
  * 1Password: **sbtech:api:red-zone-sports**
  * 1Password: **sbtech:api:sport-nation**


## Local development
Run the project using:
```shell
sbt -jvm-debug 5005 runAll
```

Build docker images:
```shell
sbt clean test docker:publishLocal
```

Run locally:
```shell
docker-compose --compatibility up
```

You can create local copies of `.env.template`, files ending with `.env` will be ignored by git.
* To run the project locally all variables must be fulfilled. 
* For `APPLICATION_SECRET` and `ENCRYPT_USER_SEED` random string can be used during local use.
* For **RMG** provider both `MOBILE` and `DESKTOP` env variables must be fulfilled.
 
### Helpers
Printing dependency tree:
```
sbt dependencyBrowseTree
```

 
 
## API documentation
Operations are documented in [Postman collection](https://argyll-technologies.postman.co/collections/2998103-74771fbe-de97-438d-ae1d-728c9179c1ec)
with dedicated [environment](https://argyll-technologies.postman.co/environments/2998103-75e5725d-1e1e-4359-932c-a32b114c8236?workspace=13162850-7c09-4be1-8ac0-79f3294651c4).


## CI/CD
Build jobs run on [TeamCity](https://duna-srv01.argyll.tech:3333/project.html?projectId=GmxBetAndWatch) 

### Lab environment
API status [endpoint](https://bet-and-watch.dev.gmx.flipsports.net/info/health)

Task definitions and services configured in [GitHub](https://github.com/flipadmin/gmx-infra-orchestration-dev/tree/master/deployment/bet-and-watch-task-def)

Parameters/secrets stored in [System Manager](https://console.aws.amazon.com/systems-manager/parameters/?region=us-east-1#list_parameter_filters=Name:BeginsWith:%2Fgmx%2Fbet-and-watch)

Containers run on [ECS cluster](https://console.aws.amazon.com/ecs/home?region=us-east-1#/clusters/gmx-dev-bet-and-watch-cluster/services)

Application logs available in [ELK](https://yukong-srv01.flipsports.net:3535/app/kibana#/discover/3b014730-7d61-11e9-8061-8bdaab0eb98b?_g=h@cca5649&_a=h@7162130)

### Prod environment
API status [endpoint](https://bet-and-watch.prod.gmx.flipsports.net/info/health)

Task definitions and services configured in [GitHub](https://github.com/flipadmin/prod-gmx-infra-orchestration/tree/master/deployment/bet-and-watch-task-def)

Parameters/secrets stored in [System Manager](https://eu-west-1.console.aws.amazon.com/systems-manager/parameters/?region=eu-west-1#list_parameter_filters=Name:BeginsWith:%2Fgmx%2Fbet-and-watch)

Containers run on [ECS cluster](https://eu-west-1.console.aws.amazon.com/ecs/home?region=eu-west-1#/clusters/gmx-prod-bet-and-watch-cluster/services)

Application logs available in [ELK](https://yukong-srv01.flipsports.net:3535/app/kibana#/discover/3b014730-7d61-11e9-8061-8bdaab0eb98b?_g=h@cca5649&_a=h@f2abf94)
