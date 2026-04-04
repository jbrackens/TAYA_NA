package net.flipsports.gmx.rewardcalculator.api;

import net.flipsports.gmx.rewardcalculator.JsonMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class CasinoAndSportBetsTopupDataJWrapper {

    public List<CasinoAndSportBetsTopupData> fromJsonList(String json) {
        Optional<CasinoAndSportBetsTopupData[]> parsed = new JsonMapper<CasinoAndSportBetsTopupData[]>(CasinoAndSportBetsTopupData[].class).fromJson(json);
        CasinoAndSportBetsTopupData[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public CasinoAndSportBetsTopupData fromJson(String json) {
        Optional<CasinoAndSportBetsTopupData> parsed = new JsonMapper<CasinoAndSportBetsTopupData>(CasinoAndSportBetsTopupData.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper<CasinoAndSportBetsTopupData>(CasinoAndSportBetsTopupData.class).toJson(value);
        return parsed.get();
    }
}
