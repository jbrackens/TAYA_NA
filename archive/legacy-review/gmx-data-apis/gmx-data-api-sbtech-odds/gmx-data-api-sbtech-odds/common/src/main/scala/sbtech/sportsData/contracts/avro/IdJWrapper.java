package sbtech.sportsData.contracts.avro;


import java.util.Arrays;
import java.util.List;
import java.util.Optional;


public class IdJWrapper {

    public List<id> fromJsonList(String json) {
        Optional<id[]> parsed = new JsonMapper<id[]>(id[].class).fromJson(json);
        id[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public id fromJson(String json) {
        Optional<id> parsed = new JsonMapper<id>(id.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper<id>(id.class).toJson(value);
        return parsed.get();
    }


}
