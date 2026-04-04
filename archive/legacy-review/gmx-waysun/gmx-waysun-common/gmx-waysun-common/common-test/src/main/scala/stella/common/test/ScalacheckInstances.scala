package stella.common.test

import org.scalacheck.Arbitrary
import pl.iterators.kebs.macros.CaseClass1Rep

trait ScalacheckInstances {
  implicit def taggedArbitrary[T, TT](implicit ev: CaseClass1Rep[T, TT], gen: Arbitrary[TT]): Arbitrary[T] = {
    Arbitrary(gen.arbitrary.map(ev.apply))
  }
}
