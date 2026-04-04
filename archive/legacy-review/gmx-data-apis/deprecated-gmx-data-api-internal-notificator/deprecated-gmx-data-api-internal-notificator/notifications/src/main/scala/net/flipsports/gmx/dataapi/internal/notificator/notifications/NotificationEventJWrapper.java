package net.flipsports.gmx.dataapi.internal.notificator.notifications;

import net.flipsports.gmx.dataapi.internal.notificator.JsonMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class NotificationEventJWrapper {

    public List<NotificationEvent> fromJsonList(String json) {
        Optional<NotificationEvent[]> parsed = new JsonMapper<NotificationEvent[]>(NotificationEvent[].class).fromJson(json);
        NotificationEvent[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public NotificationEvent fromJson(String json) {
        Optional<NotificationEvent> parsed = new JsonMapper<NotificationEvent>(NotificationEvent.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper<NotificationEvent>(NotificationEvent.class).toJson(value);
        return parsed.get();
    }
}