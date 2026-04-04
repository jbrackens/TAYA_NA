resolvers += "FS Maven Repository".at("https://lena-srv01.flipsports.net:4566/repository/maven-group/")
resolvers += "Artima Maven Repository".at("https://repo.artima.com/releases")

addSbtPlugin("com.eed3si9n" % "sbt-assembly" % "1.1.0")

addSbtPlugin("com.artima.supersafe" % "sbtplugin" % "1.1.12")

// Versioning
addSbtPlugin("com.rallyhealth.sbt" % "sbt-git-versioning" % "1.6.0")

// Code Formatting
addSbtPlugin("org.scalameta" % "sbt-scalafmt" % "2.4.2")

// Code Style Check
addSbtPlugin("org.scalastyle" %% "scalastyle-sbt-plugin" % "1.0.0")

// generate kafka topic and schema reg scripts
addSbtPlugin("gmx.sbt.plugin" % "sbt-kafka-scripts" % "0.2.3")
