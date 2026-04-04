// The Lagom plugin
addSbtPlugin("com.lightbend.lagom" % "lagom-sbt-plugin" % "1.6.2")

// Git hash for versions
addSbtPlugin("com.dwijnand" % "sbt-dynver" % "3.3.0")

// Code formatting
addSbtPlugin("org.scalameta" % "sbt-scalafmt" % "2.3.4")
addSbtPlugin("ch.epfl.scala" % "sbt-scalafix" % "0.9.15")

// Gatling - load testing
addSbtPlugin("io.gatling" % "gatling-sbt" % "3.1.0")

// Paradox - documentation site
addSbtPlugin("com.lightbend.paradox" % "sbt-paradox" % "0.3.5")

// Kamon - monitoring
addSbtPlugin("io.kamon" % "sbt-kanela-runner-play-2.8" % "2.0.6")

// AVRO compilation
addSbtPlugin("com.julianpeeters" % "sbt-avrohugger" % "2.0.0-RC22")

// diagnosing dependency problems
addSbtPlugin("net.virtual-void" % "sbt-dependency-graph" % "0.10.0-RC1")