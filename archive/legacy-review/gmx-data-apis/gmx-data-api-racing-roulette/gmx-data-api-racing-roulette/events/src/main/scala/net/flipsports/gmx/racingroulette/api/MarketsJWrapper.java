package net.flipsports.gmx.racingroulette.api;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class MarketsJWrapper {

    public List<MarketUpdate> fromJsonList(String json) {
        Optional<MarketUpdate[]> parsed = new JsonMapper<MarketUpdate[]>(MarketUpdate[].class).fromJson(json);
        MarketUpdate[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public MarketUpdate fromJson(String json) {
        Optional<MarketUpdate> parsed = new JsonMapper<MarketUpdate>(MarketUpdate.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper<MarketUpdate>(MarketUpdate.class).toJson(value);
        return parsed.get();
    }
}
