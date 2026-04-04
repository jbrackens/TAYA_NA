# Predictor Game
The server application running the Predictor Game using Game Matrix Platform. Consists of 3 components:
 * [Web gateway](webgateway/README.md)
 * [Event processor](eventprocessor/README.md) 
 * [Admin](admin/README.md) 
 
#### ToC
- [Integrations](#integrations)
- [Credentials and external access](#credentials-and-external-access)
	- [Postgresql database](#postgresql-database)
	- [GMX Kafka](#gmx-kafka)
	- [RMX OIDC](#rmx-oidc)
- [Local development](#local-development)
	- [Infrastructure](#infrastructure)
		- [Database migrations](#database-migrations)
		- [Slick mappings](#slick-mappings)
- [API documentation](#api-documentation)
	- [Swagger UI](#swagger-ui)
- [CI/CD](#cicd)
	- [Lab environment](#lab-environment)
	- [Prod environment](#prod-environment)


## Integrations
System:
  * is using dedicated Postgresql database for all components
  * subscribes to GMX Kafka to get event updates
  * is consuming external APIs:
    * **RMX OIDC** - for authentication
  * requires environment variables listed in `.env.template`


## Credentials and external access
#### Postgresql database
  * 1Password: **db:aws:gmx-prod:prod-gmx-rds-eu_west_1:::predictor:fs-rmx:eu-west-1**
  * 1Password: **db:dev-gmx-rds-us_east_1**
#### GMX Kafka
  * TODO
#### RMX OIDC
  * 1Password: **rmx:oidc:prod:predictor_game:user_info**
  
  
## Local development
To build project, generate docker images and run all containers:
```shell
./gradlew -i clean test testPlayBinary dist docker dockerTag dockerComposeUp 
```
You can create local copies of `.env.template`, files ending with `.env` will be ignored by git.

### Infrastructure
For development you can use docker images of Postgresql and Kafka:
```shell
docker-compose -f docker-compose-local-infrastructure.yml up 
```
#### Database migrations
Database schema is maintained with Flyway. To update the schema you would need to:
```shell
./gradlew -i flywayMigrate
``` 
For more operations, check: [https://flywaydb.org/documentation/gradle/]()
#### Slick mappings
To speed up development Slick mappings are generated. To run code generation based on local schema use: 
```shell
./gradlew -i generateSlick
```
Currently sources are added to the version control, because code generation requires running DB, and is executed manually.
Later it would be good to regenerate sources during the build using in memory DB with current version of scripts.


## API documentation
Operations are documented in [Postman collection](https://argyll-technologies.postman.co/collections/168829-e0d8cc10-487a-4496-80c4-4bf54a2a072b)
with dedicated [environment](https://argyll-technologies.postman.co/environments/2998103-4253f267-5e6f-4d60-bf16-9a5cad4ee57d?workspace=13162850-7c09-4be1-8ac0-79f3294651c4).
#### Swagger UI 
All endpoints available in the `webgateway` are listed as [JSON](http://localhost:9000/docs/swagger.json)
and available in [swagger UI](http://localhost:9000/docs/swagger-ui/index.html?url=/docs/swagger.json).


## CI/CD
Build jobs run on [TeamCity](https://duna-srv01.argyll.tech:3333/project.html?projectId=GmxPredictorGame) 

### Lab environment
API status [endpoint](https://predictor.dev.argyll.tech/api/v3/sports/HORSE_RACING/competitions/ITV_RACES) - _should be changed to REAL health in future_.

Task definitions and services configured in [GitHub](https://github.com/flipadmin/gmx-infra-orchestration-dev/tree/master/deployment/predictor-game-task-def)

Parameters/secrets stored in [System Manager](https://console.aws.amazon.com/systems-manager/parameters/?region=us-east-1#list_parameter_filters=Name:BeginsWith:%2Fgmx%2Fpredictor-game%2Fdev%2F)

Containers run on [ECS cluster](https://console.aws.amazon.com/ecs/home?region=us-east-1#/clusters/gmx-dev-predictor-game-cluster/services)

Application logs available in [ELK](https://yukong-srv01.flipsports.net:3535/app/kibana#/discover/cbcfeaf0-7cd5-11e9-8061-8bdaab0eb98b)

### Prod environment
API status [endpoint](https://predictor.prod.argyll.tech/api/v3/sports/HORSE_RACING/competitions/ITV_RACES) - _should be changed to REAL health in future_.

Task definitions and services configured in [GitHub](https://github.com/flipadmin/prod-gmx-infra-orchestration/tree/master/deployment/predictor-task-def)

Parameters/secrets stored in [System Manager](https://eu-west-1.console.aws.amazon.com/systems-manager/parameters/?region=eu-west-1#list_parameter_filters=Name:BeginsWith:%2Fgmx%2Fpredictor)

Containers run on [ECS cluster](https://eu-west-1.console.aws.amazon.com/ecs/home?region=eu-west-1#/clusters/gmx-prod-predictor-cluster/services)

Application logs available in [ELK](https://yukong-srv01.flipsports.net:3535/app/kibana#/discover/cbcfeaf0-7cd5-11e9-8061-8bdaab0eb98b)

### Preparing Pick-a-Pony races
First step for generating PaP races is to download `.csv` file from person responsible for Horse Racing from Argyll.

The file should be in the following format:
 * The file name should have format: `YYYY:MM:DD.csv` - The date from the file name determines what day the races will take place
 * The content of the file should contain league names and the hours at which event is taking place in the following format: `leagueName,hours(HH:MM)`
 
Next step is to provide access from your local machine to GMX_PROD_NEXT_RACE DB (1Password: **db:aws:gmx-prod:gmx-prod-argyll-next-race-database:::argyll-next-race:fs-rmx:eu-west-1**)
 
When access for DB is granted script for generating PaP races needs to be executed with proper argument(`.csv` file from step one)
Script is located in different project `argyll-video-service`: [GeneratePredictorSeed](https://github.com/flipadmin/argyll-video-service/blob/develop/tools/src/main/java/tech/argyll/video/tools/predictor/GeneratePredictorSeed.java)
 
Result of executed script will be printed out to the console in the following format:
```shell
('UUID', 'start_datetime', 'status', 'winner', 'round_id', 'selection_a_id', '{ selection_a_details }', 'selection_b_id', '{ selection_b_details }', '{ event_details }'),
```
Number of generated PaP races is determined by number of events from `.csv` file

Next step is to copy all results from executed script to corresponding `utils.src.main.resources.db.seed.seed_xxx.sql` file. Destination where to copy results depends on the type of races which was preapre (test_races, itv_races, cheltenham_races).
This `.sql` file job is to create proper events in the DB. But before we can execute this sql inside DB, one more thing need to be created.


Inside sql file that contains same type of races as first sql file `domain.src.main.resources.db.migration.R__X_config_xxx.sql` proper round need to be created.

Structure of round looks like below:
```shell
(id, competition_id, number, start_time, end_time, pick_deadline)
```
Following format of round need to be implemented:
 * `id` - random UUID generated for this particular round (UUID script can be used to generate this: `utils.src.scala.tech.argyll.gmx.predictor.utils.seed.UUID`)
 * `competition_id` - proper competition name for particular round name
 * `number` - number of round (order increasing by one)
 * `start_time`, `end_time` - start and end time of each round, also those timeframes represents if particular round is the default one (take into account all events generated)
 * `pick_deadline` - is used to lock new picks from users on given round. We can eg allow changes for new selections during the round or block this before it starts
 
 If all required data is fulfilled in terms of round, `R__X_config_xxx.sql` file can be executed on the Predictor DB.
 
 Subsequently proper `round_id` need to be set on for every race inside `seed_xxx.sql` (Races generated by GeneratePredictorSeed has `SET_ROUND_ID` value as `round_id`) So UUID generated in previous step as `id` for round need to be copied to each race for the same round.
 
 If every required fields are fulfilled `.sql` file can be executed on the Predictor  DB. 
 
 Now PaP race should be updated on the side [PaP]("https://www.sportnation.bet/pick-a-pony/"). Of course they need to be enabled by the front-end
 
 