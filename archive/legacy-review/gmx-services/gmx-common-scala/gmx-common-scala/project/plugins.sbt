resolvers += "Artima Maven Repository".at("https://repo.artima.com/releases")
resolvers += Resolver.bintrayIvyRepo("rallyhealth", "sbt-plugins")

addSbtPlugin("org.scalameta" % "sbt-scalafmt" % "2.0.3")

addSbtPlugin("com.artima.supersafe" % "sbtplugin" % "1.1.7")

addSbtPlugin("com.typesafe.sbt" % "sbt-git" % "1.0.0")

addSbtPlugin("com.rallyhealth.sbt" % "sbt-git-versioning" % "1.6.0")
