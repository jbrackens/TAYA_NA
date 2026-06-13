package net.flipsports.gmx.streaming.sbtech.mappers

import net.flipsports.gmx.streaming.tests.StreamingTestBase

class DateFormatsSpec extends StreamingTestBase {

  "SbTech date" must {

    "be converted form long" in {

      // given
      val source = 1553878098830l


      // when
      val result = DateFormats.toIso(source)


      // then
      result should be ("2019-03-29T16:48:18Z")
    }
  }
}
