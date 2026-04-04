package stella.usercontext.it.utils

import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

case class TestAuthContext(
    userId: UserId = UserId.random(),
    primaryProjectId: ProjectId = ProjectId.random(),
    additionalProjectIds: Set[ProjectId] = Set(ProjectId.random()))
