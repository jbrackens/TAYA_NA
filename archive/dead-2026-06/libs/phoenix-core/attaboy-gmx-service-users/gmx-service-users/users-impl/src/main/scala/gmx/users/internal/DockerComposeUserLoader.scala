package gmx.users.internal

import com.lightbend.lagom.scaladsl.client.ConfigurationServiceLocatorComponents
import com.lightbend.lagom.scaladsl.server.{ LagomApplication, LagomApplicationContext }

class DockerComposeUserLoader extends UserLoader {

  override def load(context: LagomApplicationContext): LagomApplication =
    new UserApplication(context) with ConfigurationServiceLocatorComponents

}
