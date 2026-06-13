package flip

import sbt._
import sbt.Keys._

/**
 * Generate version.conf and akka/Version.scala files based on the version setting.
 */
object VersionGenerator {

  val settings: Seq[Setting[_]] = inConfig(Compile)(Seq(
    resourceGenerators += generateVersion(resourceManaged, _ / "version.conf",
      """|version = "%s"
         |"""),
    sourceGenerators += generateVersion(sourceManaged, _ / "gmx" / "users" / "Version.scala",
      """|package gmx.users
         |
         |object Version {
         |  val current: String = "%s"
         |}
         |""")))

  def generateVersion(dir: SettingKey[File], locate: File => File, template: String) = Def.task[Seq[File]] {
    val file = locate(dir.value)
    val content = template.stripMargin.format(version.value)
    if (!file.exists || IO.read(file) != content) IO.write(file, content)
    Seq(file)
  }

}