import sbt._

object Dependencies {

  // @formatter:off
  object Versions {
    val scala212                  = "2.12.15"
    val scala213                  = "2.13.8"

    val avro                      = "1.10.1"
    val caffeine                  = "3.0.6"
    val cats                      = "2.7.0"
    val jackson                   = "2.13.2"
    val janino                    = "3.1.6"
    val jose4j                    = "0.7.11"
    val jna                       = "5.10.0"
    val kafkaClient               = "2.3.1"
    val kafkaAvroSerializer       = "5.3.1"
    val kafkaSchemaRegistryClient = "5.3.1"
    val kebs                      = "1.9.4"
    val lazySodium                = "5.1.1"
    val logback                   = "1.2.11"
    val logstashLogbackEncoder    = "7.0.1"
    val playJson                  = "2.8.2"
    val playRedis                 = "2.7.0"
    val pureConfig                = "0.17.1"
    val scaffeine                 = "5.1.2"
    val scalaCheck                = "1.15.4"
    val scalaCollectionCompat     = "2.7.0" // for Scala 2.12 cross-compilation
    val scalaMock                 = "5.2.0"
    val scalaTest                 = "3.2.11"
    val scalaTestScalaCheck       = "3.2.11.0"
    val sealerate                 = "0.0.6"
    val slf4jApi                  = "1.7.36"
    val sttp                      = "3.5.1"
    val tapir                     = "1.0.0-M8"
    val typesafeConfig            = "1.4.2"
  }

  private val catsDeps = Seq(
    "org.typelevel"                 %% "cats-core"                   % Versions.cats
  )

  private val jacksonDeps = Seq(
    "com.fasterxml.jackson.core"    % "jackson-annotations"          % Versions.jackson,
    "com.fasterxml.jackson.core"    % "jackson-core"                 % Versions.jackson,
    "com.fasterxml.jackson.core"    % "jackson-databind"             % Versions.jackson
  )

  private val jose4j = Seq(
    "org.bitbucket.b_c"             % "jose4j"                       % Versions.jose4j
  )

  private val kafkaDeps = Seq(
    "org.apache.avro"               % "avro"                         % Versions.avro,
    "org.apache.kafka"              % "kafka-clients"                % Versions.kafkaClient,
    "io.confluent"                  % "kafka-avro-serializer"        % Versions.kafkaAvroSerializer,
    "io.confluent"                  % "kafka-schema-registry-client" % Versions.kafkaSchemaRegistryClient
  )

  private val kebsDeps = Seq(
    "pl.iterators"                  %% "kebs-tagged"                 % Versions.kebs,
    "pl.iterators"                  %% "kebs-tagged-meta"            % Versions.kebs
  )

  private val lazySodiumDeps = Seq(
    ("com.goterl"                   % "lazysodium-java"              % Versions.lazySodium)
      .exclude("org.slf4j", "slf4j-api"),
    "net.java.dev.jna"              % "jna"                          % Versions.jna
  )

  private lazy val loggingDeps = Seq(
    "ch.qos.logback"                % "logback-classic"              % Versions.logback,
    "net.logstash.logback"          % "logstash-logback-encoder"     % Versions.logstashLogbackEncoder,
    "org.codehaus.janino"           % "janino"                       % Versions.janino // for conditional statements in logback.xml
  ) ++ slf4jDeps
  
  private val playJsonDeps = Seq(
    "com.typesafe.play"             %% "play-json"                   % Versions.playJson
  )

  private val playRedisDeps = Seq(
    ("com.github.karelcemus"        %% "play-redis"                  % Versions.playRedis)
      .exclude("com.typesafe.akka", "akka-actor")
  )

  private lazy val pureConfigDeps = Seq(
    "com.github.pureconfig"         %% "pureconfig"                  % Versions.pureConfig
  ) ++ typesafeConfigDeps

  private val scaffeineDeps = Seq(
    "com.github.ben-manes.caffeine" % "caffeine"                     % Versions.caffeine,
    "com.github.blemale"            %% "scaffeine"                   % Versions.scaffeine
  )

  private val scalacheck = Seq(
    "org.scalacheck"                %% "scalacheck"                  % Versions.scalaCheck,
  )

  private val scalaCollectionCompatDeps = Seq(
    "org.scala-lang.modules"        %% "scala-collection-compat"     % Versions.scalaCollectionCompat
  )

  private val sealerateDeps = Seq(
    "ca.mrvisser"                   %% "sealerate"                   % Versions.sealerate
  )

  private val slf4jDeps = Seq(
    "org.slf4j"                     % "slf4j-api"                    % Versions.slf4jApi
  )

  private val sttpDeps = Seq(
    "com.softwaremill.sttp.client3" %% "core"                        % Versions.sttp,
    "com.softwaremill.sttp.client3" %% "spray-json"                  % Versions.sttp
  )

  private val tapirDeps = Seq(
    "com.softwaremill.sttp.tapir"   %% "tapir-core"                  % Versions.tapir,
    "com.softwaremill.sttp.tapir"   %% "tapir-json-spray"            % Versions.tapir,
    "com.softwaremill.sttp.tapir"   %% "tapir-openapi-circe-yaml"    % Versions.tapir,
    "com.softwaremill.sttp.tapir"   %% "tapir-openapi-docs"          % Versions.tapir,
    "com.softwaremill.sttp.tapir"   %% "tapir-server"                % Versions.tapir
  )

  private val testingDeps = (Seq(
    "org.scalamock"                 %% "scalamock"                   % Versions.scalaMock,
    "org.scalatest"                 %% "scalatest"                   % Versions.scalaTest,
    "org.scalatestplus"             %% "scalacheck-1-15"             % Versions.scalaTestScalaCheck
  ) ++ scalacheck).map(_ % Test)

  private val typesafeConfigDeps = Seq(
    "com.typesafe"                 % "config"                       % Versions.typesafeConfig
  )
  // @formatter:on

  val commonCoreDeps = pureConfigDeps

  val commonHttpDeps =
    catsDeps ++
    jacksonDeps ++
    jose4j ++
    lazySodiumDeps ++
    loggingDeps ++
    kebsDeps ++
    playRedisDeps ++
    scaffeineDeps ++
    scalaCollectionCompatDeps ++
    sealerateDeps ++
    sttpDeps ++
    tapirDeps ++
    testingDeps ++
    typesafeConfigDeps

  val commonKafkaDeps = catsDeps ++ jacksonDeps ++ kafkaDeps ++ slf4jDeps ++ testingDeps

  val commonPlayTestUtilsDeps = playRedisDeps ++ testingDeps ++ typesafeConfigDeps

  val commonModelsDeps = pureConfigDeps ++ kebsDeps

  val commonTestDeps = kebsDeps ++ playJsonDeps ++ scalacheck
}

object ScalafixDependencies {
  val organizeImports = "com.github.liancheng" %% "organize-imports" % "0.4.4"
}
