package tech.argyll.gmx.predictorgame.common.cache

import org.cache2k.{Cache => CCache}
import scalacache.Mode
import scalacache.cache2k.Cache2kCache

import scala.language.higherKinds

class LoadingCache2kCache[V](underlying: CCache[String, V]) extends Cache2kCache(underlying) {

  override def doGet[F[_]](key: String)(implicit mode: Mode[F]): F[Option[V]] = {
    mode.M.delay {
      Option(underlying.get(key))
    }
  }
}
