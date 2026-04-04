package eeg.waysun.events.validators.validation.validators.event

import java.util.UUID

import stella.dataapi.platformevents.Field
import eeg.waysun.events.validators.data._
import eeg.waysun.events.validators.validation.ErrorCodes.IncorrectValue
import net.flipsports.gmx.streaming.common.conversion.TupleOps.toTuple2
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner

import scala.collection.JavaConverters._

class ValueValidationSpec extends StreamingTestBase with FlinkJobsTestRunner {

  "ValueValidation" should {

    "return succeeded when proper data is provided" in {
      val projectId = UUID.randomUUID().toString
      val rawAndDefinitionItemName = "headShots"
      val rawAndDefinitionItemName2 = "overallResult"
      val rawAndDefinitionItemName3 = "getKilled"

      val raw = toTuple2(
        RawDataProvider.buildFake(
          1,
          "headShotsAccomplished",
          projectId,
          Some(Seq(
            FieldDataProvider.createField(rawAndDefinitionItemName, 22),
            FieldDataProvider.createField(rawAndDefinitionItemName2, "good"),
            FieldDataProvider.createField(rawAndDefinitionItemName3, true)))))
      val definition = toTuple2(
        DefinitionDataProvider.buildFake(
          1,
          "headShotsAccomplished",
          projectId,
          Some(Seq(
            EventFieldDataProvider.intField(rawAndDefinitionItemName),
            EventFieldDataProvider.stringField(rawAndDefinitionItemName2),
            EventFieldDataProvider.booleanField(rawAndDefinitionItemName3)))))

      val validation = ValueValidation().validate(definition.f1, raw.f1)

      validation.status shouldBe true
      validation.errorCodes shouldEqual Nil
    }

    "return failures when wrong integer data is provided" in {
      val projectId = UUID.randomUUID().toString
      val rawAndDefinitionItemName = "headShots"
      val rawAndDefinitionItemName2 = "overallResult"

      val definition = toTuple2(
        DefinitionDataProvider.buildFake(
          1,
          "headShotsAccomplished",
          projectId,
          Some(
            Seq(
              EventFieldDataProvider.intField(rawAndDefinitionItemName),
              EventFieldDataProvider.booleanField(rawAndDefinitionItemName2)))))

      val raw = toTuple2(RawDataProvider.buildFake(1, "headShotsAccomplished", projectId))
      val fieldValues = new Field(rawAndDefinitionItemName, "thisIsString")
      val fieldValues2 = new Field(rawAndDefinitionItemName2, "somePlayer")
      raw.f1.setPayload(Seq(fieldValues, fieldValues2).asJava)

      val validation = ValueValidation().validate(definition.f1, raw.f1)

      validation.status shouldBe false
      validation.errorCodes shouldEqual List(IncorrectValue)
    }

    "return failures when wrong boolean data is provided" in {
      val proejctId = UUID.randomUUID().toString
      val rawAndDefinitionItemName = "headShots"
      val rawAndDefinitionItemName2 = "overallResult"

      val definition = toTuple2(
        DefinitionDataProvider.buildFake(
          1,
          "headShotsAccomplished",
          proejctId,
          Some(
            Seq(
              EventFieldDataProvider.booleanField(rawAndDefinitionItemName),
              EventFieldDataProvider.booleanField(rawAndDefinitionItemName2)))))

      val raw = toTuple2(RawDataProvider.buildFake(1, "headShotsAccomplished", proejctId))
      val fieldValues = new Field(rawAndDefinitionItemName, "thisIsString")
      val fieldValues2 = new Field(rawAndDefinitionItemName2, "somePlayer")
      raw.f1.setPayload(Seq(fieldValues, fieldValues2).asJava)

      val validation = ValueValidation().validate(definition.f1, raw.f1)

      validation.status shouldBe false
      validation.errorCodes shouldEqual List(IncorrectValue)
    }
  }
}
