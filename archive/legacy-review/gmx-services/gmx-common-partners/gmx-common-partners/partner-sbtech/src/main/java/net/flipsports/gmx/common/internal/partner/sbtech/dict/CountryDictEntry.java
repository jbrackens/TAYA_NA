package net.flipsports.gmx.common.internal.partner.sbtech.dict;

public class CountryDictEntry {
  private final long id;
  private final String code;
  private final String name;

  public CountryDictEntry(long id, String code, String name) {
    this.id = id;
    this.code = code;
    this.name = name;
  }

  public long getId() {
    return id;
  }

  public String getCode() {
    return code;
  }

  public String getName() {
    return name;
  }
}