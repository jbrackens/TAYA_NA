package stella.identity.event;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class EventPayloadField {
  private String name;
  private String valueType;
  private String value;
}
