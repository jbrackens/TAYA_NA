resolvers += "Artima Maven Repository" at "https://repo.artima.com/releases"
resolvers += Resolver.bintrayIvyRepo("rallyhealth", "sbt-plugins")

addSbtPlugin("com.typesafe.play" % "sbt-plugin" % "2.6.15")

addSbtPlugin("com.cavorite" % "sbt-avro-1-9" % "1.1.9")

addSbtPlugin("com.rallyhealth.sbt" % "sbt-git-versioning" % "1.6.0")
