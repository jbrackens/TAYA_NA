package phoenix.core

import scala.collection.immutable.VectorBuilder
import scala.collection.mutable

object SeqUtils {
  implicit class SeqOps[A](self: Seq[A]) {

    /**
     * @return (key, elements-for-key) pairs as would be returned by `groupBy`, with the additional guarantee
     *         that the order of the keys is the same
     *         as the order of the first appearances of each key in the original `Seq`.
     *         Note that `groupBy` only preserves the order of elements within each group,
     *         but guarantees nothing about the keys themselves.
     */
    def groupByWithKeyOrderPreserved[K](elemToKey: A => K): Seq[(K, Seq[A])] = {
      val groupForKey = mutable.LinkedHashMap.empty[K, mutable.Builder[A, Seq[A]]]
      for (elem <- self) {
        val key = elemToKey(elem)
        val builder = groupForKey.getOrElseUpdate(key, new VectorBuilder())
        builder += elem
      }
      val keyAndGroupPairs = new VectorBuilder[(K, Seq[A])]
      for ((k, v) <- groupForKey) {
        keyAndGroupPairs += ((k, v.result()))
      }
      keyAndGroupPairs.result()
    }

    def invariantContains(elem: A): Boolean = self.contains(elem)
  }
}
