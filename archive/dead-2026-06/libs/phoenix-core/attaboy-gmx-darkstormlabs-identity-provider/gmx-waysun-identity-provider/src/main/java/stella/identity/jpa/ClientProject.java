package stella.identity.jpa;

import static stella.identity.jpa.ClientProject.*;

import javax.persistence.*;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter
@Getter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@NamedQueries({
    @NamedQuery(name = DELETE_BY_CLIENT_ID_PROJECT_ID, query = "DELETE FROM ClientProject cp WHERE cp.clientId = :"
        + CLIENT_ID + " AND cp.projectId = :" + PROJECT_ID),
    @NamedQuery(name = FIND_PRIMARY_BY_CLIENT_ID, query = "SELECT p from Project p, ClientProject cp WHERE cp.projectId = p.id AND cp.clientId = :"
        + CLIENT_ID + " AND cp.primary = true"),
    @NamedQuery(name = FIND_ADDITIONAL_BY_CLIENT_ID, query = "SELECT p from Project p, ClientProject cp WHERE cp.projectId = p.id AND cp.clientId = :"
        + CLIENT_ID + " AND cp.primary = false"),
    @NamedQuery(name = FIND_All_BY_CLIENT_ID, query = "SELECT p, cp from Project p, ClientProject cp WHERE cp.projectId = p.id AND cp.clientId = :"
        + CLIENT_ID + " ORDER BY cp.primary DESC"),
    @NamedQuery(name = FIND_All_BY_PROJECT_ID, query = "SELECT ce.clientId, ce.id, ce.name, cp.primary from Project p, ClientProject cp, ClientEntity ce "
        + "WHERE cp.projectId = p.id AND ce.id = cp.clientId AND p.id = :" + PROJECT_ID + " ORDER BY cp.primary DESC")
})
@Entity
@Table(name = "stella_client_project")
public class ClientProject {

  public final static String DELETE_BY_CLIENT_ID_PROJECT_ID = "deleteByClientIdAndProjectId";
  public final static String FIND_PRIMARY_BY_CLIENT_ID = "findPrimaryByClientId";
  public final static String FIND_ADDITIONAL_BY_CLIENT_ID = "findAdditionalByClientId";
  public final static String FIND_All_BY_CLIENT_ID = "findAllByClientId";
  public final static String FIND_All_BY_PROJECT_ID = "findAllByProjectId";
  public final static String CLIENT_ID = "clientId";
  public final static String PROJECT_ID = "projectId";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @EqualsAndHashCode.Include
  @Column(name = "client_id")
  private String clientId;

  @EqualsAndHashCode.Include
  @Column(name = "project_id")
  private Long projectId;

  @Column(name = "is_primary")
  private boolean primary;

  public ClientProject(String clientId, Long projectId, boolean primary) {
    this.clientId = clientId;
    this.projectId = projectId;
    this.primary = primary;
  }
}
