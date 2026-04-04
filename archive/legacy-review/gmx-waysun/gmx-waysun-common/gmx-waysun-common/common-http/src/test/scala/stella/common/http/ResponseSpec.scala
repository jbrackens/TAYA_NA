package stella.common.http

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import org.scalatestplus.scalacheck.ScalaCheckDrivenPropertyChecks

class ResponseSpec extends AnyFlatSpec with should.Matchers with ScalaCheckDrivenPropertyChecks {

  "Response" should "be properly created for success" in {
    val someDetails = "foo"
    val response = Response.asSuccess(someDetails)
    response.status shouldBe "ok"
    response.details shouldBe someDetails
  }

  it should "be properly created for failure" in {
    val someDetails = "bar"
    val response = Response.asFailure(someDetails)
    response.status shouldBe "error"
    response.details shouldBe someDetails
  }
}
