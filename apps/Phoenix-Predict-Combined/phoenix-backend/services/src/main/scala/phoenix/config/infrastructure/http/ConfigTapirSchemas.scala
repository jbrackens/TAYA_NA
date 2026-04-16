package phoenix.config.infrastructure.http

import sttp.tapir.Schema
import sttp.tapir.SchemaType.SInteger

import phoenix.punters.domain.CurrentTermsVersion
import phoenix.punters.domain.TermsContent
import phoenix.punters.domain.TermsDaysThreshold

object ConfigTapirSchemas {
  implicit val currentTermsVersionSchema: Schema[CurrentTermsVersion] = Schema(SInteger())
  implicit val termsContentSchema: Schema[TermsContent] = Schema.string
  implicit val termsDaysThresholdSchema: Schema[TermsDaysThreshold] = Schema(SInteger())
}
