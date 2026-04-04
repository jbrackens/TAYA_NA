package net.flipsports.gmx.filtering.api;

import net.flipsports.gmx.rewardcalculator.JsonMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class FilteredObjectDataJWrapper {
    public List<FilteredObjectData> fromJsonList(String json) {
        Optional<FilteredObjectData[]> parsed = new JsonMapper<FilteredObjectData[]>(FilteredObjectData[].class).fromJson(json);
        FilteredObjectData[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public FilteredObjectData fromJson(String json) {
        Optional<FilteredObjectData> parsed = new JsonMapper<FilteredObjectData>(FilteredObjectData.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper<FilteredObjectData>(FilteredObjectData.class).toJson(value);
        return parsed.get();
    }
}
