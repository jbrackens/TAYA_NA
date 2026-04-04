package gmx.sbt.plugin.kafkascripts

import java.io.PrintWriter

import gmx.sbt.plugin.kafkascripts.registerschema.RegisterSchemaGenerator
import sbt.Keys._
import sbt.{AutoPlugin, Def, PluginTrigger, Plugins, Setting, plugins, _}
import sbt.internal.inc.classpath.ClasspathUtilities

object KafkaScriptsPlugin extends AutoPlugin {
  override val trigger: PluginTrigger = noTrigger
  override val requires: Plugins = plugins.JvmPlugin

  object autoImport extends KafkaScriptsKeys

  import autoImport._

  override lazy val projectSettings: Seq[Setting[_]] = Seq(
    kafkascriptsRegisterSchemaOutput := target.value / "register-schema.sh",
    kafkascriptsRegisterSchema := generateRegisterSchemaTask.value
  )

  private def generateRegisterSchemaTask: Def.Initialize[Task[Unit]] = Def.task {
    val log = sLog.value

    //prepare classloader - must be in Def.task body
    val analysis = (compile in Compile).value
    val classpath = (fullClasspath in Compile).value.map(_.data)
    log.info("Classpath is " + classpath.mkString("\n"))
    val classLoader = ClasspathUtilities.makeLoader(classpath, scalaInstance.value)

    //prepare target file
    val targetFile = kafkascriptsRegisterSchemaOutput.value
    log.info(s"Generating RegisterSchema to ${targetFile.getAbsolutePath}")
    targetFile.createNewFile()

    //generate script and write
    val script = new RegisterSchemaGenerator(classLoader).generateScript(kafkascriptsTopics.value)
    val writer = new PrintWriter(targetFile)
    writer.write(script)
    writer.close()
  }
}
