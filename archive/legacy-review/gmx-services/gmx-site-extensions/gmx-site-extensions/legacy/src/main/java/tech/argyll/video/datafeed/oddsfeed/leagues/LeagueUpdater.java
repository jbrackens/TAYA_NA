package tech.argyll.video.datafeed.oddsfeed.leagues;

import static tech.argyll.video.domain.model.PartnerType.SPORT_NATION;

import java.util.List;
import javax.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import net.flipsports.gmx.common.internal.partner.atr.league.ATRLeaguesCorrector;
import net.flipsports.gmx.common.internal.partner.atr.league.ATRSupportedLeagues;
import net.flipsports.gmx.common.internal.partner.commons.cons.SportType;
import net.flipsports.gmx.common.internal.partner.rmg.league.RMGLeaguesCorrector;
import net.flipsports.gmx.common.internal.partner.rmg.league.RMGSupportedLeagues;
import net.flipsports.gmx.common.internal.partner.sis.league.SISSupportedLeagues;
import tech.argyll.video.core.sbtech.SBTechBranchType;
import tech.argyll.video.core.sbtech.SBTechOperatorType;
import tech.argyll.video.core.sbtech.SBTechTypeFinder;
import tech.argyll.video.datafeed.oddsfeed.countries.CountriesCache;
import tech.argyll.video.datafeed.oddsfeed.leagues.model.LeagueDict;
import tech.argyll.video.datafeed.oddsfeed.leagues.model.Sport;
import tech.argyll.video.domain.LeagueDao;
import tech.argyll.video.domain.model.LeagueModel;
import tech.argyll.video.domain.model.PartnerType;

@Slf4j
public class LeagueUpdater {

  private final LeagueDao leagueDao;

  private final SBTechTypeFinder typeFinder;

  private final CountriesCache countriesCache;

  private final ATRSupportedLeagues atrSupportedLeagues;
  private final ATRLeaguesCorrector atrLeaguesCorrector;

  private final RMGSupportedLeagues rmgSupportedLeagues;
  private final RMGLeaguesCorrector rmgLeaguesCorrector;

  private final SISSupportedLeagues sisSupportedLeagues;

  @Inject
  public LeagueUpdater(
      LeagueDao leagueDao,
      SBTechTypeFinder typeFinder,
      CountriesCache countriesCache,
      ATRSupportedLeagues atrSupportedLeagues,
      ATRLeaguesCorrector atrLeaguesCorrector,
      RMGSupportedLeagues rmgSupportedLeagues,
      RMGLeaguesCorrector rmgLeaguesCorrector,
      SISSupportedLeagues sisSupportedLeagues) {
    this.leagueDao = leagueDao;
    this.typeFinder = typeFinder;
    this.countriesCache = countriesCache;
    this.atrSupportedLeagues = atrSupportedLeagues;
    this.atrLeaguesCorrector = atrLeaguesCorrector;
    this.rmgSupportedLeagues = rmgSupportedLeagues;
    this.rmgLeaguesCorrector = rmgLeaguesCorrector;
    this.sisSupportedLeagues = sisSupportedLeagues;
  }

  public void updateDict(List<Sport> sports, SBTechOperatorType operator) {
    PartnerType partnerType = operator.getPartnerType();

    sports.stream()
        .filter(this::isSupported)
        .parallel()
        .forEach(
            sport ->
                sport
                    .getLeagues()
                    .forEach(
                        league -> {
                          this.updateLeague(partnerType, sport, league);
                        }));

    log.info("Updated leagues");
  }

  private boolean isSupported(Sport sport) {
    SBTechBranchType branchType = typeFinder.findBranchTypeById(sport.getSportID());
    if (branchType == null) {
      log.debug("Not supported sport in league dict {} - skipping", sport.getSportID());
      return false;
    } else {
      return true;
    }
  }

  private void updateLeague(PartnerType partnerType, Sport sport, LeagueDict league) {
    SBTechBranchType branchType = typeFinder.findBranchTypeById(sport.getSportID());

    LeagueModel leagueModel =
        leagueDao.findByRefIdAndPartner(league.getLeagueID().toString(), partnerType);

    if (leagueModel == null) {
      leagueModel = new LeagueModel();
    }

    SportType dictSportType = SportType.valueOf(branchType.getSportType().name());
    String countryCode = countriesCache.getCode(league.getCountryID());

    // TODO (GM-1752): use bet-and-watch to check streaming for each league
    boolean streamingAvailable = atrSupportedLeagues.isSupported(dictSportType, countryCode,
        atrLeaguesCorrector.correctName(league.getLeagueName()).orElse(league.getLeagueName()));

    if (SPORT_NATION.equals(partnerType)) {
      streamingAvailable = streamingAvailable || rmgSupportedLeagues.isSupported(dictSportType, countryCode,
          rmgLeaguesCorrector.correctName(league.getLeagueName()).orElse(league.getLeagueName()));
    }

    streamingAvailable = streamingAvailable || sisSupportedLeagues.isSupported(dictSportType, countryCode, league.getLeagueName());

    leagueModel.setSport(branchType.getSportType());
    leagueModel.setPartner(partnerType);
    leagueModel.setRefId(league.getLeagueID().toString());
    leagueModel.setName(league.getLeagueName());
    leagueModel.setCountryRefId(league.getCountryID().toString());
    leagueModel.setCountryCode(countryCode);
    leagueModel.setStreamingAvailable(streamingAvailable);
    leagueModel.save();
  }
}
