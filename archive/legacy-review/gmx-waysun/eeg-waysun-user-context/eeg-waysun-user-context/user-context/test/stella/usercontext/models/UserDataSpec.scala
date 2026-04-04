package stella.usercontext.models

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import stella.usercontext.models.UserContextState.UserData
import stella.usercontext.routes.SampleObjectFactory.JsonModificationData._

class UserDataSpec extends AnyFlatSpec with Matchers {

  "UserData" should "drop null values" in {
    val userData = UserData(initialJson)
    userData.value shouldBe initialJsonWithoutNulls
  }

  it should "merge JSON values properly" in {
    val userData = UserData(initialJson).mergedWith(jsonDiff)
    userData.value shouldBe finalJson
  }
}
