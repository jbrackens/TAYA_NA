resolvers += "Artima Maven Repository" at "https://repo.artima.com/releases"
resolvers += Resolver.bintrayIvyRepo("rallyhealth", "sbt-plugins")

//TODO GM-915: causes dependencies problem with Lagom ;/
//addSbtPlugin("io.get-coursier" % "sbt-coursier" % "1.0.3")

addSbtPlugin("au.com.onegeek" %% "sbt-dotenv" % "2.0.117")

addSbtPlugin("com.eed3si9n" % "sbt-buildinfo" % "0.7.0")

addSbtPlugin("com.artima.supersafe" % "sbtplugin" % "1.1.7")

addSbtPlugin("com.typesafe.sbt" % "sbt-git" % "1.0.0")

addSbtPlugin("com.rallyhealth.sbt" % "sbt-git-versioning" % "1.6.0")

addSbtPlugin("com.lightbend.lagom" % "lagom-sbt-plugin" % "1.5.1")
addSbtPlugin("com.typesafe.sbt" % "sbt-native-packager" % "1.3.23")

addSbtPlugin("net.virtual-void" % "sbt-dependency-graph" % "0.10.0-RC1")
