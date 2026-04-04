//required for "com.rallyhealth.sbt" % "sbt-git-versioning"
resolvers += Resolver.bintrayIvyRepo("rallyhealth", "sbt-plugins")

addSbtPlugin("com.typesafe.sbt" % "sbt-git" % "1.0.0")

addSbtPlugin("com.rallyhealth.sbt" % "sbt-git-versioning" % "1.6.0")
