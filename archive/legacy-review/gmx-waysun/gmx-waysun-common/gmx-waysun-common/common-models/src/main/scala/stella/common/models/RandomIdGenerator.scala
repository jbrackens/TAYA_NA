package stella.common.models

import java.util.UUID

import pl.iterators.kebs.macros.CaseClass1Rep

trait RandomIdGenerator[T] {
  def random()(implicit ev: CaseClass1Rep[T, UUID]): T = ev.apply(UUID.randomUUID())
}
