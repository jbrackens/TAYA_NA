package phoenix.punters

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

class PunterProfileSpec extends AnyWordSpecLike with Matchers {

  "Active punter can do everything" in {
    // given
    val activePunter = PunterDataGenerator.Api.active()

    // then
    activePunter.permissions.canDeposit shouldBe true
    activePunter.permissions.canWithdraw shouldBe true
  }

  "Self excluded punter can only withdraw money" in {
    // given
    val selfExcluded = PunterDataGenerator.Api.selfExcluded()

    // then
    selfExcluded.permissions.canDeposit shouldBe false
    selfExcluded.permissions.canWithdraw shouldBe true
  }

  "Punter in cool off period can only withdraw money" in {
    // given
    val inCoolOff = PunterDataGenerator.Api.inCoolOff()
    // then
    inCoolOff.permissions.canDeposit shouldBe false
    inCoolOff.permissions.canWithdraw shouldBe true
  }

  "Suspended punter can't do anything at all" in {
    // given
    val suspended = PunterDataGenerator.Api.suspended()

    // then
    suspended.permissions.canDeposit shouldBe false
    suspended.permissions.canWithdraw shouldBe false
  }

  "Punter in Negative Balance can only deposit money" in {
    // given
    val suspended = PunterDataGenerator.Api.negativeBalance()

    // then
    suspended.permissions.canDeposit shouldBe true
    suspended.permissions.canWithdraw shouldBe false
  }
}
