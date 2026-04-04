package gmx.dataapi.internal.siteextensions.selection;

public enum SelectionRunnerStatusEnum {
  AntePost("Ante-post"),
  DOE("DOE"),
  SP("SP"),
  NR("NR"),
  UNKNOWABLE("Unknowable");

  public final String statusValue;

  SelectionRunnerStatusEnum(String statusValue) {
    this.statusValue = statusValue;
  }
}
