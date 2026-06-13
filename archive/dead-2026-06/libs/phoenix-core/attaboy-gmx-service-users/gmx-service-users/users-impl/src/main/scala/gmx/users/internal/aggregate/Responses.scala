package gmx.users.internal.aggregate

sealed trait Confirmation

case object Confirmation

sealed trait Accepted extends Confirmation

case object Accepted extends Accepted

case class Rejected(reason: String) extends Confirmation
