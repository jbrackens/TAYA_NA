package net.flipsports.gmx.rewardcalculator.api;

import net.flipsports.gmx.rewardcalculator.JsonMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class UserRequestDataJWrapper {

    public List<UserRequestData> fromJsonList(String json) {
        Optional<UserRequestData[]> parsed = new JsonMapper<UserRequestData[]>(UserRequestData[].class).fromJson(json);
        UserRequestData[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public UserRequestData fromJson(String json) {
        Optional<UserRequestData> parsed = new JsonMapper<UserRequestData>(UserRequestData.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonMapper<UserRequestData>(UserRequestData.class).toJson(value);
        return parsed.get();
    }
    
}
