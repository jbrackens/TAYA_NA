// Docker
addSbtPlugin("com.typesafe.sbt" % "sbt-native-packager" % "1.8.1")

// Versioning
addSbtPlugin("com.dwijnand" % "sbt-dynver" % "4.1.1")

// Code Formatting
addSbtPlugin("org.scalameta" % "sbt-scalafmt" % "2.4.6")

// Import ordering, refactoring and linting
addSbtPlugin("ch.epfl.scala" % "sbt-scalafix" % "0.9.34")

// Integration/Load Testing
addSbtPlugin("io.gatling" % "gatling-sbt" % "4.1.6")

// Dependency tree (built-in, replaced sbt-dependency-graph since sbt 1.4)
addDependencyTreePlugin

// Code Style Check
addSbtPlugin("org.scalastyle" %% "scalastyle-sbt-plugin" % "1.0.0")

// Cloudflow
addSbtPlugin("com.lightbend.cloudflow" % "sbt-cloudflow" % "2.3.1")

// Env variables
addSbtPlugin("au.com.onegeek" %% "sbt-dotenv" % "2.1.233")

// Make Akka serialization runtime-safe
addSbtPlugin("org.virtuslab.ash" % "sbt-akka-serialization-helper" % "0.6.0")

// Kanela runner for Kamon instrumentation
addSbtPlugin("io.kamon" % "sbt-kanela-runner" % "2.0.14")

// Generate Scala case classes and ADTs from Apache Avro schemas, datafiles, and protocols
addSbtPlugin("com.julianpeeters" % "sbt-avrohugger" % "2.0.0")
