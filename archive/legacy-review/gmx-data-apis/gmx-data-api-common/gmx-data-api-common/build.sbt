import sbt._

val settings = Seq(
  organization := "net.flipsports.gmx.dataapi.internal.common",
  scalaVersion := Versions.scalaVersion,
  classpathTypes += "maven-plugin",
  aggregate in update := false,
  libraryDependencies ++= Deps.moduleDeps,
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

lazy val `gmx-data-api-common` = (project in file("."))
  .aggregate(`common-tools`, `common-core`)
  .settings(settings)

lazy val `common-core` = project
  .settings(settings)

lazy val `common-tools` = project
  .settings(settings)
  .dependsOn(`common-core`)