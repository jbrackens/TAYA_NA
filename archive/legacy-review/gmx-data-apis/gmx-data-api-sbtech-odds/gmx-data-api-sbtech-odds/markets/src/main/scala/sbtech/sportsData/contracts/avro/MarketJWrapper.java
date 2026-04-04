package sbtech.sportsData.contracts.avro;


import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class MarketJWrapper {

    public List<market> fromJsonList(String json) {
        Optional<market[]> parsed = new JsonMapper<market[]>(market[].class).fromJson(json);
        market[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public market fromJson(String json) {
        Optional<market> parsed = new JsonMapper<market>(market.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper<market>(market.class).toJson(value);
        return parsed.get();
    }


}
