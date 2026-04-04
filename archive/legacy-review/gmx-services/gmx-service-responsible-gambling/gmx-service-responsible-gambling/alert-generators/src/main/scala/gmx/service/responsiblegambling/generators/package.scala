package gmx.service.responsiblegambling.generators

/**
 * Core immutable datatype for handling events and determining when to dispatch an alert.
 *
 * Backed by a `List[T]` where T there is a `HasTimestamp[T]` defined. The list is then
 * keep in chronological order based on the values of `T.timestamp`.
 *
 *
 * @param items
 * @param ts
 * @tparam T
 */
case class AlertGeneratorState[T](val items: List[T])(implicit ts: HasTimestamp[T]) {

  // Sorts the items into chronological order.
  // We only ever sort in ascending order so there's currently
  // no option to create an instance of this class with your own sorter.
  val sorter = (a: T, b: T) => ts.timestamp(a) > ts.timestamp(b)

  /**
   * Points to the most recent item.
   *
   * @return
   */
  def head: Option[T] =
    items match {
      case Nil => None
      case _   => Some(items.head)
    }

  def size = items.size

  /**
   * Adds an item to the backing list.
   *
   * @param item
   * @return
   */
  def +(item: T): AlertGeneratorState[T] =
    AlertGeneratorState((items :+ item).sortWith(sorter))

  /**
   * The number of entries in the list that
   * occurred after the timestamp supplied.
   *
   * @param earliest
   * @return
   */
  def countEntriesAfter(earliest: Long): Int =
    onlyEntriesAfter(earliest).size

  /**
   * Whether or not there are items which
   * occurred after the supplied timestamp.
   *
   * @param earliest
   * @return
   */
  def hasEntriesAfter(earliest: Long): Boolean =
    countEntriesAfter(earliest) > 0

  /**
   * Returns a new instance of this class wrapping only
   * those items which occurred after the supplied timestamp.
   *
   * @param earliest
   * @return
   */
  def onlyEntriesAfter(earliest: Long): AlertGeneratorState[T] =
    AlertGeneratorState(items.filter(ts.timestamp(_) > earliest))

  /**
   * Returns a new instance of this class wrapping those
   * items which occurred after the given timestamp AND which
   * satisy the filter supplied.
   *
   * @param earliest
   * @param filter
   * @return
   */
  def onlyFilteredEntriesAfter(earliest: Long)(filter: T => Boolean): AlertGeneratorState[T] =
    AlertGeneratorState(onlyEntriesAfter(earliest).items.filter(filter))

  /**
   * Returns the earliest timestamp available in the
   * list of stored items, or `None` if this state is empty
   *
   * @return
   */
  def earliestTimestamp: Option[Long] =
    items match {
      case Nil => None
      case _   => Some(ts.timestamp(items.last))
    }
}

object AlertGeneratorState {

  def apply[T](implicit ts: HasTimestamp[T]): AlertGeneratorState[T] =
    apply(List.empty)

  def apply[T](event: T)(implicit ts: HasTimestamp[T]): AlertGeneratorState[T] =
    apply(List(event))

  def apply[T](events: List[T])(implicit ts: HasTimestamp[T]): AlertGeneratorState[T] =
    new AlertGeneratorState[T](events)
}

import gmx.data.SportsBetPlaced
import gmx.dataapi.internal.customer.{ DepositLimitSet, TimeoutSet }

/**
 * Trait for the Typeclass used to add the `timestamp` property
 * to an object - used for storing these objects in a generic state object.
 *
 * @tparam A
 */
trait HasTimestamp[A] {
  def timestamp(a: A): Long
}

object HasTimestamp {
  def apply[A](implicit ts: HasTimestamp[A]): HasTimestamp[A] = ts

  def timstamp[A: HasTimestamp](a: A) = HasTimestamp[A].timestamp(a)

  implicit class HasTimestampOps[A: HasTimestamp](a: A) {
    def timestamp = HasTimestamp[A].timestamp(a)
  }

  implicit val DepositLimitSetTimestamp: HasTimestamp[DepositLimitSet] =
    x => x.messageOriginDateUTC

  implicit val TimeoutSetTimestamp: HasTimestamp[TimeoutSet] =
    x => x.messageOriginDateUTC

  implicit val SportsBetPlacedTimestamp: HasTimestamp[SportsBetPlaced] =
    x => x.placedAt

  implicit val betTimestamp: HasTimestamp[Bet] =
    x => x.timestamp
}
