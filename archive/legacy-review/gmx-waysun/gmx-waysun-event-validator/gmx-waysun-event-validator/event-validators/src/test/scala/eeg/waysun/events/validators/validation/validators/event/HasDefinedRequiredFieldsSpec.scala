package eeg.waysun.events.validators.validation.validators.event

import java.util.UUID

import eeg.waysun.events.validators.data._
import eeg.waysun.events.validators.validation.ErrorCodes.MissedFields
import net.flipsports.gmx.streaming.common.conversion.TupleOps.toTuple2
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner

class HasDefinedRequiredFieldsSpec extends StreamingTestBase with FlinkJobsTestRunner {

  "HasDefinedRequiredFields" should {

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

      val validation = HasDefinedRequiredFields().validate(definition.f1, raw.f1)

      validation.status shouldBe true
      validation.errorCodes shouldEqual Nil
    }

    "return failures when the required field does not match the case-sensitive" in {
      val projectId = UUID.randomUUID().toString

      val raw = toTuple2(
        RawDataProvider.buildFake(
          1,
          "headShotsAccomplished",
          projectId,
          Some(
            Seq(
              FieldDataProvider.createField("headShots", 22),
              FieldDataProvider.createField("overallResult", "good"),
              FieldDataProvider.createField("died", true)))))
      val definition = toTuple2(
        DefinitionDataProvider.buildFake(
          1,
          "headShotsAccomplished",
          projectId,
          Some(
            Seq(
              EventFieldDataProvider.intField("HeadShots"),
              EventFieldDataProvider.stringField("overallRESULT"),
              EventFieldDataProvider.booleanField("DIED")))))

      val validation = HasDefinedRequiredFields().validate(definition.f1, raw.f1)

      validation.status shouldBe false
      validation.errorCodes shouldEqual List(MissedFields)
    }

    "return failures when wrong data is provided" in {
      val definition = toTuple2(DefinitionDataProvider.single)
      val raw = toTuple2(RawDataProvider.single)

      val validation = HasDefinedRequiredFields().validate(definition.f1, raw.f1)

      validation.status shouldBe false
      validation.errorCodes shouldEqual List(MissedFields)
    }

    "return failures when eventName and projectId is the same but EventField and Event are wrong" in {
      val projectId = UUID.randomUUID().toString
      val definition = toTuple2(DefinitionDataProvider.buildFake(1, "headShotsAccomplished", projectId))
      val raw = toTuple2(RawDataProvider.buildFake(1, "headShotsAccomplished", projectId))

      val validation = HasDefinedRequiredFields().validate(definition.f1, raw.f1)

      validation.status shouldBe false
      validation.errorCodes shouldEqual List(MissedFields)
    }
  }
}
