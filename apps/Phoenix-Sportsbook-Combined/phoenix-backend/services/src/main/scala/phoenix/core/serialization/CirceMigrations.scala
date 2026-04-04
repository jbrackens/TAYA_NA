package phoenix.core.serialization

import io.circe.ACursor
import io.circe.HCursor
import io.circe.Json

import phoenix.core.serialization.CirceMigrations.versionFieldName

trait CirceMigrations[A] {
  def currentVersion: Int

  def transform(fromVersion: Int, json: ACursor): ACursor

  private[serialization] def decoderFunction(json: ACursor): ACursor = {
    val version = json.get[Int](versionFieldName).getOrElse(0)
    if (version < currentVersion)
      transform(version, json)
    else
      json
  }

  private[serialization] def encoderFunction(json: Json): Json = {
    HCursor.fromJson(json).withFocus(_.mapObject(_.add(versionFieldName, Json.fromInt(currentVersion)))).top.get
  }

}

object CirceMigrations {
  val versionFieldName = "phoenixVersion"

  def apply[T](migrations: CirceMigration*): CirceMigrations[T] =
    new CirceMigrations[T] {
      private val transformers = migrations

      override def currentVersion: Int = transformers.size

      override def transform(fromVersion: Int, json: ACursor): ACursor = {
        transformers.drop(fromVersion).foldLeft(json)((prev, migration) => migration(prev))
      }
    }
}
