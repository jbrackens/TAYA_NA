package tech.argyll.video.datafeed.oddsfeed.countries.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Wither;

@Data
@Wither
@NoArgsConstructor
@AllArgsConstructor
public class CountryDict {
  private long countryID;
  private String countryCode;
  private String countryName;
}