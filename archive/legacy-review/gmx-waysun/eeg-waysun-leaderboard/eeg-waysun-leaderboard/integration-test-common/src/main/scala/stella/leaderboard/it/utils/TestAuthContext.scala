package stella.leaderboard.it.utils

import java.util.UUID

import stella.common.models.Ids.ProjectId

case class TestAuthContext(
    fixedUserId: Option[UUID] = None,
    primaryProjectId: ProjectId = ProjectId.random(),
    additionalProjectIds: Set[ProjectId] = Set(ProjectId.random())) {
  def userId: UUID = fixedUserId.getOrElse(UUID.randomUUID())
}
