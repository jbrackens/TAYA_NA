package stella.common.http.jwt

trait AuthContext {
  def permissions: Permissions
}
