package stella.events.http.routes.json

import java.util.{ArrayList => JArrayList}
import java.util.{List => JList}

import stella.dataapi.platformevents.Field

object ScalaToJavaUtils {
  def toJavaList(payload: List[Field]): JList[Field] = {
    val list = new JArrayList[Field](payload.length)
    payload.foreach(list.add)
    list
  }
}
