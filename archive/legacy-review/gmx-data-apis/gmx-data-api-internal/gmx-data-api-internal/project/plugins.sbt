
// Versioning
addSbtPlugin("com.typesafe.sbt" % "sbt-git" % "1.0.0")
addSbtPlugin("com.rallyhealth.sbt" % "sbt-git-versioning" % "1.6.0")

// Code Formatting & style
addSbtPlugin("org.scalameta" % "sbt-scalafmt" % "2.3.4")
addSbtPlugin("org.scalastyle" %% "scalastyle-sbt-plugin" % "1.0.0")

// Dependencies
addSbtPlugin("net.virtual-void" % "sbt-dependency-graph" % "0.10.0-RC1")

// Generate POJO from Avro
addSbtPlugin("com.cavorite" % "sbt-avro" % "2.1.1")
libraryDependencies += "org.apache.avro" % "avro-compiler" % "1.9.1"


// script generation
addSbtPlugin("gmx.sbt.plugin" % "sbt-kafka-scripts" % "0.2.3")