organization := "com.flipsports"
name := "market-service"

val AkkaVersion = "2.6.8"
val AkkaHttpVersion = "10.2.0"
val AkkaManagementVersion = "1.0.8"
val LogbackVersion = "1.2.3"

libraryDependencies ++= Seq(
  "com.typesafe.akka" %% "akka-actor-typed"            % AkkaVersion,
  "com.typesafe.akka" %% "akka-cluster-typed"          % AkkaVersion,
  "com.typesafe.akka" %% "akka-cluster-sharding-typed" % AkkaVersion,
  "com.typesafe.akka" %% "akka-persistence-typed"      % AkkaVersion,
  "com.typesafe.akka" %% "akka-http"                   % AkkaHttpVersion,
  "com.typesafe.akka" %% "akka-http-spray-json"        % AkkaHttpVersion,
  "ch.qos.logback"     % "logback-classic"             % LogbackVersion
//  "com.lightbend.akka.management" %% "akka-management" % AkkaManagementVersion,
//  "com.lightbend.akka.discovery" %% "akka-discovery-kubernetes-api" % AkkaManagementVersion,
//  "com.typesafe.akka" %% "akka-discovery" % AkkaVersion,
//  "com.typesafe.akka" %% "akka-stream" % AkkaVersion,
)