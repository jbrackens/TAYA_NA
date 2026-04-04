package phoenix.reports.application.generator

import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.jdk.CollectionConverters._

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import com.norbitltd.spoiwo.natures.xlsx.Model2XlsxConversions.XlsxSheet
import org.apache.commons.collections4.IteratorUtils
import org.apache.poi.ss.usermodel.Cell
import org.apache.poi.ss.usermodel.DataFormatter
import org.apache.poi.ss.usermodel.Row
import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetEntity.BetId
import phoenix.core.Clock
import phoenix.core.deployment.DeploymentClock
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.ReportsModule
import phoenix.reports.application.generator.CellUtils._
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.markets.SportDiscipline
import phoenix.reports.domain.model.punter.AccountDesignation
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.support.MultiTableReport
import phoenix.reports.support.MultiTypesReport
import phoenix.reports.support.MultiTypesReport.MultiTypesReportRow
import phoenix.reports.support.SimpleReport
import phoenix.reports.support.SimpleReport.SimpleReportRow
import phoenix.reports.support.WithAggregationReport
import phoenix.reports.support.WithAggregationReport.WithAggregationReportRow
import phoenix.shared.support.TimeSupport.deploymentConfig
import phoenix.support.FutureSupport

final class ReportGeneratorSpec
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport
    with GivenWhenThen {

  private implicit val ec: ExecutionContext = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor())

  val clock: Clock = DeploymentClock.fromConfig(deploymentConfig)
  val objectUnderTest = new ReportGenerator
  ReportsModule.ensureHeadlessAwt()

  "A ReportGenerator" should {
    "generate correct XLS for empty report" in {
      Given("report definition with empty data")
      val givenDataProvider = new ReportDataProvider[SimpleReportRow] {
        override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[SimpleReportRow]] =
          Future.successful(Seq())
      }
      val givenReportDefinition = new SimpleReport(givenDataProvider)

      When("generating report for given date")
      val dayOfEvent = ReportingPeriod.enclosingDay(OffsetDateTime.of(2021, 6, 20, 23, 59, 0, 0, ZoneOffset.UTC), clock)

      val actualSheet = await(objectUnderTest.generate(dayOfEvent, givenReportDefinition, clock))

      Then("workbook contains one sheet")
      val workbook = actualSheet.convertAsXlsx()
      workbook.getNumberOfSheets should be(1)
      val reportSheet = workbook.getSheetAt(0)

      And("sheet contains correct number of rows")
      val rows = IteratorUtils.toList(reportSheet.iterator).asScala.toList
      rows.size should be(11)

      And("header is populated")
      assertReportHeaderPopulated(rows, "Simple Report", "06/20/2021")

      And("table is empty")
      assertTableHeaderPopulated(rows, 7, "Column A", "Column B", "Column C")
      assertTableEmpty(rows, 8)
    }

    "generate correct XLS for report with multiple tables" in {
      Given("report definition with multiple columns")
      val givenReportDefinition = new MultiTableReport()

      When("generating report for given date")
      val dayOfEvent = ReportingPeriod.enclosingDay(OffsetDateTime.of(2021, 6, 21, 23, 59, 0, 0, ZoneOffset.UTC), clock)

      val actualSheet = await(objectUnderTest.generate(dayOfEvent, givenReportDefinition, clock))

      Then("both tables appear in one sheet")
      val workbook = actualSheet.convertAsXlsx()
      workbook.getNumberOfSheets should be(1)
      val reportSheet = workbook.getSheetAt(0)

      And("sheet contains correct number of rows")
      val rows = IteratorUtils.toList(reportSheet.iterator).asScala.toList
      rows.size should be(15)

      And("header is populated")
      assertReportHeaderPopulated(rows, "MultiTable Report", "06/21/2021")

      And("first table is generated empty")
      assertTableHeaderPopulated(rows, 7, "Column A", "Column B")
      assertTableEmpty(rows, 8)

      And("second table is generated empty")
      assertTableHeaderPopulated(rows, 11, "Column 1", "Column 2", "Column 3")
      assertTableEmpty(rows, 12)
    }

    "generate correct XLS for report with data" in {
      val givenDataProvider = new ReportDataProvider[SimpleReportRow] {
        override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[SimpleReportRow]] =
          Future.successful(
            Seq(
              SimpleReportRow(
                StringField("valA"),
                MoneyField(1.0),
                StringField("details"),
                OptionalField.some(StringField("optional"))),
              SimpleReportRow(StringField("valB"), MoneyField(-9.4), StringField("something"), OptionalField.none)))
      }
      val givenReportDefinition = new SimpleReport(givenDataProvider)

      When("generating report for given date")
      val dayOfEvent = ReportingPeriod.enclosingDay(OffsetDateTime.of(2021, 5, 20, 23, 59, 0, 0, ZoneOffset.UTC), clock)

      val actualSheet = await(objectUnderTest.generate(dayOfEvent, givenReportDefinition, clock))

      Then("sheet contains correct number of rows")
      val workbook = actualSheet.convertAsXlsx()
      val reportSheet = workbook.getSheetAt(0)
      val rows = IteratorUtils.toList(reportSheet.iterator).asScala.toList
      rows.size should be(12)

      And("header is populated")
      assertReportHeaderPopulated(rows, "Simple Report", "05/20/2021")

      And("table contains all rows")
      assertTableHeaderPopulated(rows, 7, "Column A", "Column B", "Column C")

      val dataRow1 = rows(8)
      dataRow1.getPhysicalNumberOfCells should be(4)
      dataRow1.getCell(0).getStringCellFormattedValue should be("valA")
      dataRow1.getCell(1).getStringCellFormattedValue should be("1.00")
      dataRow1.getCell(2).getStringCellFormattedValue should be("details")
      dataRow1.getCell(3).getStringCellFormattedValue should be("optional")

      val dataRow2 = rows(9)
      dataRow2.getPhysicalNumberOfCells should be(4)
      dataRow2.getCell(0).getStringCellFormattedValue should be("valB")
      dataRow2.getCell(1).getStringCellFormattedValue should be("(9.40)")
      dataRow2.getCell(2).getStringCellFormattedValue should be("something")
      dataRow2.getCell(3).getStringCellFormattedValue should be("")

      assertEmpty(rows, 10)
      assertEmpty(rows, 11)
    }

    "generate correct XLS for report with aggregation" in {
      val givenDataProvider = new ReportDataProvider[WithAggregationReportRow] {
        override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[WithAggregationReportRow]] = {
          Future.successful(
            Seq(
              WithAggregationReportRow(StringField("row1"), NumberField(1), MoneyField(1.0), MoneyField(2.0)),
              WithAggregationReportRow(StringField("row2"), NumberField(5), MoneyField(5.0), MoneyField(-9.0)),
              WithAggregationReportRow(StringField("row3"), NumberField(10), MoneyField(10.0), MoneyField(0.367)),
              WithAggregationReportRow(StringField("row4"), NumberField(15), MoneyField(15.0), MoneyField(-14.809)),
              WithAggregationReportRow(StringField("row5"), NumberField(20), MoneyField(20.0), MoneyField(0.0))))
        }
      }
      val givenReportDefinition = new WithAggregationReport(givenDataProvider)

      When("generating report for given date")
      val dayOfEvent = ReportingPeriod.enclosingDay(OffsetDateTime.of(2021, 7, 15, 23, 59, 0, 0, ZoneOffset.UTC), clock)

      val actualSheet = await(objectUnderTest.generate(dayOfEvent, givenReportDefinition, clock))

      Then("sheet contains correct number of rows")
      val workbook = actualSheet.convertAsXlsx()
      val reportSheet = workbook.getSheetAt(0)
      val rows = IteratorUtils.toList(reportSheet.iterator).asScala.toList
      rows.size should be(16)

      And("header is populated")
      assertReportHeaderPopulated(rows, "WithAggregation Report", "07/15/2021")

      And("table contains all rows")
      assertTableHeaderPopulated(
        rows,
        7,
        "Heading should keep 'Totals' label",
        "Not MoneyField should not use aggregate",
        "MoneyField without aggregate is skipped",
        "MoneyField with aggregate calculate sum")

      val dataRow1 = rows(8)
      dataRow1.getPhysicalNumberOfCells should be(4)
      dataRow1.getCell(0).getStringCellFormattedValue should be("row1")
      dataRow1.getCell(1).getStringCellFormattedValue should be("1")
      dataRow1.getCell(2).getStringCellFormattedValue should be("1.00")
      dataRow1.getCell(3).getStringCellFormattedValue should be("2.00")

      val dataRow2 = rows(9)
      dataRow2.getPhysicalNumberOfCells should be(4)
      dataRow2.getCell(0).getStringCellFormattedValue should be("row2")
      dataRow2.getCell(1).getStringCellFormattedValue should be("5")
      dataRow2.getCell(2).getStringCellFormattedValue should be("5.00")
      dataRow2.getCell(3).getStringCellFormattedValue should be("(9.00)")

      val dataRow3 = rows(10)
      dataRow3.getPhysicalNumberOfCells should be(4)
      dataRow3.getCell(0).getStringCellFormattedValue should be("row3")
      dataRow3.getCell(1).getStringCellFormattedValue should be("10")
      dataRow3.getCell(2).getStringCellFormattedValue should be("10.00")
      dataRow3.getCell(3).getStringCellFormattedValue should be("0.37")

      val dataRow4 = rows(11)
      dataRow4.getPhysicalNumberOfCells should be(4)
      dataRow4.getCell(0).getStringCellFormattedValue should be("row4")
      dataRow4.getCell(1).getStringCellFormattedValue should be("15")
      dataRow4.getCell(2).getStringCellFormattedValue should be("15.00")
      dataRow4.getCell(3).getStringCellFormattedValue should be("(14.81)")

      val dataRow5 = rows(12)
      dataRow5.getPhysicalNumberOfCells should be(4)
      dataRow5.getCell(0).getStringCellFormattedValue should be("row5")
      dataRow5.getCell(1).getStringCellFormattedValue should be("20")
      dataRow5.getCell(2).getStringCellFormattedValue should be("20.00")
      dataRow5.getCell(3).getStringCellFormattedValue should be("0.00")

      And("and totals is calculated")
      val totalsRow = rows(13)
      totalsRow.getPhysicalNumberOfCells should be(4)
      totalsRow.getCell(0).getStringCellFormattedValue should be("Totals")
      totalsRow.getCell(1).getStringCellFormattedValue should be("")
      totalsRow.getCell(2).getStringCellFormattedValue should be("")
      totalsRow.getCell(3).getStringCellFormattedValue should be("(21.44)")

      assertEmpty(rows, 14)
      assertEmpty(rows, 15)
    }

    "generate correct XLS for report with multiple types formatted" in {
      Given("report definition with multiple columns")
      val givenDataProvider = new ReportDataProvider[MultiTypesReportRow] {
        override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[MultiTypesReportRow]] =
          Future.successful(
            Seq(MultiTypesReportRow(
              DateField(OffsetDateTime.of(2021, 6, 30, 14, 56, 23, 0, ZoneOffset.UTC)),
              TimeField(OffsetDateTime.of(2021, 6, 30, 10, 12, 56, 0, ZoneOffset.UTC)),
              DateTimeField(OffsetDateTime.of(2021, 7, 1, 2, 30, 10, 0, ZoneOffset.UTC)),
              PatronIdField(PunterId("punter1")),
              AccountDesignationField(AccountDesignation.RealAccount),
              BetIdField(BetId("betA")),
              SportDisciplineField(SportDiscipline.AmericanFootball),
              MoneyField(123.456))))
      }
      val givenReportDefinition = new MultiTypesReport(givenDataProvider)

      When("generating report for given date")
      val dayOfEvent = ReportingPeriod.enclosingDay(OffsetDateTime.of(2021, 6, 28, 11, 59, 0, 0, ZoneOffset.UTC), clock)

      val actualSheet = await(objectUnderTest.generate(dayOfEvent, givenReportDefinition, clock))

      Then("sheet contains correct number of rows")
      val workbook = actualSheet.convertAsXlsx()
      val reportSheet = workbook.getSheetAt(0)
      val rows = IteratorUtils.toList(reportSheet.iterator).asScala.toList
      rows.size should be(11)

      And("header is populated")
      assertReportHeaderPopulated(rows, "MultiTypes Report", "06/28/2021")

      And("table contains all rows")
      assertTableHeaderPopulated(
        rows,
        7,
        "Date",
        "Time",
        "Date & Time",
        "Patron Id",
        "Account Designation (Real or Test)",
        "Bet Id",
        "Sport Discipline",
        "Money")

      val dataRow1 = rows(8)
      dataRow1.getPhysicalNumberOfCells should be(8)
      dataRow1.getCell(0).getStringCellFormattedValue should be("06/30/2021")
      dataRow1.getCell(1).getStringCellFormattedValue should be("06:12:56")
      dataRow1.getCell(2).getStringCellFormattedValue should be("06/30/2021 22:30:10")
      dataRow1.getCell(3).getStringCellFormattedValue should be("punter1")
      dataRow1.getCell(4).getStringCellFormattedValue should be("Real")
      dataRow1.getCell(5).getStringCellFormattedValue should be("betA")
      dataRow1.getCell(6).getStringCellFormattedValue should be("American Football")
      dataRow1.getCell(7).getStringCellFormattedValue should be("123.46")

      assertEmpty(rows, 9)
      assertEmpty(rows, 10)
    }
  }

  def assertReportHeaderPopulated(rows: Seq[Row], reportName: String, date: String): Unit = {
    assertEmpty(rows, 0)
    assertEmpty(rows, 1)

    val reportNameRow = rows(2)
    reportNameRow.getPhysicalNumberOfCells should be(1)
    reportNameRow.getCell(0).getStringCellFormattedValue should be(reportName)
    val gamingDateRow = rows(3)
    gamingDateRow.getPhysicalNumberOfCells should be(1)
    gamingDateRow.getCell(0).getStringCellFormattedValue should be(s"Gaming Date: $date")
    val platformRow = rows(4)
    platformRow.getPhysicalNumberOfCells should be(1)
    platformRow.getCell(0).getStringCellFormattedValue should be("Platform: DARKSTORMLABS")

    assertEmpty(rows, 5)
    assertEmpty(rows, 6)
  }

  private def assertEmpty(rows: Seq[Row], index: Int): Unit =
    rows(index).getPhysicalNumberOfCells should be(0)

  private def assertTableHeaderPopulated(rows: Seq[Row], index: Int, names: String*): Unit = {
    val tableHeader = rows(index)
    tableHeader.getPhysicalNumberOfCells should be(names.size)
    names.zipWithIndex.foreach {
      case (name, index) => tableHeader.getCell(index).getStringCellFormattedValue should be(name)
    }
  }

  private def assertTableEmpty(rows: Seq[Row], index: Int): Unit = {
    val noActivityRow = rows(index)
    noActivityRow.getPhysicalNumberOfCells should be(1)
    noActivityRow.getCell(0).getStringCellFormattedValue should be("No Activity")

    assertEmpty(rows, index + 1)
    assertEmpty(rows, index + 2)
  }
}

private object CellUtils {
  private val formatter: DataFormatter = new DataFormatter()

  implicit final class CellFormatOps(self: Cell) {
    def getStringCellFormattedValue: String = formatter.formatCellValue(self)
  }
}
