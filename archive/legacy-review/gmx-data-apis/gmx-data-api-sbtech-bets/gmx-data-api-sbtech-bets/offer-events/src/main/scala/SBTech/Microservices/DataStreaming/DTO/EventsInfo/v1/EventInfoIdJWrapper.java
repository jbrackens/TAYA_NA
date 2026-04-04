package SBTech.Microservices.DataStreaming.DTO.EventsInfo.v1;

import net.flipsports.gmx.dataapi.internal.common.core.JsonJUtil;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class EventInfoIdJWrapper {

    public List<EventInfoId> fromJsonList(String json) {
        Optional<EventInfoId[]> parsed = new JsonJUtil<>(EventInfoId[].class).fromJson(json);
        EventInfoId[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public EventInfoId fromJson(String json) {
        Optional<EventInfoId> parsed = new JsonJUtil<>(EventInfoId.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonJUtil<>(EventInfoId.class).toJson(value);
        return parsed.get();
    }

}
