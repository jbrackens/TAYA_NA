resolvers += "Artima Maven Repository" at "https://repo.artima.com/releases"
resolvers += Resolver.bintrayIvyRepo("rallyhealth", "sbt-plugins")

addSbtPlugin("com.typesafe.play" % "sbt-plugin" % "2.6.15")

addSbtPlugin("com.eed3si9n" % "sbt-assembly" % "0.14.6")

addSbtPlugin("com.artima.supersafe" % "sbtplugin" % "1.1.8")

addSbtPlugin("com.rallyhealth.sbt" % "sbt-git-versioning" % "1.6.0")