package phoenix

import org.scalatest.BeforeAndAfterAll
import org.scalatest.wordspec.AnyWordSpecLike

trait TestUserPerSpec extends TestUser with AnyWordSpecLike with BeforeAndAfterAll with AsyncSupport with AuthRequests {
  lazy val testUser: User = randomUserWithFixedPassword()

  override protected def beforeAll(): Unit = {
    super.beforeAll()
    await(signUp(testUser))
  }
}
