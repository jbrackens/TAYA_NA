package SBTech.Microservices.DataStreaming.DTO.EventsInfo.v1;

import net.flipsports.gmx.dataapi.internal.common.core.JsonJUtil;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class EventInfoJWrapper {

    public List<EventInfo> fromJsonList(String json) {
        Optional<EventInfo[]> parsed = new JsonJUtil<>(EventInfo[].class).fromJson(json);
        EventInfo[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public EventInfo fromJson(String json) {
        Optional<EventInfo> parsed = new JsonJUtil<>(EventInfo.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonJUtil<>(EventInfo.class).toJson(value);
        return parsed.get();
    }

}
