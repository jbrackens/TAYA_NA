package stella.identity.spi.impl;

import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import java.sql.SQLException;
import java.util.UUID;

import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.EntityTransaction;
import javax.persistence.Persistence;

import liquibase.Contexts;
import liquibase.Liquibase;
import liquibase.database.DatabaseConnection;
import liquibase.database.jvm.JdbcConnection;
import liquibase.exception.LiquibaseException;
import liquibase.resource.ClassLoaderResourceAccessor;
import liquibase.resource.ResourceAccessor;
import org.apache.commons.lang.RandomStringUtils;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.postgresql.ds.PGSimpleDataSource;
import org.testcontainers.containers.PostgreSQLContainer;

import org.keycloak.connections.jpa.JpaConnectionProvider;
import org.keycloak.models.KeycloakContext;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.jpa.PersistenceExceptionConverter;
import org.keycloak.models.jpa.entities.ClientEntity;
import org.keycloak.models.jpa.entities.RealmEntity;
import org.keycloak.models.jpa.entities.UserEntity;

import stella.identity.jpa.ClientProject;

@ExtendWith(MockitoExtension.class)
public abstract class DBTestBase {

  public static final String postgresDockerImageName = "postgres:13.2";
  public static final String dbName = "keycloak";
  public static final String dbUser = "keycloak";
  public static final String dbPassword = "password";

  protected static EntityManagerFactory entityManagerFactory;
  protected static EntityManager entityManager;

  @Mock
  protected KeycloakSession keycloakSession;
  @Mock
  protected KeycloakContext keycloakContext;
  @Mock
  protected RealmModel realmModel;
  @Mock
  protected JpaConnectionProvider jpaConnectionProvider;

  protected static PostgreSQLContainer postgreSQLContainer;

  protected RealmEntity realm;

  static {
    postgreSQLContainer = new PostgreSQLContainer<>(postgresDockerImageName)
        .withDatabaseName(dbName)
        .withUsername(dbUser)
        .withPassword(dbPassword)
        .withInitScript("keycloak-17.0.1-init.sql");
  }

  @BeforeAll
  protected static void init() throws SQLException, LiquibaseException {
    postgreSQLContainer.start();
    System.setProperty("db.host", postgreSQLContainer.getContainerIpAddress());
    System.setProperty("db.port", postgreSQLContainer.getFirstMappedPort().toString());
    System.setProperty("db.user", dbUser);
    System.setProperty("db.password", dbPassword);
    System.setProperty("db.name", dbName);

    PGSimpleDataSource ds = new PGSimpleDataSource();
    ds.setUrl(postgreSQLContainer.getJdbcUrl());
    ds.setUser(postgreSQLContainer.getUsername());
    ds.setPassword(postgreSQLContainer.getPassword());

    DatabaseConnection dbconn = new JdbcConnection(ds.getConnection());
    ResourceAccessor ra = new ClassLoaderResourceAccessor();
    Liquibase liquibase = new Liquibase("META-INF/project-changelog.xml", ra, dbconn);
    liquibase.update(new Contexts());

    entityManagerFactory = Persistence.createEntityManagerFactory("my-persistence-unit");
    entityManager = PersistenceExceptionConverter.create(entityManagerFactory.createEntityManager());
  }

  @AfterAll
  static void afterAll() {
    entityManager.close();
    entityManagerFactory.close();
    postgreSQLContainer.close();
  }

  @BeforeEach
  void beforeEach() {
    realm = createRealm();
    when(keycloakSession.getContext()).thenReturn(keycloakContext);
    when(keycloakContext.getRealm()).thenReturn(realmModel);
    lenient().when(realmModel.getId()).thenReturn(realm.getId());
    lenient().when(keycloakSession.getProvider(JpaConnectionProvider.class)).thenReturn(jpaConnectionProvider);
    lenient().when(jpaConnectionProvider.getEntityManager()).thenReturn(entityManager);
  }

  protected RealmEntity createRealm() {
    RealmEntity realmEntity = new RealmEntity();
    realmEntity.setId(RandomStringUtils.randomAlphanumeric(10));
    entityManager.persist(realmEntity);
    return realmEntity;
  }

  protected ClientEntity createRandomClient(RealmEntity realm) {
    ClientEntity clientEntity = new ClientEntity();
    clientEntity.setId(RandomStringUtils.randomAlphanumeric(36));
    clientEntity.setClientId(RandomStringUtils.randomAlphanumeric(20));
    clientEntity.setRealmId(realm.getId());
    entityManager.persist(clientEntity);
    return clientEntity;
  }

  protected UserEntity createRandomUser() {
    UserEntity userEntity = new UserEntity();
    userEntity.setId(UUID.randomUUID().toString());
    userEntity.setRealmId(realm.getId());
    userEntity.setUsername(RandomStringUtils.randomAlphabetic(20));
    entityManager.persist(userEntity);
    return userEntity;
  }

  protected void associateClientWithProject(String clientId, Long projectId, Boolean primaryProject) {
    ClientEntity client = entityManager.createNamedQuery("findClientByClientId", ClientEntity.class)
        .setParameter("clientId", clientId)
        .setParameter("realm", realm.getId())
        .getSingleResult();

    entityManager.persist(new ClientProject(client.getId(), projectId, primaryProject));
  }

  protected void runAndClean(Runnable runnable) {
    EntityTransaction transaction = entityManager.getTransaction();
    transaction.begin();
    try {
      runnable.run();
      entityManager.flush();
    } finally {
      entityManager.clear();
      transaction.rollback();
    }
  }

  protected void runAndCleanExpectingFailure(Runnable runnable) {
    EntityTransaction transaction = entityManager.getTransaction();
    transaction.begin();
    try {
      runnable.run();
    } finally {
      entityManager.clear();
      transaction.rollback();
    }
  }

}
