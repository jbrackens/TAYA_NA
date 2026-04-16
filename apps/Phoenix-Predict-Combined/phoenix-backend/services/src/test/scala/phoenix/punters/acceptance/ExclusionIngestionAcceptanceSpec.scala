package phoenix.punters.acceptance

import java.time.OffsetDateTime
import java.time.ZoneOffset.UTC

import scala.concurrent.Future

import cats.syntax.functor._
import org.scalatest.concurrent.Eventually.eventually
import org.scalatest.concurrent.PatienceConfiguration.Interval
import org.scalatest.concurrent.PatienceConfiguration.Timeout
import org.scalatest.matchers.should.Matchers
import org.scalatest.time.Second
import org.scalatest.time.Seconds
import org.scalatest.time.Span
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.ftp.SftpClient
import phoenix.punters.PuntersConfig
import phoenix.punters.domain.PunterStatus.SelfExcluded
import phoenix.punters.domain.UserDetails
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.ConfigFactory.Environment
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.KeycloakIntegrationSpec
import phoenix.support.ProductionLikeEnvironment
import phoenix.support.SftpIntegrationSpec
import phoenix.time.FakeHardcodedClock

final class ExclusionIngestionAcceptanceSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with KeycloakIntegrationSpec
    with SftpIntegrationSpec {

  override protected lazy val environmentOverride: Environment =
    super.environmentOverride ++ Map("PHOENIX_DGE_EXCLUSION_INGESTION_SCHEDULE" -> "mode=recurring,every=1.second")

  private val env: ProductionLikeEnvironment = {
    val fakeClock = clockReturningTimeOfDay(hour = 12, minute = 0)
    new ProductionLikeEnvironment(system, keycloakRealm.config, dbConfig)(fakeClock)
  }
  private val exclusionConfig = PuntersConfig.of(system).excludedUsers
  private val sftp = new SftpClient(exclusionConfig.sftp)

  private val eventuallyTimeout: Timeout = Timeout(Span(120, Seconds))
  private val eventuallyInterval: Interval = Interval(Span(1, Second))

  "should ingest dge exclusions" in {
    // given
    val (punter, userDetails) = env.punterScenarios.punterAccount()

    // when
    await(uploadExclusionXML(userDetails))

    // then
    eventually(eventuallyTimeout, eventuallyInterval) {
      val punterProfile = awaitRight(env.puntersBC.getPunterProfile(punter.punterId))
      punterProfile.status shouldBe SelfExcluded
    }
  }

  private def uploadExclusionXML(details: UserDetails): Future[Unit] = {
    val exclusionXml =
      <DGE_Report>
        <Report_Date>2013-10-31</Report_Date>
        <excludedPlayers>
          <First_Name>{details.name.firstName.value}</First_Name>
          <Last_Name>{details.name.lastName.value}</Last_Name>
          <DOB>{details.dateOfBirth.toLocalDate.toString}</DOB>
          <Street_Address_1>{details.address.addressLine.value}</Street_Address_1>
          <City>{details.address.city.value}</City>
          <State>{details.address.state.value}</State>
          <Country>{details.address.country.value}</Country>
          <ZIP_Code>{details.address.zipcode.value}</ZIP_Code>
          <Document_Type>SSN</Document_Type>
          <Country_ID>US</Country_ID>
          <SSN>{details.ssn.value}</SSN>
          <Exclusion_Type>INTERNET</Exclusion_Type>
          <Status>ACTIVE</Status>
          <Submitted_Date>2013-10-31T12:35:01.0-04:00</Submitted_Date>
        </excludedPlayers>
      </DGE_Report>

    sftp.transfer(exclusionXml.toString().getBytes, exclusionConfig.excludedUsersIngestion.ingestionFilePath).void
  }

  private def clockReturningTimeOfDay(hour: Int, minute: Int): Clock = {
    val stubbedDate = OffsetDateTime.of(2009, 1, 1, hour, minute, 0, 0, UTC)
    new FakeHardcodedClock(fixedTime = stubbedDate, timeZone = UTC)
  }
}
