package net.flipsports.gmx.racingroulette.api;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class EventsJWrapper {
    public List<EventUpdate> fromJsonList(String json) {
        Optional<EventUpdate[]> parsed = new JsonMapper<EventUpdate[]>(EventUpdate[].class).fromJson(json);
        EventUpdate[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public EventUpdate fromJson(String json) {
        Optional<EventUpdate> parsed = new JsonMapper<EventUpdate>(EventUpdate.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper<EventUpdate>(EventUpdate.class).toJson(value);
        return parsed.get();
    }
}
