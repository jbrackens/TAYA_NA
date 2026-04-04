package phoenix.core.serialization

import io.circe.ACursor
import io.circe.Json

trait CirceMigration {
  def apply(json: ACursor): ACursor
}

object CirceMigration {
  case class AddRequiredField(name: String, default: Json) extends CirceMigration {
    override def apply(json: ACursor): ACursor = json.withFocus(_.mapObject(_.add(name, default)))
  }

  case class RenameField(oldName: String, newName: String) extends CirceMigration {
    override def apply(json: ACursor): ACursor =
      json.withFocus(_.mapObject { x =>
        if (x.contains(oldName))
          x.remove(oldName).add(newName, x(oldName).get)
        else x
      })
  }

  case class ChangeOptionalToRequired(name: String, default: Json) extends CirceMigration {
    override def apply(json: ACursor): ACursor =
      json.withFocus(_.mapObject { x =>
        if (x(name).forall(_.isNull))
          x.add(name, default)
        else x
      })
  }

  case class ChangeOptionalToComputedRequired(name: String, default: Json => Json) extends CirceMigration {
    override def apply(json: ACursor): ACursor =
      json.withFocus(obj =>
        obj.mapObject { x =>
          if (x(name).forall(_.isNull))
            x.add(name, default(obj))
          else x
        })
  }

  def jsonForEnum(name: String): Json = Json.fromFields(Seq(name -> Json.fromFields(Nil)))
}
