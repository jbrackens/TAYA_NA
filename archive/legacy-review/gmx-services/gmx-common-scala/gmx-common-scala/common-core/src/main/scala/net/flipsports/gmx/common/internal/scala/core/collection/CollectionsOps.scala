package net.flipsports.gmx.common.internal.scala.core.collection

import scala.math.Ordering.Implicits._

trait CollectionsOps {

  def outerJoin[K: Ordering, V1, V2](s1: List[(K, V1)], s2: List[(K, V2)]): List[(Option[V1], Option[V2])] = {
    joinTail(s1, s2, List.empty).map(_._2)
  }

  private def joinTail[K: Ordering, V1, V2](
      s1: List[(K, V1)],
      s2: List[(K, V2)],
      joined: List[(K, (Option[V1], Option[V2]))]): List[(K, (Option[V1], Option[V2]))] = {

    def addLeft(k1: K, v1: V1, t1: List[(K, V1)]) =
      joinTail(t1, s2, (k1, (Some(v1), None)) :: joined)

    def addRight(k2: K, v2: V2, t2: List[(K, V2)]) =
      joinTail(s1, t2, (k2, (None, Some(v2))) :: joined)

    (s1, s2) match {
      case (Nil, Nil)            => joined
      case ((k1, v1) :: t1, Nil) => addLeft(k1, v1, t1)
      case (Nil, (k2, v2) :: t2) => addRight(k2, v2, t2)

      case ((k1, v1) :: t1, (k2, v2) :: t2) => {
        if (k1 < k2)
          addLeft(k1, v1, t1)
        else if (k1 > k2)
          addRight(k2, v2, t2)
        else {
          def common[V](e: (K, V)): Boolean = e._1 == k1

          val (prefix1, suffix1) = s1.span(common)
          val (prefix2, suffix2) = s2.span(common)
          val prefix3 = for {
            x <- prefix1
            y <- prefix2
          } yield (k1, (Some(x._2), Some(y._2)))
          joinTail(suffix1, suffix2, prefix3 ++ joined)
        }
      }
    }
  }
}

object CollectionsOps extends CollectionsOps
