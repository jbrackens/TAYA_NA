package phoenix.core

object MapUtils {
  implicit class MapOps[K, V](self: Map[K, V]) {

    /**
     * Update a mapping for the specified key and its current optionally-mapped value
     * (`Some` if there is current mapping, `None` if not).
     *
     * If the remapping function returns `Some(v)`, the mapping is updated with the new value `v`.
     * If the remapping function returns `None`, the mapping is removed (or remains absent if initially absent).
     * If the function itself throws an exception, the exception is rethrown, and the current mapping is left unchanged.
     *
     * @param key the key value
     * @param remappingFunction a partial function that receives current optionally-mapped value and return a new mapping
     * @return A new map with the updated mapping with the key
     */
    def updatedWith[V1 >: V](key: K)(remappingFunction: Option[V] => Option[V1]): Map[K, V1] = {
      val previousValue = self.get(key)
      val nextValue = remappingFunction(previousValue)
      (previousValue, nextValue) match {
        case (None, None)    => self
        case (Some(_), None) => self - key
        case (_, Some(v))    => self.updated(key, v)
      }
    }
  }
}
