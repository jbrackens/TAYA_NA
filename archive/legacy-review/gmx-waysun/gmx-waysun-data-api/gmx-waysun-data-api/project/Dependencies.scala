import sbt._

object Dependencies {

  // @formatter:off
  object Versions {
    val scala212            = "2.12.15"
    val scala213            = "2.13.8"

    val avro                = "1.10.1"
    val scalaCheck          = "1.15.3"
    val scalaTest           = "3.2.5"
    val scalaTestScalaCheck = "3.2.6.0"
    val sealerate           = "0.0.6"
  }

  private val avroDeps = Seq(
    "org.apache.avro"   % "avro"             % Versions.avro
  )

  private val sealerateDeps = Seq(
    "ca.mrvisser"       %% "sealerate"       % Versions.sealerate
  )
  
  private val testingDeps = Seq(
    "org.scalacheck"    %% "scalacheck"      % Versions.scalaCheck,
    "org.scalatest"     %% "scalatest"       % Versions.scalaTest,
    "org.scalatestplus" %% "scalacheck-1-15" % Versions.scalaTestScalaCheck
  ).map(_ % Test)
  // @formatter:on

  val avroModuleDeps = avroDeps ++ testingDeps

  val validatorsDeps = sealerateDeps
}

object ScalafixDependencies {
  val organizeImports = "com.github.liancheng" %% "organize-imports" % "0.5.0"
}
