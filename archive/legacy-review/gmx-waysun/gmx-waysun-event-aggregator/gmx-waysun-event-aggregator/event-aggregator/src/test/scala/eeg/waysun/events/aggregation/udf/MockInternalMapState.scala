package eeg.waysun.events.aggregation.udf

import org.apache.flink.api.common.state.MapState
import scala.collection.JavaConverters.{iterableAsScalaIterable, mapAsJavaMap}
import java.util

class MockInternalMapState[UK, UV] extends MapState[UK, UV] {
  val state: util.Map[UK, UV] = new util.HashMap[UK, UV]()
  override def clear() = state.clear()
  override def get(key: UK) = state.get(key)
  override def remove(key: UK) = state.remove(key)
  override def contains(key: UK) = state.containsKey(key)
  override def keys() = state.keySet()
  override def values() = state.values()
  override def iterator() = entries().iterator()
  override def entries() = state.entrySet()
  override def putAll(map: util.Map[UK, UV]): Unit = map.forEach(put)
  override def put(key: UK, value: UV) = state.put(key, value)
  def java = this
  object api {
    object scala {
      def keys(): Seq[UK] = iterableAsScalaIterable(java.keys()).toSeq
      def values(): Seq[UV] = iterableAsScalaIterable(java.values()).toSeq
      def putAll(map: Map[UK, UV]): Unit = java.putAll(mapAsJavaMap(map))
    }
  }
}
