// Docker
addSbtPlugin("com.typesafe.sbt" % "sbt-native-packager" % "1.7.4")

// Versioning
addSbtPlugin("com.dwijnand" % "sbt-dynver" % "4.1.1")

// Code Formatting
addSbtPlugin("org.scalameta" % "sbt-scalafmt" % "2.3.4")

// Import ordering, refactoring and linting
addSbtPlugin("ch.epfl.scala" % "sbt-scalafix" % "0.9.24")

// Documentation via mdoc and docusaurus
addSbtPlugin("org.scalameta" % "sbt-mdoc" % "2.2.5")

// Code Style Check
addSbtPlugin("org.scalastyle" %% "scalastyle-sbt-plugin" % "1.0.0")

// Dependency security scanning
addSbtPlugin("net.vonbuchholtz" % "sbt-dependency-check" % "2.0.0")

// Dependency tree
addSbtPlugin("net.virtual-void" % "sbt-dependency-graph" % "0.10.0-RC1")

// FIXME remove when legacy module will be removed
addSbtPlugin("de.johoop" % "sbt-testng-plugin" % "3.1.1")