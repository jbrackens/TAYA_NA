package phoenix.utils.cryptography

import phoenix.core.persistence.ExtendedPostgresProfile.api._

object EncryptionSlickMappers {
  implicit val encryptedResultMapper: BaseColumnType[EncryptedResult] =
    MappedColumnType.base[EncryptedResult, String](_.value, EncryptedResult.apply)
}
