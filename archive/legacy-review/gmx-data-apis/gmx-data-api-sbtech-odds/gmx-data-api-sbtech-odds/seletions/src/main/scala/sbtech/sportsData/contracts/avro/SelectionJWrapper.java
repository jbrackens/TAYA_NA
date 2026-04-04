package sbtech.sportsData.contracts.avro;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class SelectionJWrapper {

    public List<selection> fromJsonList(String json) {
        Optional<selection[]> parsed = new JsonMapper<selection[]>(selection[].class).fromJson(json);
        selection[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public selection fromJson(String json) {
        Optional<selection> parsed = new JsonMapper<selection>(selection.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper<selection>(selection.class).toJson(value);
        return parsed.get();
    }

}
