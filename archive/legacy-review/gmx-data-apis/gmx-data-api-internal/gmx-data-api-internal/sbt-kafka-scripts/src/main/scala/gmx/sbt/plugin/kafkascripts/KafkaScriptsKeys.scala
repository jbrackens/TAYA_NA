package gmx.sbt.plugin.kafkascripts

import sbt.{File, settingKey, taskKey}

trait KafkaScriptsKeys {

  lazy val kafkascriptsTopics = settingKey[Seq[TopicSchema]]("Topic to Avro mapping")
  lazy val kafkascriptsRegisterSchemaOutput = settingKey[File]("Target file for generated RegisterSchema script")

  lazy val kafkascriptsRegisterSchema = taskKey[Unit]("Generates RegisterSchema script for given mappings")

}

case class TopicSchema private (topic: String, valueClass: String, keyClass: Option[String] = None)
