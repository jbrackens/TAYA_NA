package stella.common.models

import pl.iterators.kebs.tagged._
import pureconfig.ConfigReader

trait PureconfigInstances {
  implicit def taggedConfigReader[T: ConfigReader, Tag]: ConfigReader[T @@ Tag] = {
    implicitly[ConfigReader[T]].map(_.taggedWith[Tag])
  }
}
