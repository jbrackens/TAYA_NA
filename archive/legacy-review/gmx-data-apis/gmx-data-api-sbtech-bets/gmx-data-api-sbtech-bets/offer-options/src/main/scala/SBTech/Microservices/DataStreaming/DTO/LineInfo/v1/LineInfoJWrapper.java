package SBTech.Microservices.DataStreaming.DTO.LineInfo.v1;

import net.flipsports.gmx.dataapi.internal.common.core.JsonJUtil;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class LineInfoJWrapper {

    public List<LineInfo> fromJsonList(String json) {
        Optional<LineInfo[]> parsed = new JsonJUtil<>(LineInfo[].class).fromJson(json);
        LineInfo[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public LineInfo fromJson(String json) {
        Optional<LineInfo> parsed = new JsonJUtil<>(LineInfo.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonJUtil<>(LineInfo.class).toJson(value);
        return parsed.get();
    }

}
