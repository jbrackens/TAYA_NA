package net.flipsports.gmx.racingroulette.api;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class EventJWrapper {
    public List<Event> fromJsonList(String json) {
        Optional<Event[]> parsed = new JsonMapper<Event[]>(Event[].class).fromJson(json);
        Event[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public Event fromJson(String json) {
        Optional<Event> parsed = new JsonMapper<Event>(Event.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper<Event>(Event.class).toJson(value);
        return parsed.get();
    }
}
