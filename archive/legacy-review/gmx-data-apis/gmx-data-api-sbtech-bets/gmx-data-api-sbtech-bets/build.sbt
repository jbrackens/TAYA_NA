import sbt._

val settings = Seq(
  organization := "net.flipsports.gmx.dataapi.sbtech.bet",
  scalaVersion := Versions.scalaVersion,
  classpathTypes += "maven-plugin",
  aggregate in update := false,
  libraryDependencies ++= Deps.moduleDependencies,
  resolvers ++= Seq(
    "Apache Development Snapshot Repository" at "https://repository.apache.org/content/repositories/snapshots/",
    Resolver.mavenLocal,
    "FS Maven Repository" at "https://lena-srv01.flipsports.net:4566/repository/maven-group/"
  ),
  publishTo := (isSnapshot.value match {
    case true => Some("snapshots" at "https://lena-srv01.flipsports.net:4566/repository/maven-snapshots/")
    case false => Some("releases" at "https://lena-srv01.flipsports.net:4566/repository/maven-releases/")
  })
)

lazy val `gmx-data-api-sbtech-bets` = (project in file("."))
  .aggregate(
    `casino-bet`,
    `customer-detail`,
    `login`,
    `settlement-data`,
    `wallet-transaction`,
    `registration-abuse`,
    `offer-options`,
    `offer-events`
  )
  .settings(settings)

lazy val `casino-bet` = project
  .settings(settings)

lazy val `customer-detail` = project
  .settings(settings)

lazy val `login` = project
  .settings(settings)

lazy val `settlement-data` = project
  .settings(settings)

lazy val `wallet-transaction` = project
  .settings(settings)

lazy val `registration-abuse` = project
  .settings(settings)

lazy val `offer-options` = project
  .settings(settings)

lazy val `offer-events` = project
  .settings(settings)