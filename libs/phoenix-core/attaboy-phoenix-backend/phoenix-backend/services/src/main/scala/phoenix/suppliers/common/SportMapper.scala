package phoenix.suppliers.common
import phoenix.core.domain.DataProvider
import phoenix.markets.sports.SportEntity.SportId

object SportMapper {

  private val leagueOfLegends = SportId(DataProvider.Phoenix, "1")
  private val dota2 = SportId(DataProvider.Phoenix, "2")
  private val conterStrike = SportId(DataProvider.Phoenix, "3")
  private val fortnite = SportId(DataProvider.Phoenix, "4")
  private val pubg: SportId = SportId(DataProvider.Phoenix, "5")
  private val fifa = SportId(DataProvider.Phoenix, "6")
  private val nba2k = SportId(DataProvider.Phoenix, "7")
  private val overwatch = SportId(DataProvider.Phoenix, "8")
  private val hearthstone = SportId(DataProvider.Phoenix, "9")
  private val kingsOfGlory = SportId(DataProvider.Phoenix, "10")
  private val starcraft2 = SportId(DataProvider.Phoenix, "11")
  private val rocketLeague = SportId(DataProvider.Phoenix, "12")
  private val valorant = SportId(DataProvider.Phoenix, "13")
  private val starcraft1 = SportId(DataProvider.Phoenix, "14")
  private val callOfDuty = SportId(DataProvider.Phoenix, "15")
  private val rainbowSix = SportId(DataProvider.Phoenix, "16")
  private val nhl = SportId(DataProvider.Phoenix, "17")
  private val warcraft3 = SportId(DataProvider.Phoenix, "18")

  private val betgeniusSportIdMapping: Map[SportId, SportId] = Map(
    SportId(DataProvider.Betgenius, "3795074") -> fifa, // FIFA
    SportId(DataProvider.Betgenius, "3795066") -> conterStrike, // Counter-Strike
    SportId(DataProvider.Betgenius, "3795069") -> starcraft2, // Starcraft 2
    SportId(DataProvider.Betgenius, "3795082") -> starcraft1, // Starcraft 1
    SportId(DataProvider.Betgenius, "3795067") -> dota2, // Dota 2
//    SportId(DataProvider.Betgenius, "3795070") -> SportId(DataProvider.Phoenix, ""), // World of Tanks
//    SportId(DataProvider.Betgenius, "3795101") -> SportId(DataProvider.Phoenix, ""), // Age of Empires II
    SportId(DataProvider.Betgenius, "3795086") -> kingsOfGlory, // Kings of Glory
    SportId(DataProvider.Betgenius, "3795085") -> warcraft3, // Warcraft 3
    SportId(DataProvider.Betgenius, "3795077") -> callOfDuty, // Call of Duty
//    SportId(DataProvider.Betgenius, "3795071") -> SportId(DataProvider.Phoenix, ""), // Heroes of the Storm
    SportId(DataProvider.Betgenius, "3795072") -> overwatch, // Overwatch
//    SportId(DataProvider.Betgenius, "3795083") -> SportId(DataProvider.Phoenix, ""), // Crossfire
//    SportId(DataProvider.Betgenius, "3795084") -> SportId(DataProvider.Phoenix, ""), // Paladins
    SportId(DataProvider.Betgenius, "3795073") -> hearthstone, // Hearthstone
//    SportId(DataProvider.Betgenius, "3795075") -> SportId(DataProvider.Phoenix, ""), // Street Fighter
    SportId(DataProvider.Betgenius, "3795078") -> rocketLeague, // Rocket League
//    SportId(DataProvider.Betgenius, "3795079") -> SportId(DataProvider.Phoenix, ""), // Virtual Games
//    SportId(DataProvider.Betgenius, "3795080") -> SportId(DataProvider.Phoenix, ""), // Halo
//    SportId(DataProvider.Betgenius, "3795087") -> SportId(DataProvider.Phoenix, ""), // Arena of Valor
//    SportId(DataProvider.Betgenius, "3795088") -> SportId(DataProvider.Phoenix, ""), // Gears of War
//    SportId(DataProvider.Betgenius, "3795089") -> SportId(DataProvider.Phoenix, ""), // Quake
    SportId(DataProvider.Betgenius, "3795092") -> nba2k, // NBA2K
    SportId(DataProvider.Betgenius, "3795093") -> rainbowSix, // Rainbow Six
//    SportId(DataProvider.Betgenius, "3795095") -> SportId(DataProvider.Phoenix, ""), // Pro Evolution Soccer
    SportId(DataProvider.Betgenius, "3795096") -> nhl, // NHL
    SportId(DataProvider.Betgenius, "3795098") -> valorant, // Valorant
//    SportId(DataProvider.Betgenius, "3795081") -> SportId(DataProvider.Phoenix, ""), // World of Warcraft Arena
    SportId(DataProvider.Betgenius, "3795068") -> leagueOfLegends // League of Legends
  )

  private val oddinSportIdMapping: Map[SportId, SportId] = Map(
    SportId(DataProvider.Oddin, "od:sport:1") -> leagueOfLegends, // League of Legends
    SportId(DataProvider.Oddin, "od:sport:2") -> dota2, // Dota 2
    SportId(DataProvider.Oddin, "od:sport:3") -> conterStrike, // Counter-Strike: Global Offensive
    SportId(DataProvider.Oddin, "od:sport:4") -> fortnite, // Fortnite
    SportId(DataProvider.Oddin, "od:sport:5") -> pubg, // Playerunknown's Battlegrounds
    SportId(DataProvider.Oddin, "od:sport:6") -> fifa, // FIFA
    SportId(DataProvider.Oddin, "od:sport:7") -> nba2k, // NBA2K
    SportId(DataProvider.Oddin, "od:sport:8") -> overwatch, // Overwatch
    SportId(DataProvider.Oddin, "od:sport:9") -> hearthstone, // Hearthstone
    SportId(DataProvider.Oddin, "od:sport:10") -> kingsOfGlory, // Kings of Glory
    SportId(DataProvider.Oddin, "od:sport:11") -> starcraft2, // Starcraft 2
    SportId(DataProvider.Oddin, "od:sport:12") -> rocketLeague, // Rocket League
    SportId(DataProvider.Oddin, "od:sport:13") -> valorant, // Valorant
    SportId(DataProvider.Oddin, "od:sport:14") -> starcraft1, // Starcraft 1
    SportId(DataProvider.Oddin, "od:sport:15") -> callOfDuty, // Call of Duty
    SportId(DataProvider.Oddin, "od:sport:16") -> rainbowSix, // Rainbow Six
    SportId(DataProvider.Oddin, "od:sport:17") -> nhl, // NHL
    SportId(DataProvider.Oddin, "od:sport:18") -> warcraft3 // Warcraft 3
  )

  def fromExternalSportId(providerSportId: SportId): Option[SportId] =
    oddinSportIdMapping.get(providerSportId).orElse(betgeniusSportIdMapping.get(providerSportId))
}
