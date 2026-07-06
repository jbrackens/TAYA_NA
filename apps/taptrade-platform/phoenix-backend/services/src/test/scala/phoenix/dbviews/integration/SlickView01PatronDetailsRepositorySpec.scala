package phoenix.dbviews.integration

import java.time.OffsetDateTime
import java.time.temporal.ChronoUnit

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike
import slick.lifted.TableQuery

import phoenix.core.Clock
import phoenix.core.deployment.DeploymentClock
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.dbviews.domain.model.Constants.defaultGeoId
import phoenix.dbviews.domain.model._
import phoenix.dbviews.infrastructure.SlickView01PatronDetailsRepository
import phoenix.punters.PunterEntity
import phoenix.punters.domain.Country
import phoenix.punters.domain.DUPI
import phoenix.shared.support.TimeSupport.deploymentConfig
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.support.UserGenerator.generateAddress
import phoenix.support.UserGenerator.generatePersonalDetails
import phoenix.support.UserGenerator.generateSocialSecurityNumber

class SlickView01PatronDetailsRepositorySpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec {
  import dbConfig.db
  import SlickView01PatronDetailsRepository.PatronDetailsWithEasternTime.withEasternTime

  val clock = Clock.utcClock
  val easternClock = DeploymentClock.fromConfig(deploymentConfig)
  val puntersViewRepository: SlickView01PatronDetailsRepository =
    new SlickView01PatronDetailsRepository(dbConfig, easternClock)
  val query = TableQuery[SlickView01PatronDetailsRepository.PatronDetailsTable]

  "SlickView01PatronDetailsRepository" should {
    "store details" in {
      await(db.run(query.delete))
      val patronDetails1 = generatePatronDetails(PunterEntity.PunterId("aPunter"))
      val patronDetails2 = generatePatronDetails(PunterEntity.PunterId("bPunter"))
      await(puntersViewRepository.upsert(patronDetails1))
      await(puntersViewRepository.upsert(patronDetails2))
      val stored = await(db.run(query.result))
      stored.sortBy(_.patronDetails.punterId.value) shouldBe Vector(patronDetails1, patronDetails2)
        .map(truncateTime)
        .map(withEasternTime(_, easternClock))
    }

    "override details for the same punter with new data" in {
      await(db.run(query.delete))
      val time = clock.currentOffsetDateTime()
      val patronDetails1 = generatePatronDetails(PunterEntity.PunterId("aPunter"), time)
      val patronDetails2 = patronDetails1.copy(kyc = patronDetails1.kyc.copy(
        kycVerificationStatus = KYCVerificationStatus.Passed,
        kycVerificationTime = clock.currentOffsetDateTime()))
      await(puntersViewRepository.upsert(patronDetails1))
      await(puntersViewRepository.upsert(patronDetails2))
      val stored = await(db.run(query.result))
      stored.sortBy(_.patronDetails.punterId.value) shouldBe Vector(patronDetails2)
        .map(truncateTime)
        .map(withEasternTime(_, easternClock))
    }
  }

  def generatePatronDetails(
      punterId: PunterEntity.PunterId,
      time: OffsetDateTime = clock.currentOffsetDateTime()): PatronDetails = {
    val personalDetails = generatePersonalDetails()
    val last4DigitsOfSSN = generateSocialSecurityNumber()
    val dateOfBirth = personalDetails.dateOfBirth
    val personalName = personalDetails.name
    val registrationTime = clock.currentOffsetDateTime().minusDays(1)
    val verificationTime = clock.currentOffsetDateTime().minusHours(2)
    PatronDetails(
      punterId = punterId,
      geoId = defaultGeoId,
      dupi = DUPI(personalName.lastName, dateOfBirth, last4DigitsOfSSN),
      registration = generatePatronRegistrationDetails(registrationTime),
      personal = personalDetails.copy(
        name = personalDetails.name.copy(title = personalDetails.name.title.copy(value = "-")),
        isPhoneNumberVerified = false),
      kyc = generatePatronKYCDetails(KYCVerificationMethod.Manual, KYCVerificationStatus.Pending, verificationTime),
      lastUpdateTime = time)
  }
  def generatePatronKYCDetails(
      kycVerificationMethod: KYCVerificationMethod,
      kycVerificationStatus: KYCVerificationStatus,
      verificationTime: OffsetDateTime): PatronKYCDetails =
    PatronKYCDetails(
      kycVerificationMethod = kycVerificationMethod,
      kycVerificationStatus = kycVerificationStatus,
      kycVerificationTime = verificationTime)

  def generatePatronRegistrationDetails(registrationTime: OffsetDateTime): PatronRegistrationDetails = {
    val address = generateAddress()
    PatronRegistrationDetails(
      registrationTime = registrationTime,
      state = Some(address.state),
      zipcode = Some(address.zipcode),
      nonUsState = None,
      country = Some(Country("US").unsafe()))
  }

  def truncateTime(patronDetails: PatronDetails): PatronDetails =
    patronDetails.copy(
      lastUpdateTime = patronDetails.lastUpdateTime.truncatedTo(ChronoUnit.MILLIS),
      registration = patronDetails.registration.copy(registrationTime =
        patronDetails.registration.registrationTime.truncatedTo(ChronoUnit.MILLIS)),
      kyc = patronDetails.kyc.copy(kycVerificationTime =
        patronDetails.kyc.kycVerificationTime.truncatedTo(ChronoUnit.MILLIS)))
}
