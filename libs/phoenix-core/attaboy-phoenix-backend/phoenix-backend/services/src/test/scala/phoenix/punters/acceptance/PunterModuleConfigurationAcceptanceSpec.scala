package phoenix.punters.acceptance

import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.punters.domain.CurrentTermsVersion
import phoenix.punters.domain.TermsDaysThreshold
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.KeycloakIntegrationSpec
import phoenix.support.ProductionLikeEnvironment

final class PunterModuleConfigurationAcceptanceSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with KeycloakIntegrationSpec
    with GivenWhenThen {

  val env = new ProductionLikeEnvironment(system, keycloakRealm.config, dbConfig)

  "A PunterModule" should {

    "have default terms" in {
      val defaultTerms = await(env.termsAndConditionsRepository.getCurrentTerms())

      defaultTerms.currentTermsVersion shouldBe CurrentTermsVersion(0)
      defaultTerms.termsDaysThreshold shouldBe TermsDaysThreshold(365)
    }
  }
}
