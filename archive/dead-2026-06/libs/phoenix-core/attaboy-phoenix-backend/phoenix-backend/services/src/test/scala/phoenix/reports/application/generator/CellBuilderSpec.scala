package phoenix.reports.application.generator

import java.text.SimpleDateFormat
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Date

import scala.math.BigDecimal.decimal

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetEntity.BetId
import phoenix.core.OptionUtils._
import phoenix.core.deployment.DeploymentClock
import phoenix.punters.PunterDataGenerator
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.reports.domain.definition.Fields.AccountDesignationField
import phoenix.reports.domain.definition.Fields.BetIdField
import phoenix.reports.domain.definition.Fields.BetStatusField
import phoenix.reports.domain.definition.Fields.ConfidenceField
import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.DateTimeField
import phoenix.reports.domain.definition.Fields.DeviceField
import phoenix.reports.domain.definition.Fields.FullAddressField
import phoenix.reports.domain.definition.Fields.FullNameField
import phoenix.reports.domain.definition.Fields.FullOrPartialSSNField
import phoenix.reports.domain.definition.Fields.IpAddressField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.NumberField
import phoenix.reports.domain.definition.Fields.OptionalField
import phoenix.reports.domain.definition.Fields.PatronIdField
import phoenix.reports.domain.definition.Fields.SportDisciplineField
import phoenix.reports.domain.definition.Fields.StringField
import phoenix.reports.domain.definition.Fields.TimeField
import phoenix.reports.domain.definition.Fields.TransactionTypeField
import phoenix.reports.domain.definition.Fields.VisitorIdField
import phoenix.reports.domain.definition.ReportDefinition.RowType
import phoenix.reports.domain.model.bets.BetStatus
import phoenix.reports.domain.model.markets.SportDiscipline
import phoenix.reports.domain.model.punter.AccountDesignation
import phoenix.reports.domain.model.wallets.TransactionType
import phoenix.shared.support.TimeSupport.deploymentConfig
import phoenix.support.UserGenerator

final class CellBuilderSpec extends AnyWordSpecLike with Matchers {
  private val newJerseyClock = DeploymentClock.fromConfig(deploymentConfig)
  private val cellBuilder: CellBuilder = CellBuilder(newJerseyClock)

  "a CellBuilder" should {
    "build cell from a StringField" in {
      // given
      val field = StringField("example")

      // when
      val stringField = cellBuilder.buildCell(field)

      // then
      stringField.value shouldBe "example"
    }

    "build cell from a DateField" in {
      // given
      val givenFields = List(
        DateField(OffsetDateTime.of(2021, 6, 30, 2, 30, 10, 0, ZoneOffset.UTC)),
        DateField(OffsetDateTime.of(2021, 6, 30, 14, 56, 23, 0, ZoneOffset.UTC)),
        DateField(OffsetDateTime.of(2021, 7, 1, 10, 12, 56, 0, ZoneOffset.UTC)))

      // when
      val cells = givenFields.map(cellBuilder.buildCell)

      // then
      cells.map(_.value) shouldBe List(
        parseDate("06/29/2021 22:30:10"),
        parseDate("06/30/2021 10:56:23"),
        parseDate("07/01/2021 06:12:56"))

      cells.map(_.format).forall(_.invariantContains(DateTimeFormats.DATE_FORMAT)) shouldBe true
    }

    "build cell from a TimeField" in {
      // given
      val givenFields = List(
        TimeField(OffsetDateTime.of(2021, 6, 30, 2, 30, 10, 0, ZoneOffset.UTC)),
        TimeField(OffsetDateTime.of(2021, 6, 30, 14, 56, 23, 0, ZoneOffset.UTC)),
        TimeField(OffsetDateTime.of(2021, 7, 1, 10, 12, 56, 0, ZoneOffset.UTC)))

      // when
      val cells = givenFields.map(cellBuilder.buildCell)

      // then
      cells.map(_.value) shouldBe List(
        parseDate("06/29/2021 22:30:10"),
        parseDate("06/30/2021 10:56:23"),
        parseDate("07/01/2021 06:12:56"))

      cells.map(_.format).forall(_.invariantContains(DateTimeFormats.TIME_FORMAT)) shouldBe true
    }

    "build cell from a DateTimeField" in {
      // given
      val givenFields = List(
        DateTimeField(OffsetDateTime.of(2021, 6, 30, 2, 30, 10, 0, ZoneOffset.UTC)),
        DateTimeField(OffsetDateTime.of(2021, 6, 30, 14, 56, 23, 0, ZoneOffset.UTC)),
        DateTimeField(OffsetDateTime.of(2021, 7, 1, 10, 12, 56, 0, ZoneOffset.UTC)))

      // when
      val cells = givenFields.map(cellBuilder.buildCell)

      // then
      cells.map(_.value) shouldBe List(
        parseDate("06/29/2021 22:30:10"),
        parseDate("06/30/2021 10:56:23"),
        parseDate("07/01/2021 06:12:56"))

      cells.map(_.format).forall(_.invariantContains(DateTimeFormats.DATE_TIME_FORMAT)) shouldBe true
    }

    "build cell from a NumberField" in {
      // given
      val givenFields = List(NumberField(-1), NumberField(14))

      // when
      val cells = givenFields.map(cellBuilder.buildCell)

      // then
      cells.map(_.value) shouldBe List(-1, 14)
      cells.map(_.format).forall(_.invariantContains(NumberFormats.INTEGER_FORMAT)) shouldBe true
    }

    "build cell from a MoneyField" in {
      // given
      val givenFields =
        List(MoneyField(-1), MoneyField(14), MoneyField(14.4), MoneyField(-1.446), MoneyField(1.446), MoneyField(1444))

      // when
      val cells = givenFields.map(cellBuilder.buildCell)

      // then
      cells.map(_.value) shouldBe List(-1, 14, 14.4, -1.45, 1.45, 1444)
      cells.map(_.format).forall(_.invariantContains(NumberFormats.DECIMAL_FORMAT)) shouldBe true
    }

    "build cell from a PatronIdField" in {
      // given
      val givenField = PatronIdField(PunterId("123-123"))

      // when
      val cell = cellBuilder.buildCell(givenField)

      // then
      cell.value shouldBe "123-123"
    }

    "build cell from a BetIdField" in {
      //given
      val givenField = BetIdField(BetId("123-123"))

      // when
      val cell = cellBuilder.buildCell(givenField)

      // then
      cell.value shouldBe "123-123"
    }

    "build cell from a AccountDesignationField" in {
      // given
      val givenFields =
        List(
          AccountDesignationField(AccountDesignation.RealAccount),
          AccountDesignationField(AccountDesignation.TestAccount))

      // when
      val cells = givenFields.map(cellBuilder.buildCell)

      // then
      cells.map(_.value) shouldBe List("Real", "Test")
    }

    "build cell from a BetStatusField" in {
      // given
      val givenFields = List(BetStatusField(BetStatus.Open))

      // when
      val cells = givenFields.map(cellBuilder.buildCell)

      // then
      cells.map(_.value) shouldBe List("Open")
    }

    "build cell from a SportDisciplineField" in {
      // given
      val givenFields =
        List(SportDisciplineField(SportDiscipline.Other), SportDisciplineField(SportDiscipline.AmericanFootball))

      // when
      val cells = givenFields.map(cellBuilder.buildCell)

      // then
      cells.map(_.value) shouldBe List("Other", "American Football")
    }

    "build cell from a TransactionTypeField" in {
      // given
      val givenFields =
        List(TransactionTypeField(TransactionType.Deposit), TransactionTypeField(TransactionType.Withdrawal))

      // when
      val cells = givenFields.map(cellBuilder.buildCell)

      // then
      cells.map(_.value) shouldBe List("Deposit", "Withdrawal")
    }

    "build cell from a PersonalName" in {
      // given
      val personalName = UserGenerator.generatePersonalName()
      val field = FullNameField(personalName)

      // when
      val cell = cellBuilder.buildCell(field)

      // then
      cell.value shouldBe s"${personalName.title.value} ${personalName.firstName.value} ${personalName.lastName.value}"
    }

    "build cell from an Address" in {
      // given
      val address = UserGenerator.generateAddress()
      val field = FullAddressField(address)

      // when
      val cell = cellBuilder.buildCell(field)

      // then
      cell.value shouldBe s"${address.addressLine.value}, ${address.city.value}, ${address.state.value}, ${address.zipcode.value}, ${address.country.value}"
    }

    "build cell from a IpAddress" in {
      // given
      val ipAddress = PunterDataGenerator.generateIpAddress()
      val field = IpAddressField(ipAddress)

      // when
      val cell = cellBuilder.buildCell(field)

      // then
      cell.value shouldBe s"${ipAddress.value}"
    }

    "build cell from a Device" in {
      // given
      val device = PunterDataGenerator.generateDevice()
      val field = DeviceField(device)

      // when
      val cell = cellBuilder.buildCell(field)

      // then
      cell.value shouldBe s"${device.value}"
    }

    "build cell from a Visitor ID" in {
      // given
      val visitorId = PunterDataGenerator.generateVisitorId()
      val field = VisitorIdField(visitorId)

      // when
      val cell = cellBuilder.buildCell(field)

      // then
      cell.value shouldBe s"${visitorId.value}"
    }

    "build cell from a Confidence Level" in {
      // given
      val confidence = PunterDataGenerator.generateConfidence()
      val field = ConfidenceField(confidence)

      // when
      val cell = cellBuilder.buildCell(field)

      // then
      cell.format.invariantContains(NumberFormats.DECIMAL_FORMAT) shouldBe true
      cell.value shouldBe decimal(confidence.value)
    }

    "build cell from an optional field" in {
      // given
      val device = PunterDataGenerator.generateDevice()
      val ipAddress = PunterDataGenerator.generateIpAddress()
      val fields = List(
        OptionalField.some(DeviceField(device)),
        OptionalField.some(IpAddressField(ipAddress)),
        OptionalField.none,
        OptionalField.some(TransactionTypeField(TransactionType.Deposit)))

      // when
      val cells = fields.map(cellBuilder.buildCell)

      // then
      cells.map(_.value) shouldBe List(device.value, ipAddress.value, "", "Deposit")
    }

    "build cell from an SSN" in {
      // given
      val fields: List[FullOrPartialSSNField] =
        List(FullOrPartialSSNField(Left(Last4DigitsOfSSN("1234"))), FullOrPartialSSNField(Right(FullSSN("123456789"))))

      // when
      val cells = fields.map(cellBuilder.buildCell)

      // then
      cells.map(_.value) shouldBe List("1234", "123456789")
    }

    "build cells for a case class with optional values" in {
      case class TestRow(
          string: StringField,
          optional1: OptionalField[StringField],
          optional2: OptionalField[StringField])
          extends RowType

      // given
      val row = TestRow(StringField("test"), OptionalField.some(StringField("optional")), OptionalField.none)

      // when
      val cells = row.getCells

      // then
      cells.map(cellBuilder.buildCell).map(_.value) shouldBe List("test", "optional", "")
    }
  }

  private def parseDate(formatted: String): Date =
    new SimpleDateFormat(DateTimeFormats.DATE_TIME_FORMAT).parse(formatted)
}
