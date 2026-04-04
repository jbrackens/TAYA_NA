package SBTech.Microservices.DataStreaming.DTO.LineInfo.v1;

import net.flipsports.gmx.dataapi.internal.common.core.JsonJUtil;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

public class LineInfoIdJWrapper {

    public List<LineInfoId> fromJsonList(String json) {
        Optional<LineInfoId[]> parsed = new JsonJUtil<>(LineInfoId[].class).fromJson(json);
        LineInfoId[] pojos = parsed.get();
        return Arrays.asList(pojos);
    }

    public LineInfoId fromJson(String json) {
        Optional<LineInfoId> parsed = new JsonJUtil<>(LineInfoId.class).fromJson(json);
        return parsed.get();
    }

    public String toJson(Object value) {
        Optional<String> parsed = new JsonJUtil<>(LineInfoId.class).toJson(value);
        return parsed.get();
    }

}
