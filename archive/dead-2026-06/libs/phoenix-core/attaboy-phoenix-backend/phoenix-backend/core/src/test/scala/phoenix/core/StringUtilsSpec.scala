package phoenix.core

import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.StringUtils.StringOps

class StringUtilsSpec extends AnyWordSpecLike with Matchers {

  "ensureEndsWith" should {
    "append required suffix when missing" in {
      "http://example.com".ensureEndsWith("/") mustBe "http://example.com/"
      "http://example.com/".ensureEndsWith("index.html") mustBe "http://example.com/index.html"
    }

    "do nothing when suffix is already present" in {
      "http://example.com".ensureEndsWith("") mustBe "http://example.com"
      "http://example.com/".ensureEndsWith("/") mustBe "http://example.com/"
      "http://example.com///".ensureEndsWith("/") mustBe "http://example.com///"
    }
  }

  "ensureDoesNotEndWith" should {
    "remove undesired suffix when present" in {
      "http://example.com/".ensureDoesNotEndWith("/") mustBe "http://example.com"
      "http://example.com////".ensureDoesNotEndWith("/") mustBe "http://example.com"
      "http://example.com+$(.)+$(.)".ensureDoesNotEndWith("+$(.)") mustBe "http://example.com"
    }

    "do nothing when suffix is already absent" in {
      "http://example.com".ensureDoesNotEndWith("/") mustBe "http://example.com"
      "http://example.com/".ensureDoesNotEndWith("index.html") mustBe "http://example.com/"
    }
  }
}
