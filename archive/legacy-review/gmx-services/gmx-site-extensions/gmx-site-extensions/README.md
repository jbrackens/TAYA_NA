# gmx-site-extensions
Collection of APIs backing custom extensions on Betting Site 

Before submitting a PR, reformat code:
```shell script
sbt clean scalafmtAll scalafixAll
```

Verify code:
```shell script
sbt scalafmtCheckAll scalastyle "scalafixAll --check"
```
Verify dependencies:
```shell script
sbt dependencyCheckAggregate
```
 