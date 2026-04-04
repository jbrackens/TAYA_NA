package sbtech.sportsData.contracts.avro;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class EventsJWrapper {

    public List<event> fromJsonList(String json) {
        Optional<event[]> parsed = new JsonMapper<event[]>(event[].class).fromJson(json);
        event[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public event fromJson(String json) {
        Optional<event> parsed = new JsonMapper<event>(event.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper<event>(event.class).toJson(value);
        return parsed.get();
    }
    
}
