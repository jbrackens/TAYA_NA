package stella.rules.models.achievement.http

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class AchievementWebhookActionPayloadSpec extends AnyFlatSpec with should.Matchers {
  "matching URL" should "fail on incorrect URLs" in {
    List(".", "http", "http://", "https://", "http://a", "https://b.", "foo", "https:/example.com").foreach { url =>
      withClue(s"for url value $url") {
        AchievementWebhookActionPayload.urlRegex.matches(url) shouldBe false
      }
    }
  }

  it should "accept correct URLs" in {
    List(
      "www.sample.com",
      "http://a23-43.co.uk",
      "https://important_site.gov.pl/backdoor?admin_password=qwerty123&admin_name=admin").foreach { url =>
      withClue(s"for url value $url") {
        AchievementWebhookActionPayload.urlRegex.matches(url) shouldBe true
      }
    }
  }
}
