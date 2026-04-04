import sbt._

val settings = Seq(
  organization := "net.flipsports.gmx.dataapi.idefix",
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

lazy val `gmx-data-api-idefix` = (project in file("."))
  .aggregate(
    `common`,
    `events`
  )
  .settings(settings)

lazy val `common` = project
  .settings(settings)

lazy val `events` = project
  .settings(settings)
  .settings(
    javacOptions ++= Seq("-Xlint:unchecked")
  )
  .dependsOn(`common`)

