resolvers += ("Artima Maven Repository" at "http://repo.artima.com/releases").withAllowInsecureProtocol(true)

addSbtPlugin("org.scalameta" % "sbt-scalafmt" % "2.2.1")
addSbtPlugin("com.artima.supersafe" % "sbtplugin" % "1.1.10")
