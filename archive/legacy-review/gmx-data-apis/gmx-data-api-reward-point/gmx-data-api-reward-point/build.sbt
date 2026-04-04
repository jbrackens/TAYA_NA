import sbt._

val settings = Seq(
  organization := "net.flipsports.gmx.dataapi.internal.rewardpoints",
  scalaVersion := Versions.scalaVersion,
  classpathTypes += "maven-plugin",
  aggregate in update := false,
  resolvers ++= Seq(
    "Apache Development Snapshot Repository" at "https://repository.apache.org/content/repositories/snapshots/",
    Resolver.mavenLocal,
    "FS Maven Repository" at "https://lena-srv01.flipsports.net:4566/repository/maven-group/"
  ),
  publishTo := (isSnapshot.value match {
    case true => Some("snapshots" at "https://lena-srv01.flipsports.net:4566/repository/maven-snapshots/")
    case false => Some("releases" at "https://lena-srv01.flipsports.net:4566/repository/maven-releases/")
  }),
  libraryDependencies ++= Deps.moduleDependencies
)

lazy val `gmx-data-api-reward-point` = (project in file("."))
  .aggregate(
    `reward-calculator`
  )
  .settings(settings)

lazy val `reward-calculator` = project
  .settings(settings)


