package net.flipsports.gmx.racingroulette.api;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class SelectionsJWrapper {
    public List<SelectionUpdate> fromJsonList(String json) {
        Optional<SelectionUpdate[]> parsed = new JsonMapper<SelectionUpdate[]>(SelectionUpdate[].class).fromJson(json);
        SelectionUpdate[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public SelectionUpdate fromJson(String json) {
        Optional<SelectionUpdate> parsed = new JsonMapper<SelectionUpdate>(SelectionUpdate.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper<SelectionUpdate>(SelectionUpdate.class).toJson(value);
        return parsed.get();
    }
}
