package gmx.dataapi.internal.siteextensions.event;

public enum ParticipantRunnerStatusEnum {
  AntePost("Ante-post"),
  DOE("DOE"),
  NR("NR"),
  UNKNOWABLE("Unknowable");

  public final String statusValue;

  ParticipantRunnerStatusEnum(String statusValue) {
    this.statusValue = statusValue;
  }
}