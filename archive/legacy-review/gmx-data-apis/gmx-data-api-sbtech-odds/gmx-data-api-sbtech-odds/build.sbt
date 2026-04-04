import sbt._

val settings = Seq(
  organization := "net.flipsports.gmx.dataapi.sbtech.odds",
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

lazy val `gmx-data-api-sbtech-odds` = (project in file("."))
  .settings(settings)
  .aggregate(
    `common`,
    `events`,
    `markets`,
    `seletions`
  )

lazy val `common` = project
  .settings(settings)

lazy val `events` = project
  .settings(settings)
  .dependsOn(`common`)

lazy val `markets` = project
  .settings(settings)
  .dependsOn(`common`)


lazy val `seletions` = project
  .settings(settings)
  .dependsOn(`common`)