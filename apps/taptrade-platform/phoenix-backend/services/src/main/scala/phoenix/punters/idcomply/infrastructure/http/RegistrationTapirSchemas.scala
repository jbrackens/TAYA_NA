package phoenix.punters.idcomply.infrastructure.http

import sttp.tapir.Schema

import phoenix.punters.idcomply.domain.QuestionId
import phoenix.punters.idcomply.domain.QuestionText

object RegistrationTapirSchemas {
  implicit val questionIdSchema: Schema[QuestionId] = Schema.string

  implicit val questionTextSchema: Schema[QuestionText] = Schema.string
}
