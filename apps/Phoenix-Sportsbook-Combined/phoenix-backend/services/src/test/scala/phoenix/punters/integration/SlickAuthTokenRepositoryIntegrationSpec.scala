package phoenix.punters.integration

import scala.concurrent.duration._

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.punters.infrastructure.SlickAccountVerificationCodeRepository
import phoenix.support.DataGenerator.randomUUID
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext
import phoenix.time.FakeHardcodedClock

final class SlickAuthTokenRepositoryIntegrationSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext {

  private val clock = new FakeHardcodedClock()

  val repository: SlickAccountVerificationCodeRepository = new SlickAccountVerificationCodeRepository(dbConfig, clock)

  "invalidate a verification code that has not been created" in {
    await(repository.validate(randomUUID())) shouldBe None
  }

  "validate a verification code that has been created" in {
    val token = await(repository.create(userID = randomUUID()))
    await(repository.validate(token.id)) shouldBe Some(token)
  }

  "invalidate expired verification code" in {
    val expiration = 2.second
    val token = await(repository.create(userID = randomUUID(), expiration))
    clock.setFixedTime(clock.currentOffsetDateTime().plusSeconds(expiration.toSeconds))
    await(repository.validate(token.id)) shouldBe Some(token)
    clock.setFixedTime(clock.currentOffsetDateTime().plusSeconds(1))
    await(repository.validate(token.id)) shouldBe None
  }

  "allow more than one verification code per user" in {
    val userID = randomUUID()
    val expiration = 2.second

    val token = await(repository.create(userID, expiration))
    await(repository.validate(token.id)) shouldBe Some(token)

    val token2 = await(repository.create(userID, expiration))
    await(repository.validate(token2.id)) shouldBe Some(token2)

    await(repository.validate(token.id)) shouldBe Some(token)
  }
}
