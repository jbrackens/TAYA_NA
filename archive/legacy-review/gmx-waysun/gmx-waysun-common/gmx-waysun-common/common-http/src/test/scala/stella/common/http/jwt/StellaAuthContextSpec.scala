package stella.common.http.jwt

import org.scalatest.matchers.should
import org.scalatest.wordspec.AsyncWordSpec
import sttp.model.StatusCode

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

class StellaAuthContextSpec extends AsyncWordSpec with should.Matchers {

  private val primaryProjectId = ProjectId.random()
  private val additionalProjectId1 = ProjectId.random()
  private val additionalProjectId2 = ProjectId.random()

  private val authContext = StellaAuthContext(
    permissions = FullyPermissivePermissions,
    userId = UserId.random(),
    primaryProjectId = primaryProjectId,
    additionalProjectIds = Set(additionalProjectId1, additionalProjectId2))

  private val authContextWithoutAdditionalProjects = authContext.copy(additionalProjectIds = Set.empty)

  private val verificationSuccess = Right(())

  private val verificationFailure =
    Left(StatusCode.Forbidden -> Response.asFailure(ErrorOutput.one(PresentationErrorCode.Forbidden)))

  "verifyUserHasAccessToProject" should {
    "succeed for primary project when there are additional projects in auth context" in {
      authContext.verifyUserHasAccessToProject(authContext.primaryProjectId).value.map {
        _ shouldBe verificationSuccess
      }
    }

    "succeed for primary project when there are no additional projects in auth context" in {
      authContextWithoutAdditionalProjects.verifyUserHasAccessToProject(authContext.primaryProjectId).value.map {
        _ shouldBe verificationSuccess
      }
    }

    "succeed for first additional project" in {
      authContext.verifyUserHasAccessToProject(additionalProjectId1).value.map(_ shouldBe verificationSuccess)
    }

    "succeed for other additional project" in {
      authContext.verifyUserHasAccessToProject(additionalProjectId2).value.map(_ shouldBe verificationSuccess)
    }

    "fail for project not included in auth context when there are additional projects in auth context" in {
      val otherProjectId = ProjectId.random()
      authContext.verifyUserHasAccessToProject(otherProjectId).value.map {
        _ shouldBe verificationFailure
      }
    }

    "fail for project not included in auth context when there are no additional projects in auth context" in {
      val otherProjectId = ProjectId.random()
      authContextWithoutAdditionalProjects.verifyUserHasAccessToProject(otherProjectId).value.map {
        _ shouldBe verificationFailure
      }
    }
  }
}
