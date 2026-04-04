package stella.usercontext.routes

import sttp.tapir._

import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.usercontext.models.Ids.ProjectIdInstances.projectIdCodec
import stella.usercontext.models.Ids.UserIdInstances.userIdCodec

object PathsAndParams {
  val basePath: String = "user_context"
  val userIdPathParam: String = "user_id"
  val projectIdPathParam: String = "project_public_id"
  val adminPath: EndpointInput[(ProjectId, UserId)] =
    basePath / "admin" / path[ProjectId](projectIdPathParam) / path[UserId](userIdPathParam)
}
