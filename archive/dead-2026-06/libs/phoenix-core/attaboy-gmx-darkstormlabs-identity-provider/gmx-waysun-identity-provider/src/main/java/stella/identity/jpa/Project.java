package stella.identity.jpa;

import static stella.identity.jpa.Project.*;

import java.time.OffsetDateTime;
import java.util.UUID;

import javax.persistence.*;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "stella_project")
@NamedQueries({
    @NamedQuery(name = FIND_ALL, query = "from Project"),
    @NamedQuery(name = FIND_BY_REALM, query = "from Project where realmId = :" + REALM_ID),
    @NamedQuery(name = FIND_BY_PROJECT_PUBLIC_ID, query = "from Project where project_public_id = :" + PROJECT_PUBLIC_ID),
    @NamedQuery(name = FIND_BY_REALM_AND_PROJECT_PUBLIC_ID, query = "from Project where realmId = :" + REALM_ID
        + " and project_public_id = :"
        + PROJECT_PUBLIC_ID),
    @NamedQuery(name = FIND_BY_ID, query = "from Project where id = :" + PROJECT_ID),
    @NamedQuery(name = FIND_BY_REALM_AND_KID, query = "from Project where realmId = :" + REALM_ID + " and kid = :" + KID)
})
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Project {

  public final static String FIND_ALL = "findAll";
  public final static String FIND_BY_REALM = "findByRealm";
  public final static String FIND_BY_ID = "findByProjectId";
  public final static String FIND_BY_PROJECT_PUBLIC_ID = "findByProjectPublicId";
  public final static String FIND_BY_REALM_AND_PROJECT_PUBLIC_ID = "findByRealmAndProjectPublicId";
  public final static String FIND_BY_REALM_AND_KID = "findByRealmAndKid";
  public final static String REALM_ID = "realmId";
  public final static String PROJECT_PUBLIC_ID = "projectPublicId";
  public final static String PROJECT_ID = "projectId";
  public final static String KID = "kid";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @EqualsAndHashCode.Include
  @Column(name = "realm_id")
  private String realmId;

  @Column(name = "name")
  private String name;

  @EqualsAndHashCode.Include
  @Column(name = "project_public_id")
  private UUID projectPublicId;

  @Column(name = "description")
  private String description;

  @Column(name = "kid")
  private String kid;

  @Column(name = "created_at", insertable = false, updatable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", insertable = false, updatable = false)
  private OffsetDateTime updatedAt;
}
