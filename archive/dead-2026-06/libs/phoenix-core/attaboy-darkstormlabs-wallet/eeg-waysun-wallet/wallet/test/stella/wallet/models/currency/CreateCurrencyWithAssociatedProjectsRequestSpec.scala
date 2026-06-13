package stella.wallet.models.currency
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import stella.common.models.Ids.ProjectId

class CreateCurrencyWithAssociatedProjectsRequestSpec extends AnyWordSpec with Matchers {

  "withAllowedAssociatedProjects" should {

    val project1 = ProjectId.random()
    val project2 = ProjectId.random()
    val project3 = ProjectId.random()
    val project4 = ProjectId.random()

    "only keep projects allowed by the JWT token" in {
      val allowedProjectIds = Set(project1, project2, project4)
      val requestedProjects = List(project1, project2, project3)

      val request = CreateCurrencyWithAssociatedProjectsRequest("name", "vName", "symbol", requestedProjects)
      request
        .withAllowedAssociatedProjects(Some(allowedProjectIds))
        .associatedProjects should contain theSameElementsAs List(project1, project2)
    }

    "keep everything when no allowedProjects restriction is in place" in {
      val requestedProjects = List(project1, project2, project3)

      val request = CreateCurrencyWithAssociatedProjectsRequest("name", "vName", "symbol", requestedProjects)
      request.withAllowedAssociatedProjects(None).associatedProjects shouldBe requestedProjects
    }

  }

}
