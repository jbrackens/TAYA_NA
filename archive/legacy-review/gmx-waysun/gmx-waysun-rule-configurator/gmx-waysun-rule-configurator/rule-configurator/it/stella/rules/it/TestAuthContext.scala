package stella.rules.it

import java.util.UUID

import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

case class TestAuthContext(
    fixedUserId: Option[UserId] = None,
    primaryProjectId: ProjectId = ProjectId.random(),
    additionalProjectIds: Set[UUID] = Set(ProjectId.random())) {
  def userId: UserId = fixedUserId.getOrElse(UserId.random())
}
