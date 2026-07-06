package phoenix.betgenius

import io.circe.generic.extras._

package object domain {
  implicit val configuration: Configuration = Configuration.default.copy(transformMemberNames = _.capitalize)

}
