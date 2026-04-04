package eeg.waysun.events.validators.validation.validators.event

import eeg.waysun.events.validators.data.{DefinitionDataProvider, RawDataProvider}
import eeg.waysun.events.validators.validation.ErrorCodes.EmptyPayload
import net.flipsports.gmx.streaming.common.conversion.TupleOps.toTuple2
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner

class PayloadIsNotEmptySpec extends StreamingTestBase with FlinkJobsTestRunner {

  "PayloadIsNotEmpty" should {

    "return succeeded when proper data is provided" in {
      val definition = toTuple2(DefinitionDataProvider.single)
      val raw = toTuple2(RawDataProvider.single)

      val validation = PayloadIsNotEmpty().validate(definition.f1, raw.f1)

      validation.status shouldBe true
      validation.errorCodes shouldEqual Nil
    }

    "return failures when payload is empty" in {
      val definition = toTuple2(DefinitionDataProvider.single)
      val raw = toTuple2(RawDataProvider.single)
      raw.f1.setPayload(null)

      val validation = PayloadIsNotEmpty().validate(definition.f1, raw.f1)

      validation.status shouldBe false
      validation.errorCodes shouldEqual List(EmptyPayload)
    }

  }
}
