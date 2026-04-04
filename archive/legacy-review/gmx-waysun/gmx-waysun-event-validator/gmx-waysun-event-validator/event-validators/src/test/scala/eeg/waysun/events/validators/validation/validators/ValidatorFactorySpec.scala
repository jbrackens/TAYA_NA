package eeg.waysun.events.validators.validation.validators

import eeg.waysun.events.validators.Types.RawWithDefinition
import eeg.waysun.events.validators.data._
import eeg.waysun.events.validators.validation.ErrorCodes._
import eeg.waysun.events.validators.validation.{ValidationResult, ValidatorFactory}
import net.flipsports.gmx.streaming.common.conversion.TupleOps.toTuple2
import net.flipsports.gmx.streaming.common.job.streams.dto.{KeyValue, KeyValueOpt}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import stella.dataapi.platformevents.Field

import java.util.UUID
import scala.collection.JavaConverters._

class ValidatorFactorySpec extends StreamingTestBase with FlinkJobsTestRunner {

  "ValidatorFactory" should {

    "pass all validation with proper data (raw, definition)" in {
      val projectId = UUID.randomUUID().toString
      val rawAndDefinitionItemName = "headShots"
      val rawAndDefinitionItemName2 = "overallResult"

      val raw = toTuple2(
        RawDataProvider
          .buildFake(
            1,
            "headShotsAccomplished",
            projectId,
            Some(
              Seq(
                FieldDataProvider.createField(rawAndDefinitionItemName, 22),
                FieldDataProvider.createField(rawAndDefinitionItemName2, "good"))))
          .toInternalKey())
      val definition = toTuple2(
        DefinitionDataProvider
          .buildFake(
            1,
            "headShotsAccomplished",
            projectId,
            Some(
              Seq(
                EventFieldDataProvider.intField(rawAndDefinitionItemName),
                EventFieldDataProvider.stringField(rawAndDefinitionItemName2))))
          .toInternalKey())
      val joiningEvent =
        new RawWithDefinition.ValueType(KeyValue(raw.f0, raw.f1), KeyValueOpt(definition.f0, Some(definition.f1)))
      val joiningKey =
        new RawWithDefinition.KeyType(definition.f0.projectId, definition.f0.eventName.get.toString)
      val rawWithDefinition = new RawWithDefinition.OutputType(joiningKey, joiningEvent)
      val validation: ValidationResult = ValidatorFactory.validate(rawWithDefinition)

      validation.status shouldBe true
      validation.errorCodes shouldEqual Nil
    }

    "failed validation with raw payload empty" in {
      val projectId = UUID.randomUUID().toString
      val rawAndDefinitionItemName = "headShots"
      val rawAndDefinitionItemName2 = "fatalShots"

      val raw = toTuple2(RawDataProvider.buildFake(1, "headShotsAccomplished", projectId, Some(Seq())).toInternalKey())
      raw.f1.setPayload(null)
      val definition = toTuple2(
        DefinitionDataProvider
          .buildFake(
            1,
            "headShotsAccomplished",
            projectId,
            Some(
              Seq(
                EventFieldDataProvider.intField(rawAndDefinitionItemName),
                EventFieldDataProvider.intField(rawAndDefinitionItemName2))))
          .toInternalKey())
      val joiningEvent =
        new RawWithDefinition.ValueType(KeyValue(raw.f0, raw.f1), KeyValueOpt(definition.f0, Some(definition.f1)))
      val joiningKey =
        new RawWithDefinition.KeyType(definition.f0.projectId, definition.f0.eventName.get)
      val rawWithDefinition = new RawWithDefinition.OutputType(joiningKey, joiningEvent)
      val validation: ValidationResult = ValidatorFactory.validate(rawWithDefinition)

      validation.status shouldBe false
      validation.errorCodes should have size 1
      validation.errorCodes shouldEqual List(EmptyPayload)
    }

    "failed validation with wrong data (raw, definition)" in {
      val raw = toTuple2(RawDataProvider.single.toInternalKey())
      val definition = toTuple2(DefinitionDataProvider.single.toInternalKey())

      val joiningEvent =
        new RawWithDefinition.ValueType(KeyValue(raw.f0, raw.f1), KeyValueOpt(definition.f0, Some(definition.f1)))
      val joiningKey =
        new RawWithDefinition.KeyType(definition.f0.projectId, definition.f0.eventName.get)
      val rawWithDefinition = new RawWithDefinition.OutputType(joiningKey, joiningEvent)
      val validation: ValidationResult = ValidatorFactory.validate(rawWithDefinition)

      validation.status shouldBe false
      validation.errorCodes should have size 1
      validation.errorCodes shouldEqual List(MissedFields)
    }

    "failed validation with empty messageId" in {
      val projectId = UUID.randomUUID().toString
      val rawAndDefinitionItemName = "headShots"
      val rawAndDefinitionItemName2 = "overallResult"

      val raw = toTuple2(
        RawDataProvider
          .buildFake(
            1,
            "headShotsAccomplished",
            projectId,
            Some(
              Seq(
                FieldDataProvider.createField(rawAndDefinitionItemName, 22),
                FieldDataProvider.createField(rawAndDefinitionItemName2, "good"))))
          .toInternalKey())
      raw.f1.setMessageId(null)
      val definition = toTuple2(
        DefinitionDataProvider
          .buildFake(
            1,
            "headShotsAccomplished",
            projectId,
            Some(
              Seq(
                EventFieldDataProvider.intField(rawAndDefinitionItemName),
                EventFieldDataProvider.stringField(rawAndDefinitionItemName2))))
          .toInternalKey())
      val joiningEvent =
        new RawWithDefinition.ValueType(KeyValue(raw.f0, raw.f1), KeyValueOpt(definition.f0, Some(definition.f1)))
      val joiningKey =
        new RawWithDefinition.KeyType(definition.f0.projectId, definition.f0.eventName.get)
      val rawWithDefinition = new RawWithDefinition.OutputType(joiningKey, joiningEvent)
      val validation: ValidationResult = ValidatorFactory.validate(rawWithDefinition)

      validation.status shouldBe false
      validation.errorCodes should have size 1
      validation.errorCodes shouldEqual List(EmptyMessageId)
    }

    "failed validation with wrong value type in raw" in {
      val projectId = UUID.randomUUID().toString
      val rawAndDefinitionItemName = "headShots"
      val rawAndDefinitionItemName2 = "overallResult"

      val raw = toTuple2(
        RawDataProvider
          .buildFake(
            1,
            "headShotsAccomplished",
            projectId,
            Some(
              Seq(
                FieldDataProvider.createField(rawAndDefinitionItemName, false),
                FieldDataProvider.createField(rawAndDefinitionItemName2, false))))
          .toInternalKey())
      val definition = toTuple2(
        DefinitionDataProvider
          .buildFake(
            1,
            "headShotsAccomplished",
            projectId,
            Some(
              Seq(
                EventFieldDataProvider.intField(rawAndDefinitionItemName),
                EventFieldDataProvider.stringField(rawAndDefinitionItemName2))))
          .toInternalKey())
      val joiningEvent =
        new RawWithDefinition.ValueType(KeyValue(raw.f0, raw.f1), KeyValueOpt(definition.f0, Some(definition.f1)))
      val joiningKey =
        new RawWithDefinition.KeyType(definition.f0.projectId, definition.f0.eventName.get)
      val rawWithDefinition = new RawWithDefinition.OutputType(joiningKey, joiningEvent)
      val validation: ValidationResult = ValidatorFactory.validate(rawWithDefinition)

      validation.status shouldBe false
      validation.errorCodes shouldEqual List(IncorrectValue)
    }

    "failed couple of validation with wrong raw" in {
      val projectId = UUID.randomUUID().toString
      val rawAndDefinitionItemName = "headShots"
      val rawAndDefinitionItemName2 = "overallResult"

      val raw = toTuple2(RawDataProvider.buildFake(1, "headShotsAccomplished", projectId).toInternalKey())
      val fieldValues = new Field(rawAndDefinitionItemName, "thisIsString")
      val fieldValues2 = new Field(rawAndDefinitionItemName2, "somePlayer")
      raw.f1.setPayload(Seq(fieldValues, fieldValues2).asJava)
      raw.f1.setMessageId(null)
      val definition = toTuple2(
        DefinitionDataProvider
          .buildFake(
            1,
            "headShotsAccomplished",
            projectId,
            Some(
              Seq(
                EventFieldDataProvider.intField(rawAndDefinitionItemName),
                EventFieldDataProvider.stringField(rawAndDefinitionItemName2))))
          .toInternalKey())
      val joiningEvent =
        new RawWithDefinition.ValueType(KeyValue(raw.f0, raw.f1), KeyValueOpt(definition.f0, Some(definition.f1)))
      val joiningKey =
        new RawWithDefinition.KeyType(definition.f0.projectId, definition.f0.eventName.get)
      val rawWithDefinition = new RawWithDefinition.OutputType(joiningKey, joiningEvent)
      val validation: ValidationResult = ValidatorFactory.validate(rawWithDefinition)

      validation.status shouldBe false
      validation.errorCodes shouldEqual List(EmptyMessageId, IncorrectValue)
    }
  }
}
