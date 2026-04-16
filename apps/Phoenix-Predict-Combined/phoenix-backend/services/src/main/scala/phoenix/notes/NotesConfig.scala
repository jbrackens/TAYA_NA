package phoenix.notes

import pureconfig.generic.auto._

import phoenix.config.PhoenixProjectionConfig
import phoenix.core.config.BaseConfig

final case class NotesConfig(projections: NotesProjectionsConfig)
final case class NotesProjectionsConfig(chequeTransactions: PhoenixProjectionConfig)

object NotesConfig {
  object of extends BaseConfig[NotesConfig]("phoenix.notes")
}
