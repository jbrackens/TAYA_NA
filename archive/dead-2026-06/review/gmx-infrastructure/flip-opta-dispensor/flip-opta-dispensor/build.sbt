name := "flip-opta-dispensor"
organization := "com.flip"
version := "1.0-SNAPSHOT"

lazy val root = (project in file(".")).enablePlugins(PlayJava)

resolvers ++= Seq(
	"Local Maven Repository" at "file:///"+Path.userHome.absolutePath+"/.m2/repository",
	"Flipsports Snapshots Maven Repository" at "http://" + System.getenv().get("NEXUS_HOST") + "/repository/flip-central"
)

scalaVersion := "2.11.7"

libraryDependencies ++= Seq(
  javaJdbc,
  cache,
  javaWs,
  "biz.paluch.redis" % "lettuce" % "4.1.1.Final",
  "com.papertrailapp" % "logback-syslog4j" % "1.0.0"
)

// Custom publishing (so we can get the .zip and .tar.gz files onto Nexus
enablePlugins(UniversalDeployPlugin)

// Compile the project before generating Eclipse files, so that generated .scala or .class files for views and routes are present
EclipseKeys.preTasks := Seq(compile in Compile)

publishTo := {
  val nexus = "http://" + System.getenv().get("NEXUS_HOST") + "/"
  if (isSnapshot.value)
    Some("snapshots" at nexus + "repository/maven-snapshots")
  else
    Some("releases"  at nexus + "repository/maven-releases")
}

publishMavenStyle := true

publishArtifact in Test := false

pomIncludeRepository := { _ => false }

pomExtra := (
  <scm>
    <url>git@github.com:flipadmin/flip-opta-dispensor.git</url>
    <connection>scm:git:git@github.com:flip-opta-dispensor.git</connection>
  </scm>
  <developers>
    <developer>
      <id>xuloo</id>
      <name>Trevor Burton-McCreadie</name>
      <url>http://xuloo.cc</url>
    </developer>
  </developers>
)
