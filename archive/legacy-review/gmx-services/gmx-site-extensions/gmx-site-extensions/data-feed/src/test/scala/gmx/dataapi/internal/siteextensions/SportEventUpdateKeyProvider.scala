package gmx.dataapi.internal.siteextensions

object SportEventUpdateKeyProvider {

  val util = new JsonUtil()

  def fromJson(json: String): SportEventUpdateKey =
    util.fromJson[SportEventUpdateKey](json)
}
