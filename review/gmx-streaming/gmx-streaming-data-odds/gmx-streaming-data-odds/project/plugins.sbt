resolvers ++= Seq(
  "Artima Maven Repository" at "https://repo.artima.com/releases",
  Resolver.bintrayIvyRepo("rallyhealth", "sbt-plugins"),
  "FS Maven Repository" at "https://lena-srv01.flipsports.net:4566/repository/maven-group/"
)

addSbtPlugin("com.typesafe.play" % "sbt-plugin" % "2.6.15")

addSbtPlugin("com.eed3si9n" % "sbt-assembly" % "0.14.6")

addSbtPlugin("com.artima.supersafe" % "sbtplugin" % "1.1.8")

addSbtPlugin("com.rallyhealth.sbt" % "sbt-git-versioning" % "1.6.0")

// generate kafka topic and schema reg scripts
addSbtPlugin("gmx.sbt.plugin" % "sbt-kafka-scripts" % "0.2.3")
