import sbt._


lazy val settings = Seq(organization := "net.flipsports.gmx.streaming.internal.engine",
  scalaVersion := Versions.scalaVersion,
  classpathTypes += "maven-plugin",
  aggregate in update := false,
  resolvers ++= Seq(
    "Apache Development Snapshot Repository" at "https://repository.apache.org/content/repositories/snapshots/",
    "Artima Maven Repository" at "https://repo.artima.com/releases",
    "FS Maven Repository" at "https://lena-srv01.flipsports.net:4566/repository/maven-group/",
    "Confluent" at "https://packages.confluent.io/maven/",
    Resolver.mavenLocal
  ),
  scalacOptions := Seq("-feature", "-unchecked", "-deprecation", "-encoding", "utf8", "-language:experimental.macros", "-Xlint", "-Xmacro-settings:materialize-derivations"),
  publishTo := (isSnapshot.value match {
    case true => Some("snapshots" at "https://lena-srv01.flipsports.net:4566/repository/maven-snapshots/")
    case false => Some("releases" at "https://lena-srv01.flipsports.net:4566/repository/maven-releases/")
  })
)

lazy val `gmx-streaming-data-engine` = (project in file("."))
  .settings(settings)
  .aggregate(`base`, `tests`)

lazy val `base` = project
  .settings(settings)
  .settings(libraryDependencies ++= Deps.commonStreamingEnging)

lazy val `tests` = project
  .settings(settings)
  .settings(libraryDependencies ++= Deps.testStreamingEngine)
  .dependsOn(`base`)
