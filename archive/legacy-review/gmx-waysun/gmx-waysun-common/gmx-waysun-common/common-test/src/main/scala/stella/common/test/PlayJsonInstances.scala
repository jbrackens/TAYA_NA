package stella.common.test

import pl.iterators.kebs.macros.CaseClass1Rep
import play.api.libs.json.Format

trait PlayJsonInstances {
  implicit def taggedFormat[T, TT](implicit ev: CaseClass1Rep[T, TT], f: Format[TT]): Format[T] =
    Format(f.map(ev.apply), f.contramap(ev.unapply))
}
