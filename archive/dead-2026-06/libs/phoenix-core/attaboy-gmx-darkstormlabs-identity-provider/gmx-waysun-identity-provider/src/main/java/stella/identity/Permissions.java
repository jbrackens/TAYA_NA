package stella.identity;

public class Permissions {

  public final static String OIDC_ADMIN_PROJECT_READ = "oidc:admin:project:read";
  public final static String OIDC_SUPERADMIN_PROJECT_READ = "oidc:superadmin:project:read";
  public final static String OIDC_ADMIN_PROJECT_WRITE = "oidc:admin:project:write";
  public final static String OIDC_ADMIN_SIGN = "oidc:admin:sign";
  public final static String OIDC_ADMIN_SIGN_BEHALF_OF_PREFIX = "oidc:admin:sign:";
  public final static String EVENT_INGESTOR_ADMIN_ANY_EVENT_WRITE = "event_ingestor:admin:any:event:write";

  public static String signBehalfOfPermission(String kid) {
    return String.format("%s%s", OIDC_ADMIN_SIGN_BEHALF_OF_PREFIX, kid);
  }
}
