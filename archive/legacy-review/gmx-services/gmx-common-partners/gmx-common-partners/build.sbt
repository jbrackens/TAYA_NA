lazy val `gmx-common-partners` = (project in file("."))
  .settings(commonSettings)
  .aggregate(
    `partner-commons`,
    `partner-atr`,
    `partner-rmg`,
    `partner-sis`,
    `partner-sbtech`
  )

lazy val `partner-commons` = (project in file("partner-commons"))
  .settings(commonSettings)
  .settings(libraryDependencies ++= Deps.partnerCommons)

lazy val `partner-atr` = (project in file("partner-atr"))
  .settings(commonSettings)
  .dependsOn(`partner-commons`)
  .settings(libraryDependencies ++= Deps.partnerAtr)

lazy val `partner-rmg` = (project in file("partner-rmg"))
  .settings(commonSettings)
  .dependsOn(`partner-commons`)
  .settings(libraryDependencies ++= Deps.partnerRmg)

lazy val `partner-sis` = (project in file("partner-sis"))
  .settings(commonSettings)
  .dependsOn(`partner-commons`)
  .settings(libraryDependencies ++= Deps.partnerSis)

lazy val `partner-sbtech` = (project in file("partner-sbtech"))
  .settings(commonSettings)
  .dependsOn(`partner-commons`)
  .settings(libraryDependencies ++= Deps.partnerSbtech)


val commonSettings = Seq(
  organization := "net.flipsports.gmx.common.internal.partner",
  scalaVersion := Versions.scalaVersion,
  classpathTypes += "maven-plugin",
  aggregate in update := false,
  resolvers ++= Seq(
    "Apache Development Snapshot Repository".at("https://repository.apache.org/content/repositories/snapshots/"),
    "Artima Maven Repository".at("http://repo.artima.com/releases"),
    "FS Maven Repository".at("https://lena-srv01.flipsports.net:4566/repository/maven-group/"),
    Resolver.mavenLocal),
  scalacOptions := Seq(
    "-feature",
    "-unchecked",
    "-deprecation",
    "-encoding",
    "utf8",
    "-language:experimental.macros",
    "-Xlint",
    "-Xmacro-settings:materialize-derivations"),
  publishTo := (isSnapshot.value match {
    case true => Some("snapshots".at("https://lena-srv01.flipsports.net:4566/repository/maven-snapshots/"))
    case false => Some("releases".at("https://lena-srv01.flipsports.net:4566/repository/maven-releases/"))
  })
)
