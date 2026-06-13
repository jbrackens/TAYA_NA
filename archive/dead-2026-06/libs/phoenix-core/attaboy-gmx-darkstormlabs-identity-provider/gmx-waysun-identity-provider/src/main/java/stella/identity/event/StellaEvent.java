package stella.identity.event;

import java.time.OffsetDateTime;
import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StellaEvent {

  private OffsetDateTime messageOriginDateUTC;
  private String messageType;
  private List<EventPayloadField> payload;
  private final String source = "internal";
  private String onBehalfOfUserId;
}
