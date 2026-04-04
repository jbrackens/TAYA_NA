package net.flipsports.gmx.racingroulette.api;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class EventIdJWrapper {
    public List<EventId> fromJsonList(String json) {
        Optional<EventId[]> parsed = new JsonMapper<EventId[]>(EventId[].class).fromJson(json);
        EventId[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public EventId fromJson(String json) {
        Optional<EventId> parsed = new JsonMapper<EventId>(EventId.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper<EventId>(EventId.class).toJson(value);
        return parsed.get();
    }
}
