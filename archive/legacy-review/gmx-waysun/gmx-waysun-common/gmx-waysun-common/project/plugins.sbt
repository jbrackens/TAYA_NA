// Versioning
addSbtPlugin("com.rallyhealth.sbt" % "sbt-git-versioning" % "1.6.0")

// Import ordering, refactoring and linting
addSbtPlugin("ch.epfl.scala" % "sbt-scalafix" % "0.9.34")

// Dependency tree
addDependencyTreePlugin

// Code Formatting
addSbtPlugin("org.scalameta" % "sbt-scalafmt" % "2.4.6")

// Code Style Check
addSbtPlugin("org.scalastyle" %% "scalastyle-sbt-plugin" % "1.0.0")
