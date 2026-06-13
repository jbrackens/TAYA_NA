package stella.identity.jpa;

import java.util.List;

import org.keycloak.connections.jpa.entityprovider.JpaEntityProvider;

public class ProjectJpaEntityProvider implements JpaEntityProvider {
  @Override
  public List<Class<?>> getEntities() {
    return List.of(Project.class, ClientProject.class);
  }

  @Override
  public String getChangelogLocation() {
    return "META-INF/project-changelog.xml";
  }

  @Override
  public String getFactoryId() {
    return ProjectJpaEntityProviderFactory.ID;
  }

  @Override
  public void close() {}
}
