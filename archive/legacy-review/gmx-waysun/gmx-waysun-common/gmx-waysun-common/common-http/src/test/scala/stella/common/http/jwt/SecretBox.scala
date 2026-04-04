package stella.common.http.jwt

import java.util.UUID

import spray.json.RootJsonFormat

import stella.common.http.instances._
import stella.common.models.Ids.ProjectId

final case class SecretBox(orig: UUID, jpk: Set[String], primaryProject: ProjectId, additionalProjects: Set[ProjectId])

object SecretBox {
  val secretBoxFormat: RootJsonFormat[SecretBox] = jsonFormat4(SecretBox.apply)
}
