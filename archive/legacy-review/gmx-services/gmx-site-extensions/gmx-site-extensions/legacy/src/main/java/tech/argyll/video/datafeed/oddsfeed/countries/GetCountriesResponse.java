package tech.argyll.video.datafeed.oddsfeed.countries;

import java.util.List;
import lombok.Data;
import tech.argyll.video.datafeed.oddsfeed.AbstractResponse;
import tech.argyll.video.datafeed.oddsfeed.countries.model.CountryDict;

@Data
public class GetCountriesResponse extends AbstractResponse {
  private List<CountryDict> countries;
}
