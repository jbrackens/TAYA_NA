package phoenix.config.infrastructure

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

import phoenix.config.infrastructure.http.TermsRequest
import phoenix.core.JsonFormats._
import phoenix.punters.domain.TermsDaysThreshold
import phoenix.punters.infrastructure.PunterJsonFormats.currentTermsVersionCodec
import phoenix.punters.infrastructure.PunterJsonFormats.termsContentCodec

object ConfigJsonFormats {

  implicit val termsDaysThresholdCodec: Codec[TermsDaysThreshold] = Codec[Int].bimap(_.value, TermsDaysThreshold.apply)
  implicit val changeTermsRequestCodec: Codec[TermsRequest] = deriveCodec

}
