package phoenix.betgenius.domain

object BetgeniusSportMapper {

  // taken from https://api.geniussports.com/Fixtures-v1/INT/regions response
  private val sportInformationMap: Map[Int, BetgeniusSportInformation] = Map(
    3795074 -> BetgeniusSportInformation(name = "FIFA", abbreviation = "FIFA"),
    3795066 -> BetgeniusSportInformation(name = "Counter-Strike", abbreviation = "CS:GO"),
    3795069 -> BetgeniusSportInformation(name = "Starcraft 2", abbreviation = "SC2"),
    3795082 -> BetgeniusSportInformation(name = "Starcraft 1", abbreviation = "SC1"),
    3795067 -> BetgeniusSportInformation(name = "Dota 2", abbreviation = "Dota2"),
    3795070 -> BetgeniusSportInformation(name = "World of Tanks", abbreviation = "WoT"),
    3795101 -> BetgeniusSportInformation(name = "Age of Empires II", abbreviation = "AoE2"),
    3795086 -> BetgeniusSportInformation(name = "Kings of Glory", abbreviation = "KoG"),
    3795085 -> BetgeniusSportInformation(name = "Warcraft 3", abbreviation = "W3"),
    3795077 -> BetgeniusSportInformation(name = "Call of Duty", abbreviation = "CoD"),
    3795071 -> BetgeniusSportInformation(name = "Heroes of the Storm", abbreviation = "HOTS"),
    3795072 -> BetgeniusSportInformation(name = "Overwatch", abbreviation = "Overwatch"),
    3795083 -> BetgeniusSportInformation(name = "Crossfire", abbreviation = "Crossfire"),
    3795084 -> BetgeniusSportInformation(name = "Paladins", abbreviation = "Paladins"),
    3795073 -> BetgeniusSportInformation(name = "Hearthstone", abbreviation = "Hearthstone"),
    3795075 -> BetgeniusSportInformation(name = "Street Fighter", abbreviation = "SF"),
    3795078 -> BetgeniusSportInformation(name = "Rocket League", abbreviation = "RocketLeague"),
    3795079 -> BetgeniusSportInformation(name = "Virtual Games", abbreviation = "VG"),
    3795080 -> BetgeniusSportInformation(name = "Halo", abbreviation = "HALO"),
    3795087 -> BetgeniusSportInformation(name = "Arena of Valor", abbreviation = "AoV"),
    3795088 -> BetgeniusSportInformation(name = "Gears of War", abbreviation = "GoW"),
    3795089 -> BetgeniusSportInformation(name = "Quake", abbreviation = "Quake"),
    3795092 -> BetgeniusSportInformation(name = "NBA2K", abbreviation = "NBA2K"),
    3795093 -> BetgeniusSportInformation(name = "Rainbow Six", abbreviation = "R6"),
    3795095 -> BetgeniusSportInformation(name = "Pro Evolution Soccer", abbreviation = "PES"),
    3795096 -> BetgeniusSportInformation(name = "NHL", abbreviation = "NHL"),
    3795098 -> BetgeniusSportInformation(name = "Valorant", abbreviation = "Valorant"),
    3795081 -> BetgeniusSportInformation(name = "World of Warcraft Arena", abbreviation = "WoW Arena"),
    3795068 -> BetgeniusSportInformation(name = "League of Legends", abbreviation = "LoL"))

  def getSportInformation(regionId: RegionId) = sportInformationMap.get(regionId.value)

  case class BetgeniusSportInformation(name: String, abbreviation: String)
  object BetgeniusSportInformation {
    val unknown = BetgeniusSportInformation("Unknown", "N/A")
  }
}
