package stella.wallet.models.currency
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import stella.common.models.Ids.ProjectId

class UpdateCurrencyWithAssociatedProjectsRequestSpec extends AnyWordSpec with Matchers {

  "withAllowedAssociatedProjects" should {

    val project1 = ProjectId.random()
    val project2 = ProjectId.random()
    val project3 = ProjectId.random()
    val project4 = ProjectId.random()
    val project5 = ProjectId.random()

    "only keep projects allowed by the JWT token" in {
      val allowedProjects = Set(project1, project2, project4)
      val requestedProjects = List(project1, project2, project3)
      val existingAssociatedProjects = List(project1, project4, project5) // project5 added by super admin

      val request = UpdateCurrencyWithAssociatedProjectsRequest("name", "vName", "symbol", requestedProjects)
      request
        .withAllowedAssociatedProjects(existingAssociatedProjects, Some(allowedProjects))
        .associatedProjects should contain theSameElementsAs List(project1, project2, project5)
    }

    "return the original if allowedProjects is None" in {
      val requestedProjects = List(project1, project2, project3)
      val existingAssociatedProjects = List(project1, project4, project5)

      val request = UpdateCurrencyWithAssociatedProjectsRequest("name", "vName", "symbol", requestedProjects)
      request
        .withAllowedAssociatedProjects(existingAssociatedProjects, None)
        .associatedProjects shouldBe requestedProjects
    }

  }

}
