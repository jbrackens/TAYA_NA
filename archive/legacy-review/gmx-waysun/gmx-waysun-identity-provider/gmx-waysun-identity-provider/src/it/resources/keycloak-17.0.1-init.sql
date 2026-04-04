--
-- PostgreSQL database dump
--

-- Dumped from database version 12.6 (Debian 12.6-1.pgdg100+1)
-- Dumped by pg_dump version 13.2

-- Started on 2022-03-31 15:58:11 UTC

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 243 (class 1259 OID 40641)
-- Name: admin_event_entity; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.admin_event_entity (
    id character varying(36) NOT NULL,
    admin_event_time bigint,
    realm_id character varying(255),
    operation_type character varying(255),
    auth_realm_id character varying(255),
    auth_client_id character varying(255),
    auth_user_id character varying(255),
    ip_address character varying(255),
    resource_path character varying(2550),
    representation text,
    error character varying(255),
    resource_type character varying(64)
);


ALTER TABLE public.admin_event_entity OWNER TO keycloak;

--
-- TOC entry 272 (class 1259 OID 41102)
-- Name: associated_policy; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.associated_policy (
    policy_id character varying(36) NOT NULL,
    associated_policy_id character varying(36) NOT NULL
);


ALTER TABLE public.associated_policy OWNER TO keycloak;

--
-- TOC entry 246 (class 1259 OID 40659)
-- Name: authentication_execution; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.authentication_execution (
    id character varying(36) NOT NULL,
    alias character varying(255),
    authenticator character varying(36),
    realm_id character varying(36),
    flow_id character varying(36),
    requirement integer,
    priority integer,
    authenticator_flow boolean DEFAULT false NOT NULL,
    auth_flow_id character varying(36),
    auth_config character varying(36)
);


ALTER TABLE public.authentication_execution OWNER TO keycloak;

--
-- TOC entry 245 (class 1259 OID 40653)
-- Name: authentication_flow; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.authentication_flow (
    id character varying(36) NOT NULL,
    alias character varying(255),
    description character varying(255),
    realm_id character varying(36),
    provider_id character varying(36) DEFAULT 'basic-flow'::character varying NOT NULL,
    top_level boolean DEFAULT false NOT NULL,
    built_in boolean DEFAULT false NOT NULL
);


ALTER TABLE public.authentication_flow OWNER TO keycloak;

--
-- TOC entry 244 (class 1259 OID 40647)
-- Name: authenticator_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.authenticator_config (
    id character varying(36) NOT NULL,
    alias character varying(255),
    realm_id character varying(36)
);


ALTER TABLE public.authenticator_config OWNER TO keycloak;

--
-- TOC entry 247 (class 1259 OID 40664)
-- Name: authenticator_config_entry; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.authenticator_config_entry (
    authenticator_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE public.authenticator_config_entry OWNER TO keycloak;

--
-- TOC entry 273 (class 1259 OID 41117)
-- Name: broker_link; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.broker_link (
    identity_provider character varying(255) NOT NULL,
    storage_provider_id character varying(255),
    realm_id character varying(36) NOT NULL,
    broker_user_id character varying(255),
    broker_username character varying(255),
    token text,
    user_id character varying(255) NOT NULL
);


ALTER TABLE public.broker_link OWNER TO keycloak;

--
-- TOC entry 204 (class 1259 OID 39996)
-- Name: client; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client (
    id character varying(36) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    full_scope_allowed boolean DEFAULT false NOT NULL,
    client_id character varying(255),
    not_before integer,
    public_client boolean DEFAULT false NOT NULL,
    secret character varying(255),
    base_url character varying(255),
    bearer_only boolean DEFAULT false NOT NULL,
    management_url character varying(255),
    surrogate_auth_required boolean DEFAULT false NOT NULL,
    realm_id character varying(36),
    protocol character varying(255),
    node_rereg_timeout integer DEFAULT 0,
    frontchannel_logout boolean DEFAULT false NOT NULL,
    consent_required boolean DEFAULT false NOT NULL,
    name character varying(255),
    service_accounts_enabled boolean DEFAULT false NOT NULL,
    client_authenticator_type character varying(255),
    root_url character varying(255),
    description character varying(255),
    registration_token character varying(255),
    standard_flow_enabled boolean DEFAULT true NOT NULL,
    implicit_flow_enabled boolean DEFAULT false NOT NULL,
    direct_access_grants_enabled boolean DEFAULT false NOT NULL,
    always_display_in_console boolean DEFAULT false NOT NULL
);


ALTER TABLE public.client OWNER TO keycloak;

--
-- TOC entry 227 (class 1259 OID 40370)
-- Name: client_attributes; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_attributes (
    client_id character varying(36) NOT NULL,
    value character varying(4000),
    name character varying(255) NOT NULL
);


ALTER TABLE public.client_attributes OWNER TO keycloak;

--
-- TOC entry 284 (class 1259 OID 41376)
-- Name: client_auth_flow_bindings; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_auth_flow_bindings (
    client_id character varying(36) NOT NULL,
    flow_id character varying(36),
    binding_name character varying(255) NOT NULL
);


ALTER TABLE public.client_auth_flow_bindings OWNER TO keycloak;

--
-- TOC entry 283 (class 1259 OID 41251)
-- Name: client_initial_access; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_initial_access (
    id character varying(36) NOT NULL,
    realm_id character varying(36) NOT NULL,
    "timestamp" integer,
    expiration integer,
    count integer,
    remaining_count integer
);


ALTER TABLE public.client_initial_access OWNER TO keycloak;

--
-- TOC entry 229 (class 1259 OID 40382)
-- Name: client_node_registrations; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_node_registrations (
    client_id character varying(36) NOT NULL,
    value integer,
    name character varying(255) NOT NULL
);


ALTER TABLE public.client_node_registrations OWNER TO keycloak;

--
-- TOC entry 261 (class 1259 OID 40901)
-- Name: client_scope; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_scope (
    id character varying(36) NOT NULL,
    name character varying(255),
    realm_id character varying(36),
    description character varying(255),
    protocol character varying(255)
);


ALTER TABLE public.client_scope OWNER TO keycloak;

--
-- TOC entry 262 (class 1259 OID 40916)
-- Name: client_scope_attributes; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_scope_attributes (
    scope_id character varying(36) NOT NULL,
    value character varying(2048),
    name character varying(255) NOT NULL
);


ALTER TABLE public.client_scope_attributes OWNER TO keycloak;

--
-- TOC entry 285 (class 1259 OID 41418)
-- Name: client_scope_client; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_scope_client (
    client_id character varying(255) NOT NULL,
    scope_id character varying(255) NOT NULL,
    default_scope boolean DEFAULT false NOT NULL
);


ALTER TABLE public.client_scope_client OWNER TO keycloak;

--
-- TOC entry 263 (class 1259 OID 40922)
-- Name: client_scope_role_mapping; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_scope_role_mapping (
    scope_id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL
);


ALTER TABLE public.client_scope_role_mapping OWNER TO keycloak;

--
-- TOC entry 205 (class 1259 OID 40008)
-- Name: client_session; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_session (
    id character varying(36) NOT NULL,
    client_id character varying(36),
    redirect_uri character varying(255),
    state character varying(255),
    "timestamp" integer,
    session_id character varying(36),
    auth_method character varying(255),
    realm_id character varying(255),
    auth_user_id character varying(36),
    current_action character varying(36)
);


ALTER TABLE public.client_session OWNER TO keycloak;

--
-- TOC entry 250 (class 1259 OID 40685)
-- Name: client_session_auth_status; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_session_auth_status (
    authenticator character varying(36) NOT NULL,
    status integer,
    client_session character varying(36) NOT NULL
);


ALTER TABLE public.client_session_auth_status OWNER TO keycloak;

--
-- TOC entry 228 (class 1259 OID 40376)
-- Name: client_session_note; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_session_note (
    name character varying(255) NOT NULL,
    value character varying(255),
    client_session character varying(36) NOT NULL
);


ALTER TABLE public.client_session_note OWNER TO keycloak;

--
-- TOC entry 242 (class 1259 OID 40563)
-- Name: client_session_prot_mapper; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_session_prot_mapper (
    protocol_mapper_id character varying(36) NOT NULL,
    client_session character varying(36) NOT NULL
);


ALTER TABLE public.client_session_prot_mapper OWNER TO keycloak;

--
-- TOC entry 206 (class 1259 OID 40014)
-- Name: client_session_role; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_session_role (
    role_id character varying(255) NOT NULL,
    client_session character varying(36) NOT NULL
);


ALTER TABLE public.client_session_role OWNER TO keycloak;

--
-- TOC entry 251 (class 1259 OID 40766)
-- Name: client_user_session_note; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_user_session_note (
    name character varying(255) NOT NULL,
    value character varying(2048),
    client_session character varying(36) NOT NULL
);


ALTER TABLE public.client_user_session_note OWNER TO keycloak;

--
-- TOC entry 281 (class 1259 OID 41167)
-- Name: component; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.component (
    id character varying(36) NOT NULL,
    name character varying(255),
    parent_id character varying(36),
    provider_id character varying(36),
    provider_type character varying(255),
    realm_id character varying(36),
    sub_type character varying(255)
);


ALTER TABLE public.component OWNER TO keycloak;

--
-- TOC entry 280 (class 1259 OID 41161)
-- Name: component_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.component_config (
    id character varying(36) NOT NULL,
    component_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(4000)
);


ALTER TABLE public.component_config OWNER TO keycloak;

--
-- TOC entry 207 (class 1259 OID 40017)
-- Name: composite_role; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.composite_role (
    composite character varying(36) NOT NULL,
    child_role character varying(36) NOT NULL
);


ALTER TABLE public.composite_role OWNER TO keycloak;

--
-- TOC entry 208 (class 1259 OID 40020)
-- Name: credential; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.credential (
    id character varying(36) NOT NULL,
    salt bytea,
    type character varying(255),
    user_id character varying(36),
    created_date bigint,
    user_label character varying(255),
    secret_data text,
    credential_data text,
    priority integer
);


ALTER TABLE public.credential OWNER TO keycloak;

--
-- TOC entry 203 (class 1259 OID 39987)
-- Name: databasechangelog; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.databasechangelog (
    id character varying(255) NOT NULL,
    author character varying(255) NOT NULL,
    filename character varying(255) NOT NULL,
    dateexecuted timestamp without time zone NOT NULL,
    orderexecuted integer NOT NULL,
    exectype character varying(10) NOT NULL,
    md5sum character varying(35),
    description character varying(255),
    comments character varying(255),
    tag character varying(255),
    liquibase character varying(20),
    contexts character varying(255),
    labels character varying(255),
    deployment_id character varying(10)
);


ALTER TABLE public.databasechangelog OWNER TO keycloak;

--
-- TOC entry 202 (class 1259 OID 39982)
-- Name: databasechangeloglock; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.databasechangeloglock (
    id integer NOT NULL,
    locked boolean NOT NULL,
    lockgranted timestamp without time zone,
    lockedby character varying(255)
);


ALTER TABLE public.databasechangeloglock OWNER TO keycloak;

--
-- TOC entry 286 (class 1259 OID 41434)
-- Name: default_client_scope; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.default_client_scope (
    realm_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL,
    default_scope boolean DEFAULT false NOT NULL
);


ALTER TABLE public.default_client_scope OWNER TO keycloak;

--
-- TOC entry 209 (class 1259 OID 40026)
-- Name: event_entity; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.event_entity (
    id character varying(36) NOT NULL,
    client_id character varying(255),
    details_json character varying(2550),
    error character varying(255),
    ip_address character varying(255),
    realm_id character varying(255),
    session_id character varying(255),
    event_time bigint,
    type character varying(255),
    user_id character varying(255)
);


ALTER TABLE public.event_entity OWNER TO keycloak;

--
-- TOC entry 274 (class 1259 OID 41123)
-- Name: fed_user_attribute; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.fed_user_attribute (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36),
    value character varying(2024)
);


ALTER TABLE public.fed_user_attribute OWNER TO keycloak;

--
-- TOC entry 275 (class 1259 OID 41129)
-- Name: fed_user_consent; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.fed_user_consent (
    id character varying(36) NOT NULL,
    client_id character varying(255),
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36),
    created_date bigint,
    last_updated_date bigint,
    client_storage_provider character varying(36),
    external_client_id character varying(255)
);


ALTER TABLE public.fed_user_consent OWNER TO keycloak;

--
-- TOC entry 288 (class 1259 OID 41460)
-- Name: fed_user_consent_cl_scope; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.fed_user_consent_cl_scope (
    user_consent_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL
);


ALTER TABLE public.fed_user_consent_cl_scope OWNER TO keycloak;

--
-- TOC entry 276 (class 1259 OID 41138)
-- Name: fed_user_credential; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.fed_user_credential (
    id character varying(36) NOT NULL,
    salt bytea,
    type character varying(255),
    created_date bigint,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36),
    user_label character varying(255),
    secret_data text,
    credential_data text,
    priority integer
);


ALTER TABLE public.fed_user_credential OWNER TO keycloak;

--
-- TOC entry 277 (class 1259 OID 41148)
-- Name: fed_user_group_membership; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.fed_user_group_membership (
    group_id character varying(36) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36)
);


ALTER TABLE public.fed_user_group_membership OWNER TO keycloak;

--
-- TOC entry 278 (class 1259 OID 41151)
-- Name: fed_user_required_action; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.fed_user_required_action (
    required_action character varying(255) DEFAULT ' '::character varying NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36)
);


ALTER TABLE public.fed_user_required_action OWNER TO keycloak;

--
-- TOC entry 279 (class 1259 OID 41158)
-- Name: fed_user_role_mapping; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.fed_user_role_mapping (
    role_id character varying(36) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36)
);


ALTER TABLE public.fed_user_role_mapping OWNER TO keycloak;

--
-- TOC entry 232 (class 1259 OID 40420)
-- Name: federated_identity; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.federated_identity (
    identity_provider character varying(255) NOT NULL,
    realm_id character varying(36),
    federated_user_id character varying(255),
    federated_username character varying(255),
    token text,
    user_id character varying(36) NOT NULL
);


ALTER TABLE public.federated_identity OWNER TO keycloak;

--
-- TOC entry 282 (class 1259 OID 41227)
-- Name: federated_user; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.federated_user (
    id character varying(255) NOT NULL,
    storage_provider_id character varying(255),
    realm_id character varying(36) NOT NULL
);


ALTER TABLE public.federated_user OWNER TO keycloak;

--
-- TOC entry 258 (class 1259 OID 40839)
-- Name: group_attribute; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.group_attribute (
    id character varying(36) DEFAULT 'sybase-needs-something-here'::character varying NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(255),
    group_id character varying(36) NOT NULL
);


ALTER TABLE public.group_attribute OWNER TO keycloak;

--
-- TOC entry 257 (class 1259 OID 40836)
-- Name: group_role_mapping; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.group_role_mapping (
    role_id character varying(36) NOT NULL,
    group_id character varying(36) NOT NULL
);


ALTER TABLE public.group_role_mapping OWNER TO keycloak;

--
-- TOC entry 233 (class 1259 OID 40426)
-- Name: identity_provider; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.identity_provider (
    internal_id character varying(36) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    provider_alias character varying(255),
    provider_id character varying(255),
    store_token boolean DEFAULT false NOT NULL,
    authenticate_by_default boolean DEFAULT false NOT NULL,
    realm_id character varying(36),
    add_token_role boolean DEFAULT true NOT NULL,
    trust_email boolean DEFAULT false NOT NULL,
    first_broker_login_flow_id character varying(36),
    post_broker_login_flow_id character varying(36),
    provider_display_name character varying(255),
    link_only boolean DEFAULT false NOT NULL
);


ALTER TABLE public.identity_provider OWNER TO keycloak;

--
-- TOC entry 234 (class 1259 OID 40436)
-- Name: identity_provider_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.identity_provider_config (
    identity_provider_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE public.identity_provider_config OWNER TO keycloak;

--
-- TOC entry 239 (class 1259 OID 40542)
-- Name: identity_provider_mapper; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.identity_provider_mapper (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    idp_alias character varying(255) NOT NULL,
    idp_mapper_name character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL
);


ALTER TABLE public.identity_provider_mapper OWNER TO keycloak;

--
-- TOC entry 240 (class 1259 OID 40548)
-- Name: idp_mapper_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.idp_mapper_config (
    idp_mapper_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE public.idp_mapper_config OWNER TO keycloak;

--
-- TOC entry 256 (class 1259 OID 40833)
-- Name: keycloak_group; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.keycloak_group (
    id character varying(36) NOT NULL,
    name character varying(255),
    parent_group character varying(36) NOT NULL,
    realm_id character varying(36)
);


ALTER TABLE public.keycloak_group OWNER TO keycloak;

--
-- TOC entry 210 (class 1259 OID 40035)
-- Name: keycloak_role; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.keycloak_role (
    id character varying(36) NOT NULL,
    client_realm_constraint character varying(255),
    client_role boolean DEFAULT false NOT NULL,
    description character varying(255),
    name character varying(255),
    realm_id character varying(255),
    client character varying(36),
    realm character varying(36)
);


ALTER TABLE public.keycloak_role OWNER TO keycloak;

--
-- TOC entry 238 (class 1259 OID 40539)
-- Name: migration_model; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.migration_model (
    id character varying(36) NOT NULL,
    version character varying(36),
    update_time bigint DEFAULT 0 NOT NULL
);


ALTER TABLE public.migration_model OWNER TO keycloak;

--
-- TOC entry 255 (class 1259 OID 40823)
-- Name: offline_client_session; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.offline_client_session (
    user_session_id character varying(36) NOT NULL,
    client_id character varying(255) NOT NULL,
    offline_flag character varying(4) NOT NULL,
    "timestamp" integer,
    data text,
    client_storage_provider character varying(36) DEFAULT 'local'::character varying NOT NULL,
    external_client_id character varying(255) DEFAULT 'local'::character varying NOT NULL
);


ALTER TABLE public.offline_client_session OWNER TO keycloak;

--
-- TOC entry 254 (class 1259 OID 40817)
-- Name: offline_user_session; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.offline_user_session (
    user_session_id character varying(36) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    created_on integer NOT NULL,
    offline_flag character varying(4) NOT NULL,
    data text,
    last_session_refresh integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.offline_user_session OWNER TO keycloak;

--
-- TOC entry 268 (class 1259 OID 41044)
-- Name: policy_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.policy_config (
    policy_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value text
);


ALTER TABLE public.policy_config OWNER TO keycloak;

--
-- TOC entry 230 (class 1259 OID 40407)
-- Name: protocol_mapper; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.protocol_mapper (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    protocol character varying(255) NOT NULL,
    protocol_mapper_name character varying(255) NOT NULL,
    client_id character varying(36),
    client_scope_id character varying(36)
);


ALTER TABLE public.protocol_mapper OWNER TO keycloak;

--
-- TOC entry 231 (class 1259 OID 40414)
-- Name: protocol_mapper_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.protocol_mapper_config (
    protocol_mapper_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE public.protocol_mapper_config OWNER TO keycloak;

--
-- TOC entry 211 (class 1259 OID 40042)
-- Name: realm; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.realm (
    id character varying(36) NOT NULL,
    access_code_lifespan integer,
    user_action_lifespan integer,
    access_token_lifespan integer,
    account_theme character varying(255),
    admin_theme character varying(255),
    email_theme character varying(255),
    enabled boolean DEFAULT false NOT NULL,
    events_enabled boolean DEFAULT false NOT NULL,
    events_expiration bigint,
    login_theme character varying(255),
    name character varying(255),
    not_before integer,
    password_policy character varying(2550),
    registration_allowed boolean DEFAULT false NOT NULL,
    remember_me boolean DEFAULT false NOT NULL,
    reset_password_allowed boolean DEFAULT false NOT NULL,
    social boolean DEFAULT false NOT NULL,
    ssl_required character varying(255),
    sso_idle_timeout integer,
    sso_max_lifespan integer,
    update_profile_on_soc_login boolean DEFAULT false NOT NULL,
    verify_email boolean DEFAULT false NOT NULL,
    master_admin_client character varying(36),
    login_lifespan integer,
    internationalization_enabled boolean DEFAULT false NOT NULL,
    default_locale character varying(255),
    reg_email_as_username boolean DEFAULT false NOT NULL,
    admin_events_enabled boolean DEFAULT false NOT NULL,
    admin_events_details_enabled boolean DEFAULT false NOT NULL,
    edit_username_allowed boolean DEFAULT false NOT NULL,
    otp_policy_counter integer DEFAULT 0,
    otp_policy_window integer DEFAULT 1,
    otp_policy_period integer DEFAULT 30,
    otp_policy_digits integer DEFAULT 6,
    otp_policy_alg character varying(36) DEFAULT 'HmacSHA1'::character varying,
    otp_policy_type character varying(36) DEFAULT 'totp'::character varying,
    browser_flow character varying(36),
    registration_flow character varying(36),
    direct_grant_flow character varying(36),
    reset_credentials_flow character varying(36),
    client_auth_flow character varying(36),
    offline_session_idle_timeout integer DEFAULT 0,
    revoke_refresh_token boolean DEFAULT false NOT NULL,
    access_token_life_implicit integer DEFAULT 0,
    login_with_email_allowed boolean DEFAULT true NOT NULL,
    duplicate_emails_allowed boolean DEFAULT false NOT NULL,
    docker_auth_flow character varying(36),
    refresh_token_max_reuse integer DEFAULT 0,
    allow_user_managed_access boolean DEFAULT false NOT NULL,
    sso_max_lifespan_remember_me integer DEFAULT 0 NOT NULL,
    sso_idle_timeout_remember_me integer DEFAULT 0 NOT NULL,
    default_role character varying(255)
);


ALTER TABLE public.realm OWNER TO keycloak;

--
-- TOC entry 212 (class 1259 OID 40060)
-- Name: realm_attribute; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.realm_attribute (
    name character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    value text
);


ALTER TABLE public.realm_attribute OWNER TO keycloak;

--
-- TOC entry 260 (class 1259 OID 40849)
-- Name: realm_default_groups; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.realm_default_groups (
    realm_id character varying(36) NOT NULL,
    group_id character varying(36) NOT NULL
);


ALTER TABLE public.realm_default_groups OWNER TO keycloak;

--
-- TOC entry 237 (class 1259 OID 40531)
-- Name: realm_enabled_event_types; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.realm_enabled_event_types (
    realm_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE public.realm_enabled_event_types OWNER TO keycloak;

--
-- TOC entry 213 (class 1259 OID 40069)
-- Name: realm_events_listeners; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.realm_events_listeners (
    realm_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE public.realm_events_listeners OWNER TO keycloak;

--
-- TOC entry 293 (class 1259 OID 41572)
-- Name: realm_localizations; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.realm_localizations (
    realm_id character varying(255) NOT NULL,
    locale character varying(255) NOT NULL,
    texts text NOT NULL
);


ALTER TABLE public.realm_localizations OWNER TO keycloak;

--
-- TOC entry 214 (class 1259 OID 40072)
-- Name: realm_required_credential; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.realm_required_credential (
    type character varying(255) NOT NULL,
    form_label character varying(255),
    input boolean DEFAULT false NOT NULL,
    secret boolean DEFAULT false NOT NULL,
    realm_id character varying(36) NOT NULL
);


ALTER TABLE public.realm_required_credential OWNER TO keycloak;

--
-- TOC entry 215 (class 1259 OID 40080)
-- Name: realm_smtp_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.realm_smtp_config (
    realm_id character varying(36) NOT NULL,
    value character varying(255),
    name character varying(255) NOT NULL
);


ALTER TABLE public.realm_smtp_config OWNER TO keycloak;

--
-- TOC entry 235 (class 1259 OID 40446)
-- Name: realm_supported_locales; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.realm_supported_locales (
    realm_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE public.realm_supported_locales OWNER TO keycloak;

--
-- TOC entry 216 (class 1259 OID 40092)
-- Name: redirect_uris; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.redirect_uris (
    client_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE public.redirect_uris OWNER TO keycloak;

--
-- TOC entry 253 (class 1259 OID 40780)
-- Name: required_action_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.required_action_config (
    required_action_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE public.required_action_config OWNER TO keycloak;

--
-- TOC entry 252 (class 1259 OID 40772)
-- Name: required_action_provider; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.required_action_provider (
    id character varying(36) NOT NULL,
    alias character varying(255),
    name character varying(255),
    realm_id character varying(36),
    enabled boolean DEFAULT false NOT NULL,
    default_action boolean DEFAULT false NOT NULL,
    provider_id character varying(255),
    priority integer
);


ALTER TABLE public.required_action_provider OWNER TO keycloak;

--
-- TOC entry 290 (class 1259 OID 41499)
-- Name: resource_attribute; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.resource_attribute (
    id character varying(36) DEFAULT 'sybase-needs-something-here'::character varying NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(255),
    resource_id character varying(36) NOT NULL
);


ALTER TABLE public.resource_attribute OWNER TO keycloak;

--
-- TOC entry 270 (class 1259 OID 41072)
-- Name: resource_policy; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.resource_policy (
    resource_id character varying(36) NOT NULL,
    policy_id character varying(36) NOT NULL
);


ALTER TABLE public.resource_policy OWNER TO keycloak;

--
-- TOC entry 269 (class 1259 OID 41057)
-- Name: resource_scope; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.resource_scope (
    resource_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL
);


ALTER TABLE public.resource_scope OWNER TO keycloak;

--
-- TOC entry 264 (class 1259 OID 40991)
-- Name: resource_server; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.resource_server (
    id character varying(36) NOT NULL,
    allow_rs_remote_mgmt boolean DEFAULT false NOT NULL,
    policy_enforce_mode character varying(15) NOT NULL,
    decision_strategy smallint DEFAULT 1 NOT NULL
);


ALTER TABLE public.resource_server OWNER TO keycloak;

--
-- TOC entry 289 (class 1259 OID 41475)
-- Name: resource_server_perm_ticket; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.resource_server_perm_ticket (
    id character varying(36) NOT NULL,
    owner character varying(255) NOT NULL,
    requester character varying(255) NOT NULL,
    created_timestamp bigint NOT NULL,
    granted_timestamp bigint,
    resource_id character varying(36) NOT NULL,
    scope_id character varying(36),
    resource_server_id character varying(36) NOT NULL,
    policy_id character varying(36)
);


ALTER TABLE public.resource_server_perm_ticket OWNER TO keycloak;

--
-- TOC entry 267 (class 1259 OID 41029)
-- Name: resource_server_policy; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.resource_server_policy (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255),
    type character varying(255) NOT NULL,
    decision_strategy character varying(20),
    logic character varying(20),
    resource_server_id character varying(36) NOT NULL,
    owner character varying(255)
);


ALTER TABLE public.resource_server_policy OWNER TO keycloak;

--
-- TOC entry 265 (class 1259 OID 40999)
-- Name: resource_server_resource; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.resource_server_resource (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(255),
    icon_uri character varying(255),
    owner character varying(255) NOT NULL,
    resource_server_id character varying(36) NOT NULL,
    owner_managed_access boolean DEFAULT false NOT NULL,
    display_name character varying(255)
);


ALTER TABLE public.resource_server_resource OWNER TO keycloak;

--
-- TOC entry 266 (class 1259 OID 41014)
-- Name: resource_server_scope; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.resource_server_scope (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    icon_uri character varying(255),
    resource_server_id character varying(36) NOT NULL,
    display_name character varying(255)
);


ALTER TABLE public.resource_server_scope OWNER TO keycloak;

--
-- TOC entry 291 (class 1259 OID 41518)
-- Name: resource_uris; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.resource_uris (
    resource_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE public.resource_uris OWNER TO keycloak;

--
-- TOC entry 292 (class 1259 OID 41528)
-- Name: role_attribute; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.role_attribute (
    id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(255)
);


ALTER TABLE public.role_attribute OWNER TO keycloak;

--
-- TOC entry 217 (class 1259 OID 40095)
-- Name: scope_mapping; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.scope_mapping (
    client_id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL
);


ALTER TABLE public.scope_mapping OWNER TO keycloak;

--
-- TOC entry 271 (class 1259 OID 41087)
-- Name: scope_policy; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.scope_policy (
    scope_id character varying(36) NOT NULL,
    policy_id character varying(36) NOT NULL
);


ALTER TABLE public.scope_policy OWNER TO keycloak;

--
-- TOC entry 219 (class 1259 OID 40101)
-- Name: user_attribute; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_attribute (
    name character varying(255) NOT NULL,
    value character varying(255),
    user_id character varying(36) NOT NULL,
    id character varying(36) DEFAULT 'sybase-needs-something-here'::character varying NOT NULL
);


ALTER TABLE public.user_attribute OWNER TO keycloak;

--
-- TOC entry 241 (class 1259 OID 40554)
-- Name: user_consent; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_consent (
    id character varying(36) NOT NULL,
    client_id character varying(255),
    user_id character varying(36) NOT NULL,
    created_date bigint,
    last_updated_date bigint,
    client_storage_provider character varying(36),
    external_client_id character varying(255)
);


ALTER TABLE public.user_consent OWNER TO keycloak;

--
-- TOC entry 287 (class 1259 OID 41450)
-- Name: user_consent_client_scope; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_consent_client_scope (
    user_consent_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL
);


ALTER TABLE public.user_consent_client_scope OWNER TO keycloak;

--
-- TOC entry 220 (class 1259 OID 40107)
-- Name: user_entity; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_entity (
    id character varying(36) NOT NULL,
    email character varying(255),
    email_constraint character varying(255),
    email_verified boolean DEFAULT false NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    federation_link character varying(255),
    first_name character varying(255),
    last_name character varying(255),
    realm_id character varying(255),
    username character varying(255),
    created_timestamp bigint,
    service_account_client_link character varying(255),
    not_before integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.user_entity OWNER TO keycloak;

--
-- TOC entry 221 (class 1259 OID 40116)
-- Name: user_federation_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_federation_config (
    user_federation_provider_id character varying(36) NOT NULL,
    value character varying(255),
    name character varying(255) NOT NULL
);


ALTER TABLE public.user_federation_config OWNER TO keycloak;

--
-- TOC entry 248 (class 1259 OID 40670)
-- Name: user_federation_mapper; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_federation_mapper (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    federation_provider_id character varying(36) NOT NULL,
    federation_mapper_type character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL
);


ALTER TABLE public.user_federation_mapper OWNER TO keycloak;

--
-- TOC entry 249 (class 1259 OID 40676)
-- Name: user_federation_mapper_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_federation_mapper_config (
    user_federation_mapper_id character varying(36) NOT NULL,
    value character varying(255),
    name character varying(255) NOT NULL
);


ALTER TABLE public.user_federation_mapper_config OWNER TO keycloak;

--
-- TOC entry 222 (class 1259 OID 40122)
-- Name: user_federation_provider; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_federation_provider (
    id character varying(36) NOT NULL,
    changed_sync_period integer,
    display_name character varying(255),
    full_sync_period integer,
    last_sync integer,
    priority integer,
    provider_name character varying(255),
    realm_id character varying(36)
);


ALTER TABLE public.user_federation_provider OWNER TO keycloak;

--
-- TOC entry 259 (class 1259 OID 40846)
-- Name: user_group_membership; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_group_membership (
    group_id character varying(36) NOT NULL,
    user_id character varying(36) NOT NULL
);


ALTER TABLE public.user_group_membership OWNER TO keycloak;

--
-- TOC entry 223 (class 1259 OID 40128)
-- Name: user_required_action; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_required_action (
    user_id character varying(36) NOT NULL,
    required_action character varying(255) DEFAULT ' '::character varying NOT NULL
);


ALTER TABLE public.user_required_action OWNER TO keycloak;

--
-- TOC entry 224 (class 1259 OID 40131)
-- Name: user_role_mapping; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_role_mapping (
    role_id character varying(255) NOT NULL,
    user_id character varying(36) NOT NULL
);


ALTER TABLE public.user_role_mapping OWNER TO keycloak;

--
-- TOC entry 225 (class 1259 OID 40134)
-- Name: user_session; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_session (
    id character varying(36) NOT NULL,
    auth_method character varying(255),
    ip_address character varying(255),
    last_session_refresh integer,
    login_username character varying(255),
    realm_id character varying(255),
    remember_me boolean DEFAULT false NOT NULL,
    started integer,
    user_id character varying(255),
    user_session_state integer,
    broker_session_id character varying(255),
    broker_user_id character varying(255)
);


ALTER TABLE public.user_session OWNER TO keycloak;

--
-- TOC entry 236 (class 1259 OID 40449)
-- Name: user_session_note; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_session_note (
    user_session character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(2048)
);


ALTER TABLE public.user_session_note OWNER TO keycloak;

--
-- TOC entry 218 (class 1259 OID 40098)
-- Name: username_login_failure; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.username_login_failure (
    realm_id character varying(36) NOT NULL,
    username character varying(255) NOT NULL,
    failed_login_not_before integer,
    last_failure bigint,
    last_ip_failure character varying(255),
    num_failures integer
);


ALTER TABLE public.username_login_failure OWNER TO keycloak;

--
-- TOC entry 226 (class 1259 OID 40147)
-- Name: web_origins; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.web_origins (
    client_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE public.web_origins OWNER TO keycloak;

--
-- TOC entry 3804 (class 0 OID 40641)
-- Dependencies: 243
-- Data for Name: admin_event_entity; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3833 (class 0 OID 41102)
-- Dependencies: 272
-- Data for Name: associated_policy; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3807 (class 0 OID 40659)
-- Dependencies: 246
-- Data for Name: authentication_execution; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.authentication_execution VALUES ('a16b4e33-d8da-49b1-8966-6ba094c44eeb', NULL, 'auth-cookie', 'master', '57ec5db6-28cb-457e-9fdf-8f3570278e3e', 2, 10, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('8f5db097-c73b-4085-8185-8612475b86fa', NULL, 'auth-spnego', 'master', '57ec5db6-28cb-457e-9fdf-8f3570278e3e', 3, 20, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('83fe42cb-a087-4717-917c-6d96c77ba903', NULL, 'identity-provider-redirector', 'master', '57ec5db6-28cb-457e-9fdf-8f3570278e3e', 2, 25, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('85d600f4-1cd9-4e90-89ea-ec6dcaa4a028', NULL, NULL, 'master', '57ec5db6-28cb-457e-9fdf-8f3570278e3e', 2, 30, true, '7db65537-3c06-4ff6-a1a7-121e196e28aa', NULL);
INSERT INTO public.authentication_execution VALUES ('65505f1d-9168-49e6-be63-2bfc3d81255b', NULL, 'auth-username-password-form', 'master', '7db65537-3c06-4ff6-a1a7-121e196e28aa', 0, 10, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('20cb496d-3107-4ac6-b6cc-2da673f7775a', NULL, NULL, 'master', '7db65537-3c06-4ff6-a1a7-121e196e28aa', 1, 20, true, '1cf65ede-94ee-45c2-8c0c-e756d575f988', NULL);
INSERT INTO public.authentication_execution VALUES ('53bd4f42-3a5b-4120-a744-28777ef4c1a9', NULL, 'conditional-user-configured', 'master', '1cf65ede-94ee-45c2-8c0c-e756d575f988', 0, 10, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('50041b96-65e9-42c7-a9d0-61eaa2a1e118', NULL, 'auth-otp-form', 'master', '1cf65ede-94ee-45c2-8c0c-e756d575f988', 0, 20, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('f7a63bca-8224-4017-976b-287a4db05a97', NULL, 'direct-grant-validate-username', 'master', '918ddd3b-fc24-4bd0-918f-874795de1a4e', 0, 10, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('23398065-e346-4f83-9971-023354312293', NULL, 'direct-grant-validate-password', 'master', '918ddd3b-fc24-4bd0-918f-874795de1a4e', 0, 20, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('ee68e1e5-6ac3-4d37-b064-d66153170c42', NULL, NULL, 'master', '918ddd3b-fc24-4bd0-918f-874795de1a4e', 1, 30, true, 'fc75891b-d122-4875-92f5-df0dc8dcc9b9', NULL);
INSERT INTO public.authentication_execution VALUES ('48325fb7-f4e6-4772-8f1b-c7f799751870', NULL, 'conditional-user-configured', 'master', 'fc75891b-d122-4875-92f5-df0dc8dcc9b9', 0, 10, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('728709b0-5621-49d1-96e9-4c5ffc7a125a', NULL, 'direct-grant-validate-otp', 'master', 'fc75891b-d122-4875-92f5-df0dc8dcc9b9', 0, 20, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('fa55a0cf-5c81-400a-becc-5b60bed2cbbe', NULL, 'registration-page-form', 'master', '77c4cd74-f290-4337-9885-d4969306fbb9', 0, 10, true, '5b0a435b-db44-43b1-91df-14716d5c0d8f', NULL);
INSERT INTO public.authentication_execution VALUES ('23bf884f-a857-44d0-bb3e-77c7b90a97dd', NULL, 'registration-user-creation', 'master', '5b0a435b-db44-43b1-91df-14716d5c0d8f', 0, 20, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('e009f865-7300-4759-b4b1-b0488a3ff86b', NULL, 'registration-profile-action', 'master', '5b0a435b-db44-43b1-91df-14716d5c0d8f', 0, 40, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('3bfade68-e28a-468a-9b49-dea13f980039', NULL, 'registration-password-action', 'master', '5b0a435b-db44-43b1-91df-14716d5c0d8f', 0, 50, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('621c185e-6665-41e3-94dd-1cd6e3fbd362', NULL, 'registration-recaptcha-action', 'master', '5b0a435b-db44-43b1-91df-14716d5c0d8f', 3, 60, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('f138ab83-e01a-4c4e-b20f-32805496c0af', NULL, 'reset-credentials-choose-user', 'master', '3f2fafc6-4ca5-4c96-b59e-abcb3e1512a2', 0, 10, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('35c22b47-a061-463b-8757-b3ba754575c6', NULL, 'reset-credential-email', 'master', '3f2fafc6-4ca5-4c96-b59e-abcb3e1512a2', 0, 20, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('25c70c03-9744-42a8-a7cf-e023df0d7112', NULL, 'reset-password', 'master', '3f2fafc6-4ca5-4c96-b59e-abcb3e1512a2', 0, 30, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('18445ecc-a4db-4e65-9fdd-18b75e1db10f', NULL, NULL, 'master', '3f2fafc6-4ca5-4c96-b59e-abcb3e1512a2', 1, 40, true, '837067a8-5508-4307-8dc8-8eaafb5146e5', NULL);
INSERT INTO public.authentication_execution VALUES ('a4fc9885-b531-4336-bb05-4a83ec2de1ed', NULL, 'conditional-user-configured', 'master', '837067a8-5508-4307-8dc8-8eaafb5146e5', 0, 10, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('b24cdd4e-3598-4533-bc7d-9d54da4d5b08', NULL, 'reset-otp', 'master', '837067a8-5508-4307-8dc8-8eaafb5146e5', 0, 20, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('243b09b6-076f-48ab-8e5c-127efeea9e12', NULL, 'client-secret', 'master', 'b7b4a721-a4a0-4886-8657-e1e061b2abae', 2, 10, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('3eb4e015-18cf-4d91-ae62-f2ff668da877', NULL, 'client-jwt', 'master', 'b7b4a721-a4a0-4886-8657-e1e061b2abae', 2, 20, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('0998943d-e27a-4112-88aa-fda311e6d8ec', NULL, 'client-secret-jwt', 'master', 'b7b4a721-a4a0-4886-8657-e1e061b2abae', 2, 30, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('a5d1de32-acb1-431b-9e73-0390c71f2df0', NULL, 'client-x509', 'master', 'b7b4a721-a4a0-4886-8657-e1e061b2abae', 2, 40, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('516307ae-94ab-4576-8010-83128b985dd6', NULL, 'idp-review-profile', 'master', '178e9ba2-760f-418d-98e7-2d62d04044ed', 0, 10, false, NULL, '99a250f8-f1ba-4802-9560-2f34bb9bc434');
INSERT INTO public.authentication_execution VALUES ('f28bd30b-c403-4546-8c06-f5439e116905', NULL, NULL, 'master', '178e9ba2-760f-418d-98e7-2d62d04044ed', 0, 20, true, '99d36625-91f4-4f41-a6fc-6eb5ba371e17', NULL);
INSERT INTO public.authentication_execution VALUES ('fdf54cad-99d2-47d1-8337-f473998dceab', NULL, 'idp-create-user-if-unique', 'master', '99d36625-91f4-4f41-a6fc-6eb5ba371e17', 2, 10, false, NULL, 'cd126382-a2d8-46eb-80f1-7716936a6e2b');
INSERT INTO public.authentication_execution VALUES ('3bf45062-ba2d-40bb-aadd-6a4407df1b84', NULL, NULL, 'master', '99d36625-91f4-4f41-a6fc-6eb5ba371e17', 2, 20, true, '7556cb2b-7375-4a4a-9d93-a34a5ea26de5', NULL);
INSERT INTO public.authentication_execution VALUES ('e091eee3-78cb-498c-9041-9bc455bd3d83', NULL, 'idp-confirm-link', 'master', '7556cb2b-7375-4a4a-9d93-a34a5ea26de5', 0, 10, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('f9d2b5f1-dffe-42e4-8223-ac7b0a2511b1', NULL, NULL, 'master', '7556cb2b-7375-4a4a-9d93-a34a5ea26de5', 0, 20, true, '5d3e0a0f-1901-40ad-a7d3-7d99b9492199', NULL);
INSERT INTO public.authentication_execution VALUES ('500800c0-9d81-402f-8e12-03c45dd864db', NULL, 'idp-email-verification', 'master', '5d3e0a0f-1901-40ad-a7d3-7d99b9492199', 2, 10, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('0c2c5aa6-b917-4c6b-b3dd-4d40893aa0e3', NULL, NULL, 'master', '5d3e0a0f-1901-40ad-a7d3-7d99b9492199', 2, 20, true, 'af8f4d0f-dd5b-48ee-ad59-780eab5d57de', NULL);
INSERT INTO public.authentication_execution VALUES ('02721663-f75f-414a-b7e9-d06fce64a222', NULL, 'idp-username-password-form', 'master', 'af8f4d0f-dd5b-48ee-ad59-780eab5d57de', 0, 10, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('f9402f57-1d5a-4977-9924-292a2c23cb4a', NULL, NULL, 'master', 'af8f4d0f-dd5b-48ee-ad59-780eab5d57de', 1, 20, true, '3ef079df-50b7-4ce1-ad04-237cda877669', NULL);
INSERT INTO public.authentication_execution VALUES ('cf79a264-c5be-45cf-beca-2f1276e93357', NULL, 'conditional-user-configured', 'master', '3ef079df-50b7-4ce1-ad04-237cda877669', 0, 10, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('e920314d-d868-4724-aca7-2c1a9d9eb052', NULL, 'auth-otp-form', 'master', '3ef079df-50b7-4ce1-ad04-237cda877669', 0, 20, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('8efc8e10-482b-46a1-be94-af5584e1a951', NULL, 'http-basic-authenticator', 'master', '97d04da1-d77f-48b2-bb35-b1a3f8040ee3', 0, 10, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('0d383e11-f059-4cf5-80b2-3b42863bfded', NULL, 'docker-http-basic-authenticator', 'master', '5e8f8121-6832-4301-a10c-1aa675b7b2af', 0, 10, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('a65f7c96-cfb8-45b4-877b-e4a2ee2e838d', NULL, 'no-cookie-redirect', 'master', 'd60ffad4-dc25-4755-bd1e-87c65ba81783', 0, 10, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('1cfe40b7-9ebc-46e2-a5a7-b52c8bdbc747', NULL, NULL, 'master', 'd60ffad4-dc25-4755-bd1e-87c65ba81783', 0, 20, true, 'cfa587d4-717c-44ea-96ca-cf2d171d1237', NULL);
INSERT INTO public.authentication_execution VALUES ('3968f2f8-2b1d-488d-9fb1-750e79cef7f8', NULL, 'basic-auth', 'master', 'cfa587d4-717c-44ea-96ca-cf2d171d1237', 0, 10, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('23ad3526-8493-42e4-8d2c-770210de3c12', NULL, 'basic-auth-otp', 'master', 'cfa587d4-717c-44ea-96ca-cf2d171d1237', 3, 20, false, NULL, NULL);
INSERT INTO public.authentication_execution VALUES ('49cb4119-5566-46a1-80b9-6f610524d617', NULL, 'auth-spnego', 'master', 'cfa587d4-717c-44ea-96ca-cf2d171d1237', 3, 30, false, NULL, NULL);


--
-- TOC entry 3806 (class 0 OID 40653)
-- Dependencies: 245
-- Data for Name: authentication_flow; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.authentication_flow VALUES ('57ec5db6-28cb-457e-9fdf-8f3570278e3e', 'browser', 'browser based authentication', 'master', 'basic-flow', true, true);
INSERT INTO public.authentication_flow VALUES ('7db65537-3c06-4ff6-a1a7-121e196e28aa', 'forms', 'Username, password, otp and other auth forms.', 'master', 'basic-flow', false, true);
INSERT INTO public.authentication_flow VALUES ('1cf65ede-94ee-45c2-8c0c-e756d575f988', 'Browser - Conditional OTP', 'Flow to determine if the OTP is required for the authentication', 'master', 'basic-flow', false, true);
INSERT INTO public.authentication_flow VALUES ('918ddd3b-fc24-4bd0-918f-874795de1a4e', 'direct grant', 'OpenID Connect Resource Owner Grant', 'master', 'basic-flow', true, true);
INSERT INTO public.authentication_flow VALUES ('fc75891b-d122-4875-92f5-df0dc8dcc9b9', 'Direct Grant - Conditional OTP', 'Flow to determine if the OTP is required for the authentication', 'master', 'basic-flow', false, true);
INSERT INTO public.authentication_flow VALUES ('77c4cd74-f290-4337-9885-d4969306fbb9', 'registration', 'registration flow', 'master', 'basic-flow', true, true);
INSERT INTO public.authentication_flow VALUES ('5b0a435b-db44-43b1-91df-14716d5c0d8f', 'registration form', 'registration form', 'master', 'form-flow', false, true);
INSERT INTO public.authentication_flow VALUES ('3f2fafc6-4ca5-4c96-b59e-abcb3e1512a2', 'reset credentials', 'Reset credentials for a user if they forgot their password or something', 'master', 'basic-flow', true, true);
INSERT INTO public.authentication_flow VALUES ('837067a8-5508-4307-8dc8-8eaafb5146e5', 'Reset - Conditional OTP', 'Flow to determine if the OTP should be reset or not. Set to REQUIRED to force.', 'master', 'basic-flow', false, true);
INSERT INTO public.authentication_flow VALUES ('b7b4a721-a4a0-4886-8657-e1e061b2abae', 'clients', 'Base authentication for clients', 'master', 'client-flow', true, true);
INSERT INTO public.authentication_flow VALUES ('178e9ba2-760f-418d-98e7-2d62d04044ed', 'first broker login', 'Actions taken after first broker login with identity provider account, which is not yet linked to any Keycloak account', 'master', 'basic-flow', true, true);
INSERT INTO public.authentication_flow VALUES ('99d36625-91f4-4f41-a6fc-6eb5ba371e17', 'User creation or linking', 'Flow for the existing/non-existing user alternatives', 'master', 'basic-flow', false, true);
INSERT INTO public.authentication_flow VALUES ('7556cb2b-7375-4a4a-9d93-a34a5ea26de5', 'Handle Existing Account', 'Handle what to do if there is existing account with same email/username like authenticated identity provider', 'master', 'basic-flow', false, true);
INSERT INTO public.authentication_flow VALUES ('5d3e0a0f-1901-40ad-a7d3-7d99b9492199', 'Account verification options', 'Method with which to verity the existing account', 'master', 'basic-flow', false, true);
INSERT INTO public.authentication_flow VALUES ('af8f4d0f-dd5b-48ee-ad59-780eab5d57de', 'Verify Existing Account by Re-authentication', 'Reauthentication of existing account', 'master', 'basic-flow', false, true);
INSERT INTO public.authentication_flow VALUES ('3ef079df-50b7-4ce1-ad04-237cda877669', 'First broker login - Conditional OTP', 'Flow to determine if the OTP is required for the authentication', 'master', 'basic-flow', false, true);
INSERT INTO public.authentication_flow VALUES ('97d04da1-d77f-48b2-bb35-b1a3f8040ee3', 'saml ecp', 'SAML ECP Profile Authentication Flow', 'master', 'basic-flow', true, true);
INSERT INTO public.authentication_flow VALUES ('5e8f8121-6832-4301-a10c-1aa675b7b2af', 'docker auth', 'Used by Docker clients to authenticate against the IDP', 'master', 'basic-flow', true, true);
INSERT INTO public.authentication_flow VALUES ('d60ffad4-dc25-4755-bd1e-87c65ba81783', 'http challenge', 'An authentication flow based on challenge-response HTTP Authentication Schemes', 'master', 'basic-flow', true, true);
INSERT INTO public.authentication_flow VALUES ('cfa587d4-717c-44ea-96ca-cf2d171d1237', 'Authentication Options', 'Authentication options.', 'master', 'basic-flow', false, true);


--
-- TOC entry 3805 (class 0 OID 40647)
-- Dependencies: 244
-- Data for Name: authenticator_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.authenticator_config VALUES ('99a250f8-f1ba-4802-9560-2f34bb9bc434', 'review profile config', 'master');
INSERT INTO public.authenticator_config VALUES ('cd126382-a2d8-46eb-80f1-7716936a6e2b', 'create unique user config', 'master');


--
-- TOC entry 3808 (class 0 OID 40664)
-- Dependencies: 247
-- Data for Name: authenticator_config_entry; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.authenticator_config_entry VALUES ('99a250f8-f1ba-4802-9560-2f34bb9bc434', 'missing', 'update.profile.on.first.login');
INSERT INTO public.authenticator_config_entry VALUES ('cd126382-a2d8-46eb-80f1-7716936a6e2b', 'false', 'require.password.update.after.registration');


--
-- TOC entry 3834 (class 0 OID 41117)
-- Dependencies: 273
-- Data for Name: broker_link; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3765 (class 0 OID 39996)
-- Dependencies: 204
-- Data for Name: client; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.client VALUES ('982f79bc-4b83-4983-abc4-f917708008ca', true, false, 'master-realm', 0, false, NULL, NULL, true, NULL, false, 'master', NULL, 0, false, false, 'master Realm', false, 'client-secret', NULL, NULL, NULL, true, false, false, false);
INSERT INTO public.client VALUES ('0350c73b-e4db-4555-bf1d-bbf41a81315a', true, false, 'account', 0, true, NULL, '/realms/master/account/', false, NULL, false, 'master', 'openid-connect', 0, false, false, '${client_account}', false, 'client-secret', '${authBaseUrl}', NULL, NULL, true, false, false, false);
INSERT INTO public.client VALUES ('f0861274-7936-4ee0-b4ef-087776e07f97', true, false, 'account-console', 0, true, NULL, '/realms/master/account/', false, NULL, false, 'master', 'openid-connect', 0, false, false, '${client_account-console}', false, 'client-secret', '${authBaseUrl}', NULL, NULL, true, false, false, false);
INSERT INTO public.client VALUES ('234fc62f-0d9e-47f1-8ccd-905e33de62e3', true, false, 'broker', 0, false, NULL, NULL, true, NULL, false, 'master', 'openid-connect', 0, false, false, '${client_broker}', false, 'client-secret', NULL, NULL, NULL, true, false, false, false);
INSERT INTO public.client VALUES ('551599da-86f9-447a-aa70-b3169d239cc8', true, false, 'security-admin-console', 0, true, NULL, '/admin/master/console/', false, NULL, false, 'master', 'openid-connect', 0, false, false, '${client_security-admin-console}', false, 'client-secret', '${authAdminUrl}', NULL, NULL, true, false, false, false);
INSERT INTO public.client VALUES ('c0f58e0c-fcc0-4fd6-b64e-11df16b7719a', true, false, 'admin-cli', 0, true, NULL, NULL, false, NULL, false, 'master', 'openid-connect', 0, false, false, '${client_admin-cli}', false, 'client-secret', NULL, NULL, NULL, false, false, true, false);


--
-- TOC entry 3788 (class 0 OID 40370)
-- Dependencies: 227
-- Data for Name: client_attributes; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.client_attributes VALUES ('f0861274-7936-4ee0-b4ef-087776e07f97', 'S256', 'pkce.code.challenge.method');
INSERT INTO public.client_attributes VALUES ('551599da-86f9-447a-aa70-b3169d239cc8', 'S256', 'pkce.code.challenge.method');


--
-- TOC entry 3845 (class 0 OID 41376)
-- Dependencies: 284
-- Data for Name: client_auth_flow_bindings; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3844 (class 0 OID 41251)
-- Dependencies: 283
-- Data for Name: client_initial_access; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3790 (class 0 OID 40382)
-- Dependencies: 229
-- Data for Name: client_node_registrations; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3822 (class 0 OID 40901)
-- Dependencies: 261
-- Data for Name: client_scope; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.client_scope VALUES ('c38ffa9e-7ffe-4bfc-91bf-a0ed0a5fcb40', 'offline_access', 'master', 'OpenID Connect built-in scope: offline_access', 'openid-connect');
INSERT INTO public.client_scope VALUES ('06199523-a820-4b2a-8641-ea225c29c921', 'role_list', 'master', 'SAML role list', 'saml');
INSERT INTO public.client_scope VALUES ('7f2a24ac-6d77-4068-a597-60c7706842ae', 'profile', 'master', 'OpenID Connect built-in scope: profile', 'openid-connect');
INSERT INTO public.client_scope VALUES ('60a4f821-7c71-47fe-a352-e6e24fde59bb', 'email', 'master', 'OpenID Connect built-in scope: email', 'openid-connect');
INSERT INTO public.client_scope VALUES ('f569e5f0-d55f-4eec-851b-11645065b918', 'address', 'master', 'OpenID Connect built-in scope: address', 'openid-connect');
INSERT INTO public.client_scope VALUES ('b4c3b2b2-c503-43d7-9b6f-960a94fe54d8', 'phone', 'master', 'OpenID Connect built-in scope: phone', 'openid-connect');
INSERT INTO public.client_scope VALUES ('a47cfa61-711f-4f71-81a6-7631c5ed9e18', 'roles', 'master', 'OpenID Connect scope for add user roles to the access token', 'openid-connect');
INSERT INTO public.client_scope VALUES ('34371776-65b2-4a47-a6ad-3f54635ffb36', 'web-origins', 'master', 'OpenID Connect scope for add allowed web origins to the access token', 'openid-connect');
INSERT INTO public.client_scope VALUES ('051c53b2-4c0f-4999-82d5-d4be5cbbf2d1', 'microprofile-jwt', 'master', 'Microprofile - JWT built-in scope', 'openid-connect');


--
-- TOC entry 3823 (class 0 OID 40916)
-- Dependencies: 262
-- Data for Name: client_scope_attributes; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.client_scope_attributes VALUES ('c38ffa9e-7ffe-4bfc-91bf-a0ed0a5fcb40', 'true', 'display.on.consent.screen');
INSERT INTO public.client_scope_attributes VALUES ('c38ffa9e-7ffe-4bfc-91bf-a0ed0a5fcb40', '${offlineAccessScopeConsentText}', 'consent.screen.text');
INSERT INTO public.client_scope_attributes VALUES ('06199523-a820-4b2a-8641-ea225c29c921', 'true', 'display.on.consent.screen');
INSERT INTO public.client_scope_attributes VALUES ('06199523-a820-4b2a-8641-ea225c29c921', '${samlRoleListScopeConsentText}', 'consent.screen.text');
INSERT INTO public.client_scope_attributes VALUES ('7f2a24ac-6d77-4068-a597-60c7706842ae', 'true', 'display.on.consent.screen');
INSERT INTO public.client_scope_attributes VALUES ('7f2a24ac-6d77-4068-a597-60c7706842ae', '${profileScopeConsentText}', 'consent.screen.text');
INSERT INTO public.client_scope_attributes VALUES ('7f2a24ac-6d77-4068-a597-60c7706842ae', 'true', 'include.in.token.scope');
INSERT INTO public.client_scope_attributes VALUES ('60a4f821-7c71-47fe-a352-e6e24fde59bb', 'true', 'display.on.consent.screen');
INSERT INTO public.client_scope_attributes VALUES ('60a4f821-7c71-47fe-a352-e6e24fde59bb', '${emailScopeConsentText}', 'consent.screen.text');
INSERT INTO public.client_scope_attributes VALUES ('60a4f821-7c71-47fe-a352-e6e24fde59bb', 'true', 'include.in.token.scope');
INSERT INTO public.client_scope_attributes VALUES ('f569e5f0-d55f-4eec-851b-11645065b918', 'true', 'display.on.consent.screen');
INSERT INTO public.client_scope_attributes VALUES ('f569e5f0-d55f-4eec-851b-11645065b918', '${addressScopeConsentText}', 'consent.screen.text');
INSERT INTO public.client_scope_attributes VALUES ('f569e5f0-d55f-4eec-851b-11645065b918', 'true', 'include.in.token.scope');
INSERT INTO public.client_scope_attributes VALUES ('b4c3b2b2-c503-43d7-9b6f-960a94fe54d8', 'true', 'display.on.consent.screen');
INSERT INTO public.client_scope_attributes VALUES ('b4c3b2b2-c503-43d7-9b6f-960a94fe54d8', '${phoneScopeConsentText}', 'consent.screen.text');
INSERT INTO public.client_scope_attributes VALUES ('b4c3b2b2-c503-43d7-9b6f-960a94fe54d8', 'true', 'include.in.token.scope');
INSERT INTO public.client_scope_attributes VALUES ('a47cfa61-711f-4f71-81a6-7631c5ed9e18', 'true', 'display.on.consent.screen');
INSERT INTO public.client_scope_attributes VALUES ('a47cfa61-711f-4f71-81a6-7631c5ed9e18', '${rolesScopeConsentText}', 'consent.screen.text');
INSERT INTO public.client_scope_attributes VALUES ('a47cfa61-711f-4f71-81a6-7631c5ed9e18', 'false', 'include.in.token.scope');
INSERT INTO public.client_scope_attributes VALUES ('34371776-65b2-4a47-a6ad-3f54635ffb36', 'false', 'display.on.consent.screen');
INSERT INTO public.client_scope_attributes VALUES ('34371776-65b2-4a47-a6ad-3f54635ffb36', '', 'consent.screen.text');
INSERT INTO public.client_scope_attributes VALUES ('34371776-65b2-4a47-a6ad-3f54635ffb36', 'false', 'include.in.token.scope');
INSERT INTO public.client_scope_attributes VALUES ('051c53b2-4c0f-4999-82d5-d4be5cbbf2d1', 'false', 'display.on.consent.screen');
INSERT INTO public.client_scope_attributes VALUES ('051c53b2-4c0f-4999-82d5-d4be5cbbf2d1', 'true', 'include.in.token.scope');


--
-- TOC entry 3846 (class 0 OID 41418)
-- Dependencies: 285
-- Data for Name: client_scope_client; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.client_scope_client VALUES ('0350c73b-e4db-4555-bf1d-bbf41a81315a', '34371776-65b2-4a47-a6ad-3f54635ffb36', true);
INSERT INTO public.client_scope_client VALUES ('0350c73b-e4db-4555-bf1d-bbf41a81315a', '7f2a24ac-6d77-4068-a597-60c7706842ae', true);
INSERT INTO public.client_scope_client VALUES ('0350c73b-e4db-4555-bf1d-bbf41a81315a', '60a4f821-7c71-47fe-a352-e6e24fde59bb', true);
INSERT INTO public.client_scope_client VALUES ('0350c73b-e4db-4555-bf1d-bbf41a81315a', 'a47cfa61-711f-4f71-81a6-7631c5ed9e18', true);
INSERT INTO public.client_scope_client VALUES ('0350c73b-e4db-4555-bf1d-bbf41a81315a', '051c53b2-4c0f-4999-82d5-d4be5cbbf2d1', false);
INSERT INTO public.client_scope_client VALUES ('0350c73b-e4db-4555-bf1d-bbf41a81315a', 'c38ffa9e-7ffe-4bfc-91bf-a0ed0a5fcb40', false);
INSERT INTO public.client_scope_client VALUES ('0350c73b-e4db-4555-bf1d-bbf41a81315a', 'f569e5f0-d55f-4eec-851b-11645065b918', false);
INSERT INTO public.client_scope_client VALUES ('0350c73b-e4db-4555-bf1d-bbf41a81315a', 'b4c3b2b2-c503-43d7-9b6f-960a94fe54d8', false);
INSERT INTO public.client_scope_client VALUES ('f0861274-7936-4ee0-b4ef-087776e07f97', '34371776-65b2-4a47-a6ad-3f54635ffb36', true);
INSERT INTO public.client_scope_client VALUES ('f0861274-7936-4ee0-b4ef-087776e07f97', '7f2a24ac-6d77-4068-a597-60c7706842ae', true);
INSERT INTO public.client_scope_client VALUES ('f0861274-7936-4ee0-b4ef-087776e07f97', '60a4f821-7c71-47fe-a352-e6e24fde59bb', true);
INSERT INTO public.client_scope_client VALUES ('f0861274-7936-4ee0-b4ef-087776e07f97', 'a47cfa61-711f-4f71-81a6-7631c5ed9e18', true);
INSERT INTO public.client_scope_client VALUES ('f0861274-7936-4ee0-b4ef-087776e07f97', '051c53b2-4c0f-4999-82d5-d4be5cbbf2d1', false);
INSERT INTO public.client_scope_client VALUES ('f0861274-7936-4ee0-b4ef-087776e07f97', 'c38ffa9e-7ffe-4bfc-91bf-a0ed0a5fcb40', false);
INSERT INTO public.client_scope_client VALUES ('f0861274-7936-4ee0-b4ef-087776e07f97', 'f569e5f0-d55f-4eec-851b-11645065b918', false);
INSERT INTO public.client_scope_client VALUES ('f0861274-7936-4ee0-b4ef-087776e07f97', 'b4c3b2b2-c503-43d7-9b6f-960a94fe54d8', false);
INSERT INTO public.client_scope_client VALUES ('c0f58e0c-fcc0-4fd6-b64e-11df16b7719a', '34371776-65b2-4a47-a6ad-3f54635ffb36', true);
INSERT INTO public.client_scope_client VALUES ('c0f58e0c-fcc0-4fd6-b64e-11df16b7719a', '7f2a24ac-6d77-4068-a597-60c7706842ae', true);
INSERT INTO public.client_scope_client VALUES ('c0f58e0c-fcc0-4fd6-b64e-11df16b7719a', '60a4f821-7c71-47fe-a352-e6e24fde59bb', true);
INSERT INTO public.client_scope_client VALUES ('c0f58e0c-fcc0-4fd6-b64e-11df16b7719a', 'a47cfa61-711f-4f71-81a6-7631c5ed9e18', true);
INSERT INTO public.client_scope_client VALUES ('c0f58e0c-fcc0-4fd6-b64e-11df16b7719a', '051c53b2-4c0f-4999-82d5-d4be5cbbf2d1', false);
INSERT INTO public.client_scope_client VALUES ('c0f58e0c-fcc0-4fd6-b64e-11df16b7719a', 'c38ffa9e-7ffe-4bfc-91bf-a0ed0a5fcb40', false);
INSERT INTO public.client_scope_client VALUES ('c0f58e0c-fcc0-4fd6-b64e-11df16b7719a', 'f569e5f0-d55f-4eec-851b-11645065b918', false);
INSERT INTO public.client_scope_client VALUES ('c0f58e0c-fcc0-4fd6-b64e-11df16b7719a', 'b4c3b2b2-c503-43d7-9b6f-960a94fe54d8', false);
INSERT INTO public.client_scope_client VALUES ('234fc62f-0d9e-47f1-8ccd-905e33de62e3', '34371776-65b2-4a47-a6ad-3f54635ffb36', true);
INSERT INTO public.client_scope_client VALUES ('234fc62f-0d9e-47f1-8ccd-905e33de62e3', '7f2a24ac-6d77-4068-a597-60c7706842ae', true);
INSERT INTO public.client_scope_client VALUES ('234fc62f-0d9e-47f1-8ccd-905e33de62e3', '60a4f821-7c71-47fe-a352-e6e24fde59bb', true);
INSERT INTO public.client_scope_client VALUES ('234fc62f-0d9e-47f1-8ccd-905e33de62e3', 'a47cfa61-711f-4f71-81a6-7631c5ed9e18', true);
INSERT INTO public.client_scope_client VALUES ('234fc62f-0d9e-47f1-8ccd-905e33de62e3', '051c53b2-4c0f-4999-82d5-d4be5cbbf2d1', false);
INSERT INTO public.client_scope_client VALUES ('234fc62f-0d9e-47f1-8ccd-905e33de62e3', 'c38ffa9e-7ffe-4bfc-91bf-a0ed0a5fcb40', false);
INSERT INTO public.client_scope_client VALUES ('234fc62f-0d9e-47f1-8ccd-905e33de62e3', 'f569e5f0-d55f-4eec-851b-11645065b918', false);
INSERT INTO public.client_scope_client VALUES ('234fc62f-0d9e-47f1-8ccd-905e33de62e3', 'b4c3b2b2-c503-43d7-9b6f-960a94fe54d8', false);
INSERT INTO public.client_scope_client VALUES ('982f79bc-4b83-4983-abc4-f917708008ca', '34371776-65b2-4a47-a6ad-3f54635ffb36', true);
INSERT INTO public.client_scope_client VALUES ('982f79bc-4b83-4983-abc4-f917708008ca', '7f2a24ac-6d77-4068-a597-60c7706842ae', true);
INSERT INTO public.client_scope_client VALUES ('982f79bc-4b83-4983-abc4-f917708008ca', '60a4f821-7c71-47fe-a352-e6e24fde59bb', true);
INSERT INTO public.client_scope_client VALUES ('982f79bc-4b83-4983-abc4-f917708008ca', 'a47cfa61-711f-4f71-81a6-7631c5ed9e18', true);
INSERT INTO public.client_scope_client VALUES ('982f79bc-4b83-4983-abc4-f917708008ca', '051c53b2-4c0f-4999-82d5-d4be5cbbf2d1', false);
INSERT INTO public.client_scope_client VALUES ('982f79bc-4b83-4983-abc4-f917708008ca', 'c38ffa9e-7ffe-4bfc-91bf-a0ed0a5fcb40', false);
INSERT INTO public.client_scope_client VALUES ('982f79bc-4b83-4983-abc4-f917708008ca', 'f569e5f0-d55f-4eec-851b-11645065b918', false);
INSERT INTO public.client_scope_client VALUES ('982f79bc-4b83-4983-abc4-f917708008ca', 'b4c3b2b2-c503-43d7-9b6f-960a94fe54d8', false);
INSERT INTO public.client_scope_client VALUES ('551599da-86f9-447a-aa70-b3169d239cc8', '34371776-65b2-4a47-a6ad-3f54635ffb36', true);
INSERT INTO public.client_scope_client VALUES ('551599da-86f9-447a-aa70-b3169d239cc8', '7f2a24ac-6d77-4068-a597-60c7706842ae', true);
INSERT INTO public.client_scope_client VALUES ('551599da-86f9-447a-aa70-b3169d239cc8', '60a4f821-7c71-47fe-a352-e6e24fde59bb', true);
INSERT INTO public.client_scope_client VALUES ('551599da-86f9-447a-aa70-b3169d239cc8', 'a47cfa61-711f-4f71-81a6-7631c5ed9e18', true);
INSERT INTO public.client_scope_client VALUES ('551599da-86f9-447a-aa70-b3169d239cc8', '051c53b2-4c0f-4999-82d5-d4be5cbbf2d1', false);
INSERT INTO public.client_scope_client VALUES ('551599da-86f9-447a-aa70-b3169d239cc8', 'c38ffa9e-7ffe-4bfc-91bf-a0ed0a5fcb40', false);
INSERT INTO public.client_scope_client VALUES ('551599da-86f9-447a-aa70-b3169d239cc8', 'f569e5f0-d55f-4eec-851b-11645065b918', false);
INSERT INTO public.client_scope_client VALUES ('551599da-86f9-447a-aa70-b3169d239cc8', 'b4c3b2b2-c503-43d7-9b6f-960a94fe54d8', false);


--
-- TOC entry 3824 (class 0 OID 40922)
-- Dependencies: 263
-- Data for Name: client_scope_role_mapping; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.client_scope_role_mapping VALUES ('c38ffa9e-7ffe-4bfc-91bf-a0ed0a5fcb40', 'c03de996-5957-4060-a4a4-b4d21aadf9b8');


--
-- TOC entry 3766 (class 0 OID 40008)
-- Dependencies: 205
-- Data for Name: client_session; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3811 (class 0 OID 40685)
-- Dependencies: 250
-- Data for Name: client_session_auth_status; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3789 (class 0 OID 40376)
-- Dependencies: 228
-- Data for Name: client_session_note; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3803 (class 0 OID 40563)
-- Dependencies: 242
-- Data for Name: client_session_prot_mapper; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3767 (class 0 OID 40014)
-- Dependencies: 206
-- Data for Name: client_session_role; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3812 (class 0 OID 40766)
-- Dependencies: 251
-- Data for Name: client_user_session_note; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3842 (class 0 OID 41167)
-- Dependencies: 281
-- Data for Name: component; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.component VALUES ('c74a469c-486d-42b6-9e4c-af58b4c6374e', 'Trusted Hosts', 'master', 'trusted-hosts', 'org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy', 'master', 'anonymous');
INSERT INTO public.component VALUES ('dc3251f0-26fc-491c-8b42-e74d7c84d14f', 'Consent Required', 'master', 'consent-required', 'org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy', 'master', 'anonymous');
INSERT INTO public.component VALUES ('227909a7-08c3-4505-b40a-5321a3b41039', 'Full Scope Disabled', 'master', 'scope', 'org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy', 'master', 'anonymous');
INSERT INTO public.component VALUES ('30bc17e4-2a73-466f-9e62-86676c479359', 'Max Clients Limit', 'master', 'max-clients', 'org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy', 'master', 'anonymous');
INSERT INTO public.component VALUES ('a5a5443d-86b4-43a1-9b7f-cf6836d4315b', 'Allowed Protocol Mapper Types', 'master', 'allowed-protocol-mappers', 'org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy', 'master', 'anonymous');
INSERT INTO public.component VALUES ('c31b428a-be18-4d07-b36a-969a7cd69ced', 'Allowed Client Scopes', 'master', 'allowed-client-templates', 'org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy', 'master', 'anonymous');
INSERT INTO public.component VALUES ('72be2525-c8be-47c0-862a-f5bbedea87d7', 'Allowed Protocol Mapper Types', 'master', 'allowed-protocol-mappers', 'org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy', 'master', 'authenticated');
INSERT INTO public.component VALUES ('668548b1-918f-46d5-89f7-c8e6aaf9972a', 'Allowed Client Scopes', 'master', 'allowed-client-templates', 'org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy', 'master', 'authenticated');
INSERT INTO public.component VALUES ('03275f5d-d4b8-4db0-8f86-6a059b792654', 'rsa-generated', 'master', 'rsa-generated', 'org.keycloak.keys.KeyProvider', 'master', NULL);
INSERT INTO public.component VALUES ('9baa5c57-f963-48cc-9217-344321192596', 'rsa-enc-generated', 'master', 'rsa-enc-generated', 'org.keycloak.keys.KeyProvider', 'master', NULL);
INSERT INTO public.component VALUES ('d90e5d65-ce99-46ee-b886-7f7318657104', 'hmac-generated', 'master', 'hmac-generated', 'org.keycloak.keys.KeyProvider', 'master', NULL);
INSERT INTO public.component VALUES ('5a2a408d-a8dd-495d-b72e-3be2d9361a35', 'aes-generated', 'master', 'aes-generated', 'org.keycloak.keys.KeyProvider', 'master', NULL);


--
-- TOC entry 3841 (class 0 OID 41161)
-- Dependencies: 280
-- Data for Name: component_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.component_config VALUES ('84d96a93-6d22-4219-ad03-2443153e03ba', 'c31b428a-be18-4d07-b36a-969a7cd69ced', 'allow-default-scopes', 'true');
INSERT INTO public.component_config VALUES ('c09bc181-74a9-4118-8688-26dc6e145edf', '668548b1-918f-46d5-89f7-c8e6aaf9972a', 'allow-default-scopes', 'true');
INSERT INTO public.component_config VALUES ('48ff2dde-7938-43e3-8c62-52e4a1519bac', '30bc17e4-2a73-466f-9e62-86676c479359', 'max-clients', '200');
INSERT INTO public.component_config VALUES ('f326c6ea-abc4-4396-bad0-3b70ff6142f3', 'c74a469c-486d-42b6-9e4c-af58b4c6374e', 'host-sending-registration-request-must-match', 'true');
INSERT INTO public.component_config VALUES ('9c0822f4-9c35-4877-a712-ffa8dab8d46a', 'c74a469c-486d-42b6-9e4c-af58b4c6374e', 'client-uris-must-match', 'true');
INSERT INTO public.component_config VALUES ('b94efa41-7d09-45fc-8c12-c00fcecf3f19', 'a5a5443d-86b4-43a1-9b7f-cf6836d4315b', 'allowed-protocol-mapper-types', 'oidc-address-mapper');
INSERT INTO public.component_config VALUES ('787f092e-619f-4765-aded-9034dec79d8d', 'a5a5443d-86b4-43a1-9b7f-cf6836d4315b', 'allowed-protocol-mapper-types', 'saml-user-attribute-mapper');
INSERT INTO public.component_config VALUES ('68a631fd-6d6f-4862-9ff1-10d8dff48f36', 'a5a5443d-86b4-43a1-9b7f-cf6836d4315b', 'allowed-protocol-mapper-types', 'oidc-usermodel-attribute-mapper');
INSERT INTO public.component_config VALUES ('de45c60d-9dc9-4a9e-ba22-0e8abc705cc6', 'a5a5443d-86b4-43a1-9b7f-cf6836d4315b', 'allowed-protocol-mapper-types', 'oidc-full-name-mapper');
INSERT INTO public.component_config VALUES ('02f0f8b1-87a0-4217-99fc-62b3d6ccb404', 'a5a5443d-86b4-43a1-9b7f-cf6836d4315b', 'allowed-protocol-mapper-types', 'saml-user-property-mapper');
INSERT INTO public.component_config VALUES ('99148586-d449-487c-9746-10c76de56cfc', 'a5a5443d-86b4-43a1-9b7f-cf6836d4315b', 'allowed-protocol-mapper-types', 'oidc-usermodel-property-mapper');
INSERT INTO public.component_config VALUES ('9e7d2f18-4e7a-42f9-ae7a-d276c036944b', 'a5a5443d-86b4-43a1-9b7f-cf6836d4315b', 'allowed-protocol-mapper-types', 'oidc-sha256-pairwise-sub-mapper');
INSERT INTO public.component_config VALUES ('f17e3f90-df86-4fe0-bca8-7733939b3b58', 'a5a5443d-86b4-43a1-9b7f-cf6836d4315b', 'allowed-protocol-mapper-types', 'saml-role-list-mapper');
INSERT INTO public.component_config VALUES ('44f87a04-14c3-4d53-9390-b8b320e30429', '72be2525-c8be-47c0-862a-f5bbedea87d7', 'allowed-protocol-mapper-types', 'oidc-usermodel-attribute-mapper');
INSERT INTO public.component_config VALUES ('7df4a640-fc04-41da-ae4d-efc02e94edcc', '72be2525-c8be-47c0-862a-f5bbedea87d7', 'allowed-protocol-mapper-types', 'saml-user-property-mapper');
INSERT INTO public.component_config VALUES ('2b64e049-194f-4c4b-84af-bb9c3d774bf3', '72be2525-c8be-47c0-862a-f5bbedea87d7', 'allowed-protocol-mapper-types', 'oidc-address-mapper');
INSERT INTO public.component_config VALUES ('3f2d35d1-1e01-4b3b-b4b6-f2ececffe7bb', '72be2525-c8be-47c0-862a-f5bbedea87d7', 'allowed-protocol-mapper-types', 'oidc-usermodel-property-mapper');
INSERT INTO public.component_config VALUES ('dcaf25a6-f9f8-4e9e-9f9e-fa219826b513', '72be2525-c8be-47c0-862a-f5bbedea87d7', 'allowed-protocol-mapper-types', 'oidc-sha256-pairwise-sub-mapper');
INSERT INTO public.component_config VALUES ('3e0b7e30-e450-46f8-bef7-b55c76db830e', '72be2525-c8be-47c0-862a-f5bbedea87d7', 'allowed-protocol-mapper-types', 'saml-role-list-mapper');
INSERT INTO public.component_config VALUES ('23eb5b3e-8a3a-4021-b0f6-81676fdc5492', '72be2525-c8be-47c0-862a-f5bbedea87d7', 'allowed-protocol-mapper-types', 'oidc-full-name-mapper');
INSERT INTO public.component_config VALUES ('b25e05cc-4cfc-4e8f-9cb1-bd3d0661796f', '72be2525-c8be-47c0-862a-f5bbedea87d7', 'allowed-protocol-mapper-types', 'saml-user-attribute-mapper');
INSERT INTO public.component_config VALUES ('56fe2100-db64-492c-bfb6-dc962c8b6fe0', '5a2a408d-a8dd-495d-b72e-3be2d9361a35', 'secret', '0b2UgiRIZPlgY5zdlEBzXg');
INSERT INTO public.component_config VALUES ('7e1487df-c2d1-4bc1-970b-81186838def0', '5a2a408d-a8dd-495d-b72e-3be2d9361a35', 'priority', '100');
INSERT INTO public.component_config VALUES ('e629533a-8728-4ad6-a800-23a7e2155899', '5a2a408d-a8dd-495d-b72e-3be2d9361a35', 'kid', '78164559-42ff-4d9e-ac83-fa39780f5b2f');
INSERT INTO public.component_config VALUES ('470e85ed-261f-4c93-a998-9be418036522', '03275f5d-d4b8-4db0-8f86-6a059b792654', 'certificate', 'MIICmzCCAYMCBgF/4CDrtDANBgkqhkiG9w0BAQsFADARMQ8wDQYDVQQDDAZtYXN0ZXIwHhcNMjIwMzMxMTMxNzA4WhcNMzIwMzMxMTMxODQ4WjARMQ8wDQYDVQQDDAZtYXN0ZXIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCRlByi7Nr1CYc/RJRQZp/bMW9xGb0qp6xNO4q0237yQBSK9Hjk5mZmYP07XVCLS4ZN9O+Ym0haBnvEzZ2cl0lszYMUezehSoMRSOD84uAayvbr14rH2yRFj5xehomm58uIi3Cr6Kc7E5fzmTA8KBYGRNs8F/5OW7lsHajE6I6fOd+nycjVfnRL0Tu1EbxarjKxqsosXpkOc8pK5MXvDUFAJKWi+5E+XA6Cmtj5wyX/eFsTR/TX5AThC2eblWMC/TDKCtvldnmlkM4I6wVzb8tLlQLOsTCxqagas4zjCUH3SwYYt6rJpJqwzPxr2vQMUi7rJC1Lcsb9Mv6HdsE9ztyBAgMBAAEwDQYJKoZIhvcNAQELBQADggEBACXEDoXdLpAso0NIiWJ5SnQ4Ps3qoO2+5hMaA/avgMA6+nAKQHlwTLy1gA61A6R4u9kl1j9vmk30hAmOUm8jNJGckh/OChhajoD7yiYjSyNx8F+WWMuhxoMF6Lp/AA6veJsBUhnAB+3gl87XydtHqwV34uy7714oARRIJVkJyGJ2G/V0RvLxSdKv3BpS6ozfInQcmcRJ5J6P4NsHYdrn3sueQRD3Ujrwe9NxchbU9lNB2TYNMZjnQB4CzOs+OhAq1LEH9Fv9sOgKVwEAOuGCofcDi4qicSfqTgYh2ZrOK2GkxtPcyA7UEEa7fC8eKOBKpCcC0maEIyLEtopOZ+U717I=');
INSERT INTO public.component_config VALUES ('96c38f37-2a86-4361-8693-90d25ed12ab6', '03275f5d-d4b8-4db0-8f86-6a059b792654', 'keyUse', 'SIG');
INSERT INTO public.component_config VALUES ('8be11fe1-9306-4220-bf49-79416de19656', '03275f5d-d4b8-4db0-8f86-6a059b792654', 'priority', '100');
INSERT INTO public.component_config VALUES ('033c35c3-6012-4002-bb13-dca549d02197', '03275f5d-d4b8-4db0-8f86-6a059b792654', 'privateKey', 'MIIEpQIBAAKCAQEAkZQcouza9QmHP0SUUGaf2zFvcRm9KqesTTuKtNt+8kAUivR45OZmZmD9O11Qi0uGTfTvmJtIWgZ7xM2dnJdJbM2DFHs3oUqDEUjg/OLgGsr269eKx9skRY+cXoaJpufLiItwq+inOxOX85kwPCgWBkTbPBf+Tlu5bB2oxOiOnznfp8nI1X50S9E7tRG8Wq4ysarKLF6ZDnPKSuTF7w1BQCSlovuRPlwOgprY+cMl/3hbE0f01+QE4Qtnm5VjAv0wygrb5XZ5pZDOCOsFc2/LS5UCzrEwsamoGrOM4wlB90sGGLeqyaSasMz8a9r0DFIu6yQtS3LG/TL+h3bBPc7cgQIDAQABAoIBADG7rLDIQ+EUWTz2+8gf1xq138F+ro5E6+sSnUc9+TdfRuVVsXtZbsApADnonhyIN6CoPbYfzm7a6iuIpwCY+n+OEerMUWvrna0o/ZvHEhJ1JjfZ0dKG/fQ5pIzyX1JCu9iw8lP4TjEzd2TD/6N9elC380GrXLh+Q3E5DLAAVsD0K5nuKD5pQaSBJXoLmCvG66NVSF+ctYtAPSOPQB2tXbQs1EbRTXT7PZ2fxPXoaC5p+gcCtWQb1BkX9jKAIjjgflIB0IYFI0b4dzHByoMbGYoB0TVTSuM14jiaqTqJUPAoKpUMXcCO6I8sjH2bJtecpMm2Nc5/BSfZVd7Tab+mv3ECgYEAwW3xmu3h+zSVdpdXGtQCvsYcWJ0+QmnQUjpA79Ak5AydAR9dzNZFeWEqGiyJ2IL6we4w+XxU5X+8XPnin5U84FkICODs/x9r2zKsn+oOx6N/KCnTRG0ojYXv/sWQ4TlVUv38tWs00SKTA7u9lJgxWeVr+bLrFrrs00IpZMQyBh0CgYEAwKuYMQ3XZ3kxS+Zut4hZefRZp8IiHtJmkOnuScFnojY70T+q766GuOMKJq9XlFK4QCQtlSk2Oxjz2b7Fip+hYespMPxaoRz21Sa0zlUGuPqLbeop7GwDFS24aKGwXZ12bb3/6K2E9kvuB4caufgnOw6Uv+h36c8DCsjKxriEkrUCgYEAh9Ku2658h0uWRC7jADitMM6l6ueHZ1Ur7gFvxbVvoh7lRHuE/yfaou/Cg5yQstLOR8z84MMYTgrS9qqVIp/FnneF984RPNgQgVvk8WmGNVMuH8K20g6gcjgBnPGX2T7MFjm48J81+ECB4RY8ehIgXVKG7lBfWZeqYnHL5TELO1UCgYEAhTzlBV9GC9digNN800zmW5DgA0QcJmZn6WTslXK7AREyMpUt14xAvFC9r1zoWrkNk8WxBAq45wttbrIfl6qmhrmCBc8tuWb3RxX6SQnBmWAh1cPudAGJ7DZu5WSTO1nuERwogbalUVHW7LvAfsSeFJgTw9a2PikbOHT8zYnCnFUCgYEAr7N+tK+fqyL4cp5o6vOJaz1pnxLzTT4e9tHbYHjJnu1xet3ty08rBCPrLFIsaF9Oy5oRot+s+NZBwn8XlhJu/D64wZ5LJeb1EhIcmvJyAlAlLEaSI9MFpBje7+Tv3ERM+mX6p2IZX8TTnGQz+g9esJX6qsoq0f2trEjcM2CvWlE=');
INSERT INTO public.component_config VALUES ('b865fa13-ccd4-4f52-b16c-61e8ed7a65f5', '9baa5c57-f963-48cc-9217-344321192596', 'priority', '100');
INSERT INTO public.component_config VALUES ('13ae2b49-6305-4a3e-8174-c897e430c946', '9baa5c57-f963-48cc-9217-344321192596', 'privateKey', 'MIIEowIBAAKCAQEAiaunEd5EQUMdc1SG03alPJmuBOlKblgloc8GonKh/7VG3SCZ5qsQ81uVFx+Jy4yQGEJGSpuWbTXl/2Xn8YXV0jSLyqHM5kc32IexQVPfgcdvcD8RleAGrdvmeKGb/U1GlI17QFBZzr39jFo0e7v8YfoOPJ1HlCJxDZ/bJB638t5gKGpn6ETnw1fmOCJCPmrbIk4Blrx+sxs6GXkTOzqlWUVomTRKu7y7UfCem1+dOU54RBKYBX0hlVOvgCancG+h9vOQGOCKDyhS0gf8bD0XLsMPOfIDQJQUF9MepNyuuJ6kDq2qOnXCroHmewyatd00WfSFoQymYj1rSA4ink3gswIDAQABAoIBAG+71x7TbEYjeJWP9tVNqBIlEG2AAh7If9JxugrCSuTEdb0mpoHmOR2qKLjZqfaAILrvnykSWeZNJlxAkx0c6EtwxjwxUaFcD+E3UA+bSP2FpdZN+bHQXttgbA9f6sCMpUoQAgZSsHDxFgWBeLMsAUxrrH5ZkCyUP3k1UqBgJh+ATYG80wpq5HhdwTx7m4w10/C+YJ9Qz9Arc7VC19GHO63TCNlLUdbX5pGwPS+Ud7MtatgcHh1951vYl+yHSIkmk9c8PouL6lDB9snidPFoVsbOF11xR+Q6E/OdiKGccS6UhJDnD4GWOFmd/Vb01Uo6Q4JRRKAiX9tlkxSpQF9jELECgYEA8mUluGcQ7rZO/w4bauNmZoecI1ijSOVzFUJIRy+1JeJGUsMdD+a/XuVqRfrHwsTpo1yD850FdX0xywJHHA4CGWS15UXEFjDkqZWUQUwp4v7OrFzuBP0zUte651wEqCpDDRKiVwt+f9YuHtutS06BxkJEdQdwm9aK368xwMC/bC8CgYEAkWXFSI9Gv6fJ7rWvNQkOXpFiksILAa8ldrSGc9TtmIt1JLJyAYTOtQ+Xvt1TD4sE16ZxdJuehxzlvdkZ9XCympxstcBC8AAMvPDm+j4mUegQgKXlDxKEZgv2ntgBFfPauQY/3GggJvC/GA+3CgZl3aJiFzwx/jdPZ/ryZruqnr0CgYB2awW3hdqW1EfZgPnSCVAQjPWxqu7ygO3tF9mZtWvpGxdB/YIoL5GUeb2mfHK062A858iq7i4pjMUTqYQ1534NC891N9UpBi/fzWyFTgE0nUk4mZnKpCw7r5rmxmScBzGEpHLc1YeySl9zwdxyauMpiVxKVB0mdPSZfMxwn3mlDwKBgEJTcpOPCG8VU4CZULuYzf1FxPm9mtfB1g04fL0KPPiBZYbAAFHBC6p82nQu8lz8xdC6FLdk5gQsooDgMH9OUatGADFI60AgRa9LFZLCFyj1+9Ez3DHr+Im0m2QKlTQ2cWhF+YvJ1CDvYbzQLmdcU8uu76A5zXRyNr7wMvO6WDLhAoGBAI05ArRQZeIQWvA8xqD1Ojj8fqcL1gidpMqtrfcSMIrQ9i/XbrQmsbGjRQEtyHEaymUJArmQaLKAMlC/+xEugwzzeNBjsEb3SfDQkWDOSsR2MKxrnyJ/PV6fKHChrKpmntplFPg7BS8Kjx2FE7z+meYZSh0v2MoQu1A5xIi0cwCL');
INSERT INTO public.component_config VALUES ('23b72b00-c87e-4281-81e1-63c7bb5c71a8', '9baa5c57-f963-48cc-9217-344321192596', 'algorithm', 'RSA-OAEP');
INSERT INTO public.component_config VALUES ('6de637be-f4fd-4e42-82cb-b7fdcf2ac074', '9baa5c57-f963-48cc-9217-344321192596', 'certificate', 'MIICmzCCAYMCBgF/4CD7YTANBgkqhkiG9w0BAQsFADARMQ8wDQYDVQQDDAZtYXN0ZXIwHhcNMjIwMzMxMTMxNzEyWhcNMzIwMzMxMTMxODUyWjARMQ8wDQYDVQQDDAZtYXN0ZXIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCJq6cR3kRBQx1zVIbTdqU8ma4E6UpuWCWhzwaicqH/tUbdIJnmqxDzW5UXH4nLjJAYQkZKm5ZtNeX/ZefxhdXSNIvKoczmRzfYh7FBU9+Bx29wPxGV4Aat2+Z4oZv9TUaUjXtAUFnOvf2MWjR7u/xh+g48nUeUInENn9skHrfy3mAoamfoROfDV+Y4IkI+atsiTgGWvH6zGzoZeRM7OqVZRWiZNEq7vLtR8J6bX505TnhEEpgFfSGVU6+AJqdwb6H285AY4IoPKFLSB/xsPRcuww858gNAlBQX0x6k3K64nqQOrao6dcKugeZ7DJq13TRZ9IWhDKZiPWtIDiKeTeCzAgMBAAEwDQYJKoZIhvcNAQELBQADggEBAExsouyJROXv7Rto+jJmNsThTXH65rD8ReNxmgYpLWPZ0kfPsqhm430M0MKnSJIfTap4nis8rJKCxG63qhYMcTbZTHJnjUsWscBZ8dN7p4x5zKGRC9iyTFok3E5KflUgpffkUsKGhezOrOQR6BLFrC1yws6kxYywm3K2CI8j5kKrpAE8AfV4J0o6USZ864mFK16ni9N43ytsnATqScHaSc57P7XpA/5+9HjTgRZzGbp4yAuaCAhB4pJQ2GkBLDHyr1U8hwG7zEmCEoEgUkbye1nLgar8XeaYCwqaOLZPwkZFpN6q683PfhDn+60mcmCe7b9Qb5KISTEmUwn1Dmdfnao=');
INSERT INTO public.component_config VALUES ('9297bf7f-1200-49a2-9840-589958de8084', '9baa5c57-f963-48cc-9217-344321192596', 'keyUse', 'ENC');
INSERT INTO public.component_config VALUES ('d58d646e-1879-4bd5-93a4-83a59a5069ee', 'd90e5d65-ce99-46ee-b886-7f7318657104', 'secret', '-70Y0n7U16A-g-082dhOoL8O2t0fIoW469dyRsMJCH1MdfeVEwG31_7iEEYIZq1D-gzAl-QV_AiGP54wyKdkcw');
INSERT INTO public.component_config VALUES ('b41ebd73-507a-4908-96ae-5479babb1ed9', 'd90e5d65-ce99-46ee-b886-7f7318657104', 'priority', '100');
INSERT INTO public.component_config VALUES ('ae091cce-794f-4fef-b9e1-00fd36658c70', 'd90e5d65-ce99-46ee-b886-7f7318657104', 'kid', '611cb70f-ae1e-4258-b476-cba1a282878e');
INSERT INTO public.component_config VALUES ('cfae5d59-b466-4811-a79b-09972070e8c2', 'd90e5d65-ce99-46ee-b886-7f7318657104', 'algorithm', 'HS256');


--
-- TOC entry 3768 (class 0 OID 40017)
-- Dependencies: 207
-- Data for Name: composite_role; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', 'c8f24237-e6a9-440c-98c7-1fcff103014a');
INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', '1b81e720-8ca2-4042-bcec-c8d7cb523d59');
INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', '2e4ff29f-7b22-46b8-b23a-a80b26128e48');
INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', 'f5050269-7ea4-468a-8f8f-6e47eba5bcef');
INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', 'f498f8b4-8171-4f47-8239-017c31e7a99a');
INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', '86c5467f-bbdd-4a3a-8c9b-1b9b5c56f8f7');
INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', '2b963824-254d-4eaa-abdb-0f59560caf14');
INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', '0e96d281-63bb-4186-b87f-c3cc74e0c02f');
INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', '1a15278c-f18c-4b98-aee8-abeac072c43b');
INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', '9af21e36-a9c3-4a63-803c-3fe7ea636ed7');
INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', '584bd94c-0b83-4b95-8a4a-1eac53415ab1');
INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', 'eb168aaa-4c79-49eb-894d-f2111eb54453');
INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', 'cd9e4e06-e523-4882-9218-ce8227cec681');
INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', '327b973c-ed1a-4eaa-bc58-93d5295280a0');
INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', '06b6d07a-4432-4af5-9b4a-4d3c042e4eb2');
INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', 'c6011a34-7fa4-4562-8ce4-18772a659c8b');
INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', '6ceacd69-dd9e-44a8-965b-df2d195bc19f');
INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', 'a31140dc-9c2f-43e5-9c90-d92b4c8f797b');
INSERT INTO public.composite_role VALUES ('f498f8b4-8171-4f47-8239-017c31e7a99a', 'c6011a34-7fa4-4562-8ce4-18772a659c8b');
INSERT INTO public.composite_role VALUES ('f5050269-7ea4-468a-8f8f-6e47eba5bcef', 'a31140dc-9c2f-43e5-9c90-d92b4c8f797b');
INSERT INTO public.composite_role VALUES ('f5050269-7ea4-468a-8f8f-6e47eba5bcef', '06b6d07a-4432-4af5-9b4a-4d3c042e4eb2');
INSERT INTO public.composite_role VALUES ('dbfd7da9-148f-4238-9c20-70b4b6db8b8f', '1340b277-65bf-47b1-9697-9bc99ffe6d56');
INSERT INTO public.composite_role VALUES ('dbfd7da9-148f-4238-9c20-70b4b6db8b8f', '6db6c2db-1a56-4164-bc6e-d2124baceeac');
INSERT INTO public.composite_role VALUES ('6db6c2db-1a56-4164-bc6e-d2124baceeac', 'b81c3922-3fb9-4f46-b8e6-832c798b5ea4');
INSERT INTO public.composite_role VALUES ('7ecdb134-f1a1-4b8b-8f19-e0b241b3cb0b', 'd672adcd-22e5-4ca4-8d59-78769ab8da88');
INSERT INTO public.composite_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', '688b927f-a73e-4524-a0b4-cc784141c5f0');
INSERT INTO public.composite_role VALUES ('dbfd7da9-148f-4238-9c20-70b4b6db8b8f', 'c03de996-5957-4060-a4a4-b4d21aadf9b8');
INSERT INTO public.composite_role VALUES ('dbfd7da9-148f-4238-9c20-70b4b6db8b8f', '6c1807d3-8d72-4750-8757-5d2323a1879b');


--
-- TOC entry 3769 (class 0 OID 40020)
-- Dependencies: 208
-- Data for Name: credential; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.credential VALUES ('144412ce-a21e-439d-b635-ca10c5de0291', NULL, 'password', 'a97177fe-51da-4bb1-a0c4-28a54247fec0', 1648732737257, NULL, '{"value":"H0hEwcctCHBHVii03AF5c3YaqzeCDjR4TLOzXsz5zR+cUA8YhMGpZ0cuxr5Y3YoN5Bb258fXN7Puw/XJo5Mt+g==","salt":"uzL2Z4Qvgr9yoXbX+Nootw==","additionalParameters":{}}', '{"hashIterations":27500,"algorithm":"pbkdf2-sha256","additionalParameters":{}}', 10);


--
-- TOC entry 3764 (class 0 OID 39987)
-- Dependencies: 203
-- Data for Name: databasechangelog; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.databasechangelog VALUES ('1.0.0.Final-KEYCLOAK-5461', 'sthorger@redhat.com', 'META-INF/jpa-changelog-1.0.0.Final.xml', '2022-03-31 10:47:11.043096', 1, 'EXECUTED', '8:bda77d94bf90182a1e30c24f1c155ec7', 'createTable tableName=APPLICATION_DEFAULT_ROLES; createTable tableName=CLIENT; createTable tableName=CLIENT_SESSION; createTable tableName=CLIENT_SESSION_ROLE; createTable tableName=COMPOSITE_ROLE; createTable tableName=CREDENTIAL; createTable tab...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.0.0.Final-KEYCLOAK-5461', 'sthorger@redhat.com', 'META-INF/db2-jpa-changelog-1.0.0.Final.xml', '2022-03-31 10:47:11.248433', 2, 'MARK_RAN', '8:1ecb330f30986693d1cba9ab579fa219', 'createTable tableName=APPLICATION_DEFAULT_ROLES; createTable tableName=CLIENT; createTable tableName=CLIENT_SESSION; createTable tableName=CLIENT_SESSION_ROLE; createTable tableName=COMPOSITE_ROLE; createTable tableName=CREDENTIAL; createTable tab...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.1.0.Beta1', 'sthorger@redhat.com', 'META-INF/jpa-changelog-1.1.0.Beta1.xml', '2022-03-31 10:47:11.470985', 3, 'EXECUTED', '8:cb7ace19bc6d959f305605d255d4c843', 'delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION; createTable tableName=CLIENT_ATTRIBUTES; createTable tableName=CLIENT_SESSION_NOTE; createTable tableName=APP_NODE_REGISTRATIONS; addColumn table...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.1.0.Final', 'sthorger@redhat.com', 'META-INF/jpa-changelog-1.1.0.Final.xml', '2022-03-31 10:47:11.548401', 4, 'EXECUTED', '8:80230013e961310e6872e871be424a63', 'renameColumn newColumnName=EVENT_TIME, oldColumnName=TIME, tableName=EVENT_ENTITY', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.2.0.Beta1', 'psilva@redhat.com', 'META-INF/jpa-changelog-1.2.0.Beta1.xml', '2022-03-31 10:47:12.258913', 5, 'EXECUTED', '8:67f4c20929126adc0c8e9bf48279d244', 'delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION; createTable tableName=PROTOCOL_MAPPER; createTable tableName=PROTOCOL_MAPPER_CONFIG; createTable tableName=...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.2.0.Beta1', 'psilva@redhat.com', 'META-INF/db2-jpa-changelog-1.2.0.Beta1.xml', '2022-03-31 10:47:12.263284', 6, 'MARK_RAN', '8:7311018b0b8179ce14628ab412bb6783', 'delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION; createTable tableName=PROTOCOL_MAPPER; createTable tableName=PROTOCOL_MAPPER_CONFIG; createTable tableName=...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.2.0.RC1', 'bburke@redhat.com', 'META-INF/jpa-changelog-1.2.0.CR1.xml', '2022-03-31 10:47:12.657759', 7, 'EXECUTED', '8:037ba1216c3640f8785ee6b8e7c8e3c1', 'delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION_NOTE; delete tableName=USER_SESSION; createTable tableName=MIGRATION_MODEL; createTable tableName=IDENTITY_P...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.2.0.RC1', 'bburke@redhat.com', 'META-INF/db2-jpa-changelog-1.2.0.CR1.xml', '2022-03-31 10:47:12.660831', 8, 'MARK_RAN', '8:7fe6ffe4af4df289b3157de32c624263', 'delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION_NOTE; delete tableName=USER_SESSION; createTable tableName=MIGRATION_MODEL; createTable tableName=IDENTITY_P...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.2.0.Final', 'keycloak', 'META-INF/jpa-changelog-1.2.0.Final.xml', '2022-03-31 10:47:12.665063', 9, 'EXECUTED', '8:9c136bc3187083a98745c7d03bc8a303', 'update tableName=CLIENT; update tableName=CLIENT; update tableName=CLIENT', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.3.0', 'bburke@redhat.com', 'META-INF/jpa-changelog-1.3.0.xml', '2022-03-31 10:47:13.152803', 10, 'EXECUTED', '8:b5f09474dca81fb56a97cf5b6553d331', 'delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_PROT_MAPPER; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION_NOTE; delete tableName=USER_SESSION; createTable tableName=ADMI...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.4.0', 'bburke@redhat.com', 'META-INF/jpa-changelog-1.4.0.xml', '2022-03-31 10:47:13.447971', 11, 'EXECUTED', '8:ca924f31bd2a3b219fdcfe78c82dacf4', 'delete tableName=CLIENT_SESSION_AUTH_STATUS; delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_PROT_MAPPER; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION_NOTE; delete table...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.4.0', 'bburke@redhat.com', 'META-INF/db2-jpa-changelog-1.4.0.xml', '2022-03-31 10:47:13.450632', 12, 'MARK_RAN', '8:8acad7483e106416bcfa6f3b824a16cd', 'delete tableName=CLIENT_SESSION_AUTH_STATUS; delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_PROT_MAPPER; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION_NOTE; delete table...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.5.0', 'bburke@redhat.com', 'META-INF/jpa-changelog-1.5.0.xml', '2022-03-31 10:47:13.549541', 13, 'EXECUTED', '8:9b1266d17f4f87c78226f5055408fd5e', 'delete tableName=CLIENT_SESSION_AUTH_STATUS; delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_PROT_MAPPER; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION_NOTE; delete table...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.6.1_from15', 'mposolda@redhat.com', 'META-INF/jpa-changelog-1.6.1.xml', '2022-03-31 10:47:13.649631', 14, 'EXECUTED', '8:d80ec4ab6dbfe573550ff72396c7e910', 'addColumn tableName=REALM; addColumn tableName=KEYCLOAK_ROLE; addColumn tableName=CLIENT; createTable tableName=OFFLINE_USER_SESSION; createTable tableName=OFFLINE_CLIENT_SESSION; addPrimaryKey constraintName=CONSTRAINT_OFFL_US_SES_PK2, tableName=...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.6.1_from16-pre', 'mposolda@redhat.com', 'META-INF/jpa-changelog-1.6.1.xml', '2022-03-31 10:47:13.652633', 15, 'MARK_RAN', '8:d86eb172171e7c20b9c849b584d147b2', 'delete tableName=OFFLINE_CLIENT_SESSION; delete tableName=OFFLINE_USER_SESSION', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.6.1_from16', 'mposolda@redhat.com', 'META-INF/jpa-changelog-1.6.1.xml', '2022-03-31 10:47:13.655064', 16, 'MARK_RAN', '8:5735f46f0fa60689deb0ecdc2a0dea22', 'dropPrimaryKey constraintName=CONSTRAINT_OFFLINE_US_SES_PK, tableName=OFFLINE_USER_SESSION; dropPrimaryKey constraintName=CONSTRAINT_OFFLINE_CL_SES_PK, tableName=OFFLINE_CLIENT_SESSION; addColumn tableName=OFFLINE_USER_SESSION; update tableName=OF...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.6.1', 'mposolda@redhat.com', 'META-INF/jpa-changelog-1.6.1.xml', '2022-03-31 10:47:13.657453', 17, 'EXECUTED', '8:d41d8cd98f00b204e9800998ecf8427e', 'empty', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.7.0', 'bburke@redhat.com', 'META-INF/jpa-changelog-1.7.0.xml', '2022-03-31 10:47:13.85723', 18, 'EXECUTED', '8:5c1a8fd2014ac7fc43b90a700f117b23', 'createTable tableName=KEYCLOAK_GROUP; createTable tableName=GROUP_ROLE_MAPPING; createTable tableName=GROUP_ATTRIBUTE; createTable tableName=USER_GROUP_MEMBERSHIP; createTable tableName=REALM_DEFAULT_GROUPS; addColumn tableName=IDENTITY_PROVIDER; ...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.8.0', 'mposolda@redhat.com', 'META-INF/jpa-changelog-1.8.0.xml', '2022-03-31 10:47:14.249462', 19, 'EXECUTED', '8:1f6c2c2dfc362aff4ed75b3f0ef6b331', 'addColumn tableName=IDENTITY_PROVIDER; createTable tableName=CLIENT_TEMPLATE; createTable tableName=CLIENT_TEMPLATE_ATTRIBUTES; createTable tableName=TEMPLATE_SCOPE_MAPPING; dropNotNullConstraint columnName=CLIENT_ID, tableName=PROTOCOL_MAPPER; ad...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.8.0-2', 'keycloak', 'META-INF/jpa-changelog-1.8.0.xml', '2022-03-31 10:47:14.25454', 20, 'EXECUTED', '8:dee9246280915712591f83a127665107', 'dropDefaultValue columnName=ALGORITHM, tableName=CREDENTIAL; update tableName=CREDENTIAL', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('authz-3.4.0.CR1-resource-server-pk-change-part1', 'glavoie@gmail.com', 'META-INF/jpa-changelog-authz-3.4.0.CR1.xml', '2022-03-31 10:47:22.263845', 45, 'EXECUTED', '8:a164ae073c56ffdbc98a615493609a52', 'addColumn tableName=RESOURCE_SERVER_POLICY; addColumn tableName=RESOURCE_SERVER_RESOURCE; addColumn tableName=RESOURCE_SERVER_SCOPE', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.8.0', 'mposolda@redhat.com', 'META-INF/db2-jpa-changelog-1.8.0.xml', '2022-03-31 10:47:14.256383', 21, 'MARK_RAN', '8:9eb2ee1fa8ad1c5e426421a6f8fdfa6a', 'addColumn tableName=IDENTITY_PROVIDER; createTable tableName=CLIENT_TEMPLATE; createTable tableName=CLIENT_TEMPLATE_ATTRIBUTES; createTable tableName=TEMPLATE_SCOPE_MAPPING; dropNotNullConstraint columnName=CLIENT_ID, tableName=PROTOCOL_MAPPER; ad...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.8.0-2', 'keycloak', 'META-INF/db2-jpa-changelog-1.8.0.xml', '2022-03-31 10:47:14.259593', 22, 'MARK_RAN', '8:dee9246280915712591f83a127665107', 'dropDefaultValue columnName=ALGORITHM, tableName=CREDENTIAL; update tableName=CREDENTIAL', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.9.0', 'mposolda@redhat.com', 'META-INF/jpa-changelog-1.9.0.xml', '2022-03-31 10:47:14.551552', 23, 'EXECUTED', '8:d9fa18ffa355320395b86270680dd4fe', 'update tableName=REALM; update tableName=REALM; update tableName=REALM; update tableName=REALM; update tableName=CREDENTIAL; update tableName=CREDENTIAL; update tableName=CREDENTIAL; update tableName=REALM; update tableName=REALM; customChange; dr...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.9.1', 'keycloak', 'META-INF/jpa-changelog-1.9.1.xml', '2022-03-31 10:47:14.557679', 24, 'EXECUTED', '8:90cff506fedb06141ffc1c71c4a1214c', 'modifyDataType columnName=PRIVATE_KEY, tableName=REALM; modifyDataType columnName=PUBLIC_KEY, tableName=REALM; modifyDataType columnName=CERTIFICATE, tableName=REALM', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.9.1', 'keycloak', 'META-INF/db2-jpa-changelog-1.9.1.xml', '2022-03-31 10:47:14.560142', 25, 'MARK_RAN', '8:11a788aed4961d6d29c427c063af828c', 'modifyDataType columnName=PRIVATE_KEY, tableName=REALM; modifyDataType columnName=CERTIFICATE, tableName=REALM', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('1.9.2', 'keycloak', 'META-INF/jpa-changelog-1.9.2.xml', '2022-03-31 10:47:15.354177', 26, 'EXECUTED', '8:a4218e51e1faf380518cce2af5d39b43', 'createIndex indexName=IDX_USER_EMAIL, tableName=USER_ENTITY; createIndex indexName=IDX_USER_ROLE_MAPPING, tableName=USER_ROLE_MAPPING; createIndex indexName=IDX_USER_GROUP_MAPPING, tableName=USER_GROUP_MEMBERSHIP; createIndex indexName=IDX_USER_CO...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('authz-2.0.0', 'psilva@redhat.com', 'META-INF/jpa-changelog-authz-2.0.0.xml', '2022-03-31 10:47:15.749802', 27, 'EXECUTED', '8:d9e9a1bfaa644da9952456050f07bbdc', 'createTable tableName=RESOURCE_SERVER; addPrimaryKey constraintName=CONSTRAINT_FARS, tableName=RESOURCE_SERVER; addUniqueConstraint constraintName=UK_AU8TT6T700S9V50BU18WS5HA6, tableName=RESOURCE_SERVER; createTable tableName=RESOURCE_SERVER_RESOU...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('authz-2.5.1', 'psilva@redhat.com', 'META-INF/jpa-changelog-authz-2.5.1.xml', '2022-03-31 10:47:15.753936', 28, 'EXECUTED', '8:d1bf991a6163c0acbfe664b615314505', 'update tableName=RESOURCE_SERVER_POLICY', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('2.1.0-KEYCLOAK-5461', 'bburke@redhat.com', 'META-INF/jpa-changelog-2.1.0.xml', '2022-03-31 10:47:16.169906', 29, 'EXECUTED', '8:88a743a1e87ec5e30bf603da68058a8c', 'createTable tableName=BROKER_LINK; createTable tableName=FED_USER_ATTRIBUTE; createTable tableName=FED_USER_CONSENT; createTable tableName=FED_USER_CONSENT_ROLE; createTable tableName=FED_USER_CONSENT_PROT_MAPPER; createTable tableName=FED_USER_CR...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('2.2.0', 'bburke@redhat.com', 'META-INF/jpa-changelog-2.2.0.xml', '2022-03-31 10:47:16.257596', 30, 'EXECUTED', '8:c5517863c875d325dea463d00ec26d7a', 'addColumn tableName=ADMIN_EVENT_ENTITY; createTable tableName=CREDENTIAL_ATTRIBUTE; createTable tableName=FED_CREDENTIAL_ATTRIBUTE; modifyDataType columnName=VALUE, tableName=CREDENTIAL; addForeignKeyConstraint baseTableName=FED_CREDENTIAL_ATTRIBU...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('2.3.0', 'bburke@redhat.com', 'META-INF/jpa-changelog-2.3.0.xml', '2022-03-31 10:47:16.365202', 31, 'EXECUTED', '8:ada8b4833b74a498f376d7136bc7d327', 'createTable tableName=FEDERATED_USER; addPrimaryKey constraintName=CONSTR_FEDERATED_USER, tableName=FEDERATED_USER; dropDefaultValue columnName=TOTP, tableName=USER_ENTITY; dropColumn columnName=TOTP, tableName=USER_ENTITY; addColumn tableName=IDE...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('2.4.0', 'bburke@redhat.com', 'META-INF/jpa-changelog-2.4.0.xml', '2022-03-31 10:47:16.442915', 32, 'EXECUTED', '8:b9b73c8ea7299457f99fcbb825c263ba', 'customChange', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('2.5.0', 'bburke@redhat.com', 'META-INF/jpa-changelog-2.5.0.xml', '2022-03-31 10:47:16.449419', 33, 'EXECUTED', '8:07724333e625ccfcfc5adc63d57314f3', 'customChange; modifyDataType columnName=USER_ID, tableName=OFFLINE_USER_SESSION', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('2.5.0-unicode-oracle', 'hmlnarik@redhat.com', 'META-INF/jpa-changelog-2.5.0.xml', '2022-03-31 10:47:16.453077', 34, 'MARK_RAN', '8:8b6fd445958882efe55deb26fc541a7b', 'modifyDataType columnName=DESCRIPTION, tableName=AUTHENTICATION_FLOW; modifyDataType columnName=DESCRIPTION, tableName=CLIENT_TEMPLATE; modifyDataType columnName=DESCRIPTION, tableName=RESOURCE_SERVER_POLICY; modifyDataType columnName=DESCRIPTION,...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('2.5.0-unicode-other-dbs', 'hmlnarik@redhat.com', 'META-INF/jpa-changelog-2.5.0.xml', '2022-03-31 10:47:16.561274', 35, 'EXECUTED', '8:29b29cfebfd12600897680147277a9d7', 'modifyDataType columnName=DESCRIPTION, tableName=AUTHENTICATION_FLOW; modifyDataType columnName=DESCRIPTION, tableName=CLIENT_TEMPLATE; modifyDataType columnName=DESCRIPTION, tableName=RESOURCE_SERVER_POLICY; modifyDataType columnName=DESCRIPTION,...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('2.5.0-duplicate-email-support', 'slawomir@dabek.name', 'META-INF/jpa-changelog-2.5.0.xml', '2022-03-31 10:47:16.566225', 36, 'EXECUTED', '8:73ad77ca8fd0410c7f9f15a471fa52bc', 'addColumn tableName=REALM', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('2.5.0-unique-group-names', 'hmlnarik@redhat.com', 'META-INF/jpa-changelog-2.5.0.xml', '2022-03-31 10:47:16.57146', 37, 'EXECUTED', '8:64f27a6fdcad57f6f9153210f2ec1bdb', 'addUniqueConstraint constraintName=SIBLING_NAMES, tableName=KEYCLOAK_GROUP', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('2.5.1', 'bburke@redhat.com', 'META-INF/jpa-changelog-2.5.1.xml', '2022-03-31 10:47:16.575423', 38, 'EXECUTED', '8:27180251182e6c31846c2ddab4bc5781', 'addColumn tableName=FED_USER_CONSENT', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('3.0.0', 'bburke@redhat.com', 'META-INF/jpa-changelog-3.0.0.xml', '2022-03-31 10:47:16.644618', 39, 'EXECUTED', '8:d56f201bfcfa7a1413eb3e9bc02978f9', 'addColumn tableName=IDENTITY_PROVIDER', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('3.2.0-fix', 'keycloak', 'META-INF/jpa-changelog-3.2.0.xml', '2022-03-31 10:47:16.64689', 40, 'MARK_RAN', '8:91f5522bf6afdc2077dfab57fbd3455c', 'addNotNullConstraint columnName=REALM_ID, tableName=CLIENT_INITIAL_ACCESS', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('3.2.0-fix-with-keycloak-5416', 'keycloak', 'META-INF/jpa-changelog-3.2.0.xml', '2022-03-31 10:47:16.648987', 41, 'MARK_RAN', '8:0f01b554f256c22caeb7d8aee3a1cdc8', 'dropIndex indexName=IDX_CLIENT_INIT_ACC_REALM, tableName=CLIENT_INITIAL_ACCESS; addNotNullConstraint columnName=REALM_ID, tableName=CLIENT_INITIAL_ACCESS; createIndex indexName=IDX_CLIENT_INIT_ACC_REALM, tableName=CLIENT_INITIAL_ACCESS', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('3.2.0-fix-offline-sessions', 'hmlnarik', 'META-INF/jpa-changelog-3.2.0.xml', '2022-03-31 10:47:16.653897', 42, 'EXECUTED', '8:ab91cf9cee415867ade0e2df9651a947', 'customChange', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('3.2.0-fixed', 'keycloak', 'META-INF/jpa-changelog-3.2.0.xml', '2022-03-31 10:47:22.255278', 43, 'EXECUTED', '8:ceac9b1889e97d602caf373eadb0d4b7', 'addColumn tableName=REALM; dropPrimaryKey constraintName=CONSTRAINT_OFFL_CL_SES_PK2, tableName=OFFLINE_CLIENT_SESSION; dropColumn columnName=CLIENT_SESSION_ID, tableName=OFFLINE_CLIENT_SESSION; addPrimaryKey constraintName=CONSTRAINT_OFFL_CL_SES_P...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('3.3.0', 'keycloak', 'META-INF/jpa-changelog-3.3.0.xml', '2022-03-31 10:47:22.259438', 44, 'EXECUTED', '8:84b986e628fe8f7fd8fd3c275c5259f2', 'addColumn tableName=USER_ENTITY', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('authz-3.4.0.CR1-resource-server-pk-change-part2-KEYCLOAK-6095', 'hmlnarik@redhat.com', 'META-INF/jpa-changelog-authz-3.4.0.CR1.xml', '2022-03-31 10:47:22.269144', 46, 'EXECUTED', '8:70a2b4f1f4bd4dbf487114bdb1810e64', 'customChange', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('authz-3.4.0.CR1-resource-server-pk-change-part3-fixed', 'glavoie@gmail.com', 'META-INF/jpa-changelog-authz-3.4.0.CR1.xml', '2022-03-31 10:47:22.270813', 47, 'MARK_RAN', '8:7be68b71d2f5b94b8df2e824f2860fa2', 'dropIndex indexName=IDX_RES_SERV_POL_RES_SERV, tableName=RESOURCE_SERVER_POLICY; dropIndex indexName=IDX_RES_SRV_RES_RES_SRV, tableName=RESOURCE_SERVER_RESOURCE; dropIndex indexName=IDX_RES_SRV_SCOPE_RES_SRV, tableName=RESOURCE_SERVER_SCOPE', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('authz-3.4.0.CR1-resource-server-pk-change-part3-fixed-nodropindex', 'glavoie@gmail.com', 'META-INF/jpa-changelog-authz-3.4.0.CR1.xml', '2022-03-31 10:47:22.567983', 48, 'EXECUTED', '8:bab7c631093c3861d6cf6144cd944982', 'addNotNullConstraint columnName=RESOURCE_SERVER_CLIENT_ID, tableName=RESOURCE_SERVER_POLICY; addNotNullConstraint columnName=RESOURCE_SERVER_CLIENT_ID, tableName=RESOURCE_SERVER_RESOURCE; addNotNullConstraint columnName=RESOURCE_SERVER_CLIENT_ID, ...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('authn-3.4.0.CR1-refresh-token-max-reuse', 'glavoie@gmail.com', 'META-INF/jpa-changelog-authz-3.4.0.CR1.xml', '2022-03-31 10:47:22.644499', 49, 'EXECUTED', '8:fa809ac11877d74d76fe40869916daad', 'addColumn tableName=REALM', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('3.4.0', 'keycloak', 'META-INF/jpa-changelog-3.4.0.xml', '2022-03-31 10:47:22.757158', 50, 'EXECUTED', '8:fac23540a40208f5f5e326f6ceb4d291', 'addPrimaryKey constraintName=CONSTRAINT_REALM_DEFAULT_ROLES, tableName=REALM_DEFAULT_ROLES; addPrimaryKey constraintName=CONSTRAINT_COMPOSITE_ROLE, tableName=COMPOSITE_ROLE; addPrimaryKey constraintName=CONSTR_REALM_DEFAULT_GROUPS, tableName=REALM...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('3.4.0-KEYCLOAK-5230', 'hmlnarik@redhat.com', 'META-INF/jpa-changelog-3.4.0.xml', '2022-03-31 10:47:23.547483', 51, 'EXECUTED', '8:2612d1b8a97e2b5588c346e817307593', 'createIndex indexName=IDX_FU_ATTRIBUTE, tableName=FED_USER_ATTRIBUTE; createIndex indexName=IDX_FU_CONSENT, tableName=FED_USER_CONSENT; createIndex indexName=IDX_FU_CONSENT_RU, tableName=FED_USER_CONSENT; createIndex indexName=IDX_FU_CREDENTIAL, t...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('3.4.1', 'psilva@redhat.com', 'META-INF/jpa-changelog-3.4.1.xml', '2022-03-31 10:47:23.552273', 52, 'EXECUTED', '8:9842f155c5db2206c88bcb5d1046e941', 'modifyDataType columnName=VALUE, tableName=CLIENT_ATTRIBUTES', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('3.4.2', 'keycloak', 'META-INF/jpa-changelog-3.4.2.xml', '2022-03-31 10:47:23.556354', 53, 'EXECUTED', '8:2e12e06e45498406db72d5b3da5bbc76', 'update tableName=REALM', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('3.4.2-KEYCLOAK-5172', 'mkanis@redhat.com', 'META-INF/jpa-changelog-3.4.2.xml', '2022-03-31 10:47:23.56072', 54, 'EXECUTED', '8:33560e7c7989250c40da3abdabdc75a4', 'update tableName=CLIENT', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('4.0.0-KEYCLOAK-6335', 'bburke@redhat.com', 'META-INF/jpa-changelog-4.0.0.xml', '2022-03-31 10:47:23.56679', 55, 'EXECUTED', '8:87a8d8542046817a9107c7eb9cbad1cd', 'createTable tableName=CLIENT_AUTH_FLOW_BINDINGS; addPrimaryKey constraintName=C_CLI_FLOW_BIND, tableName=CLIENT_AUTH_FLOW_BINDINGS', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('4.0.0-CLEANUP-UNUSED-TABLE', 'bburke@redhat.com', 'META-INF/jpa-changelog-4.0.0.xml', '2022-03-31 10:47:23.643996', 56, 'EXECUTED', '8:3ea08490a70215ed0088c273d776311e', 'dropTable tableName=CLIENT_IDENTITY_PROV_MAPPING', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('4.0.0-KEYCLOAK-6228', 'bburke@redhat.com', 'META-INF/jpa-changelog-4.0.0.xml', '2022-03-31 10:47:23.746357', 57, 'EXECUTED', '8:2d56697c8723d4592ab608ce14b6ed68', 'dropUniqueConstraint constraintName=UK_JKUWUVD56ONTGSUHOGM8UEWRT, tableName=USER_CONSENT; dropNotNullConstraint columnName=CLIENT_ID, tableName=USER_CONSENT; addColumn tableName=USER_CONSENT; addUniqueConstraint constraintName=UK_JKUWUVD56ONTGSUHO...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('4.0.0-KEYCLOAK-5579-fixed', 'mposolda@redhat.com', 'META-INF/jpa-changelog-4.0.0.xml', '2022-03-31 10:47:25.445713', 58, 'EXECUTED', '8:3e423e249f6068ea2bbe48bf907f9d86', 'dropForeignKeyConstraint baseTableName=CLIENT_TEMPLATE_ATTRIBUTES, constraintName=FK_CL_TEMPL_ATTR_TEMPL; renameTable newTableName=CLIENT_SCOPE_ATTRIBUTES, oldTableName=CLIENT_TEMPLATE_ATTRIBUTES; renameColumn newColumnName=SCOPE_ID, oldColumnName...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('authz-4.0.0.CR1', 'psilva@redhat.com', 'META-INF/jpa-changelog-authz-4.0.0.CR1.xml', '2022-03-31 10:47:25.847456', 59, 'EXECUTED', '8:15cabee5e5df0ff099510a0fc03e4103', 'createTable tableName=RESOURCE_SERVER_PERM_TICKET; addPrimaryKey constraintName=CONSTRAINT_FAPMT, tableName=RESOURCE_SERVER_PERM_TICKET; addForeignKeyConstraint baseTableName=RESOURCE_SERVER_PERM_TICKET, constraintName=FK_FRSRHO213XCX4WNKOG82SSPMT...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('authz-4.0.0.Beta3', 'psilva@redhat.com', 'META-INF/jpa-changelog-authz-4.0.0.Beta3.xml', '2022-03-31 10:47:25.942862', 60, 'EXECUTED', '8:4b80200af916ac54d2ffbfc47918ab0e', 'addColumn tableName=RESOURCE_SERVER_POLICY; addColumn tableName=RESOURCE_SERVER_PERM_TICKET; addForeignKeyConstraint baseTableName=RESOURCE_SERVER_PERM_TICKET, constraintName=FK_FRSRPO2128CX4WNKOG82SSRFY, referencedTableName=RESOURCE_SERVER_POLICY', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('authz-4.2.0.Final', 'mhajas@redhat.com', 'META-INF/jpa-changelog-authz-4.2.0.Final.xml', '2022-03-31 10:47:26.242813', 61, 'EXECUTED', '8:66564cd5e168045d52252c5027485bbb', 'createTable tableName=RESOURCE_URIS; addForeignKeyConstraint baseTableName=RESOURCE_URIS, constraintName=FK_RESOURCE_SERVER_URIS, referencedTableName=RESOURCE_SERVER_RESOURCE; customChange; dropColumn columnName=URI, tableName=RESOURCE_SERVER_RESO...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('authz-4.2.0.Final-KEYCLOAK-9944', 'hmlnarik@redhat.com', 'META-INF/jpa-changelog-authz-4.2.0.Final.xml', '2022-03-31 10:47:26.347738', 62, 'EXECUTED', '8:1c7064fafb030222be2bd16ccf690f6f', 'addPrimaryKey constraintName=CONSTRAINT_RESOUR_URIS_PK, tableName=RESOURCE_URIS', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('4.2.0-KEYCLOAK-6313', 'wadahiro@gmail.com', 'META-INF/jpa-changelog-4.2.0.xml', '2022-03-31 10:47:26.357075', 63, 'EXECUTED', '8:2de18a0dce10cdda5c7e65c9b719b6e5', 'addColumn tableName=REQUIRED_ACTION_PROVIDER', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('4.3.0-KEYCLOAK-7984', 'wadahiro@gmail.com', 'META-INF/jpa-changelog-4.3.0.xml', '2022-03-31 10:47:26.444907', 64, 'EXECUTED', '8:03e413dd182dcbd5c57e41c34d0ef682', 'update tableName=REQUIRED_ACTION_PROVIDER', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('4.6.0-KEYCLOAK-7950', 'psilva@redhat.com', 'META-INF/jpa-changelog-4.6.0.xml', '2022-03-31 10:47:26.451556', 65, 'EXECUTED', '8:d27b42bb2571c18fbe3fe4e4fb7582a7', 'update tableName=RESOURCE_SERVER_RESOURCE', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('4.6.0-KEYCLOAK-8377', 'keycloak', 'META-INF/jpa-changelog-4.6.0.xml', '2022-03-31 10:47:26.656732', 66, 'EXECUTED', '8:698baf84d9fd0027e9192717c2154fb8', 'createTable tableName=ROLE_ATTRIBUTE; addPrimaryKey constraintName=CONSTRAINT_ROLE_ATTRIBUTE_PK, tableName=ROLE_ATTRIBUTE; addForeignKeyConstraint baseTableName=ROLE_ATTRIBUTE, constraintName=FK_ROLE_ATTRIBUTE_ID, referencedTableName=KEYCLOAK_ROLE...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('4.6.0-KEYCLOAK-8555', 'gideonray@gmail.com', 'META-INF/jpa-changelog-4.6.0.xml', '2022-03-31 10:47:26.74786', 67, 'EXECUTED', '8:ced8822edf0f75ef26eb51582f9a821a', 'createIndex indexName=IDX_COMPONENT_PROVIDER_TYPE, tableName=COMPONENT', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('4.7.0-KEYCLOAK-1267', 'sguilhen@redhat.com', 'META-INF/jpa-changelog-4.7.0.xml', '2022-03-31 10:47:26.75291', 68, 'EXECUTED', '8:f0abba004cf429e8afc43056df06487d', 'addColumn tableName=REALM', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('4.7.0-KEYCLOAK-7275', 'keycloak', 'META-INF/jpa-changelog-4.7.0.xml', '2022-03-31 10:47:26.86157', 69, 'EXECUTED', '8:6662f8b0b611caa359fcf13bf63b4e24', 'renameColumn newColumnName=CREATED_ON, oldColumnName=LAST_SESSION_REFRESH, tableName=OFFLINE_USER_SESSION; addNotNullConstraint columnName=CREATED_ON, tableName=OFFLINE_USER_SESSION; addColumn tableName=OFFLINE_USER_SESSION; customChange; createIn...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('4.8.0-KEYCLOAK-8835', 'sguilhen@redhat.com', 'META-INF/jpa-changelog-4.8.0.xml', '2022-03-31 10:47:26.946569', 70, 'EXECUTED', '8:9e6b8009560f684250bdbdf97670d39e', 'addNotNullConstraint columnName=SSO_MAX_LIFESPAN_REMEMBER_ME, tableName=REALM; addNotNullConstraint columnName=SSO_IDLE_TIMEOUT_REMEMBER_ME, tableName=REALM', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('authz-7.0.0-KEYCLOAK-10443', 'psilva@redhat.com', 'META-INF/jpa-changelog-authz-7.0.0.xml', '2022-03-31 10:47:27.047226', 71, 'EXECUTED', '8:4223f561f3b8dc655846562b57bb502e', 'addColumn tableName=RESOURCE_SERVER', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('8.0.0-adding-credential-columns', 'keycloak', 'META-INF/jpa-changelog-8.0.0.xml', '2022-03-31 10:47:27.054401', 72, 'EXECUTED', '8:215a31c398b363ce383a2b301202f29e', 'addColumn tableName=CREDENTIAL; addColumn tableName=FED_USER_CREDENTIAL', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('8.0.0-updating-credential-data-not-oracle-fixed', 'keycloak', 'META-INF/jpa-changelog-8.0.0.xml', '2022-03-31 10:47:27.062965', 73, 'EXECUTED', '8:83f7a671792ca98b3cbd3a1a34862d3d', 'update tableName=CREDENTIAL; update tableName=CREDENTIAL; update tableName=CREDENTIAL; update tableName=FED_USER_CREDENTIAL; update tableName=FED_USER_CREDENTIAL; update tableName=FED_USER_CREDENTIAL', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('8.0.0-updating-credential-data-oracle-fixed', 'keycloak', 'META-INF/jpa-changelog-8.0.0.xml', '2022-03-31 10:47:27.065494', 74, 'MARK_RAN', '8:f58ad148698cf30707a6efbdf8061aa7', 'update tableName=CREDENTIAL; update tableName=CREDENTIAL; update tableName=CREDENTIAL; update tableName=FED_USER_CREDENTIAL; update tableName=FED_USER_CREDENTIAL; update tableName=FED_USER_CREDENTIAL', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('8.0.0-credential-cleanup-fixed', 'keycloak', 'META-INF/jpa-changelog-8.0.0.xml', '2022-03-31 10:47:27.247058', 75, 'EXECUTED', '8:79e4fd6c6442980e58d52ffc3ee7b19c', 'dropDefaultValue columnName=COUNTER, tableName=CREDENTIAL; dropDefaultValue columnName=DIGITS, tableName=CREDENTIAL; dropDefaultValue columnName=PERIOD, tableName=CREDENTIAL; dropDefaultValue columnName=ALGORITHM, tableName=CREDENTIAL; dropColumn ...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('8.0.0-resource-tag-support', 'keycloak', 'META-INF/jpa-changelog-8.0.0.xml', '2022-03-31 10:47:27.263713', 76, 'EXECUTED', '8:87af6a1e6d241ca4b15801d1f86a297d', 'addColumn tableName=MIGRATION_MODEL; createIndex indexName=IDX_UPDATE_TIME, tableName=MIGRATION_MODEL', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('9.0.0-always-display-client', 'keycloak', 'META-INF/jpa-changelog-9.0.0.xml', '2022-03-31 10:47:27.266743', 77, 'EXECUTED', '8:b44f8d9b7b6ea455305a6d72a200ed15', 'addColumn tableName=CLIENT', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('9.0.0-drop-constraints-for-column-increase', 'keycloak', 'META-INF/jpa-changelog-9.0.0.xml', '2022-03-31 10:47:27.268487', 78, 'MARK_RAN', '8:2d8ed5aaaeffd0cb004c046b4a903ac5', 'dropUniqueConstraint constraintName=UK_FRSR6T700S9V50BU18WS5PMT, tableName=RESOURCE_SERVER_PERM_TICKET; dropUniqueConstraint constraintName=UK_FRSR6T700S9V50BU18WS5HA6, tableName=RESOURCE_SERVER_RESOURCE; dropPrimaryKey constraintName=CONSTRAINT_O...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('9.0.0-increase-column-size-federated-fk', 'keycloak', 'META-INF/jpa-changelog-9.0.0.xml', '2022-03-31 10:47:27.353887', 79, 'EXECUTED', '8:e290c01fcbc275326c511633f6e2acde', 'modifyDataType columnName=CLIENT_ID, tableName=FED_USER_CONSENT; modifyDataType columnName=CLIENT_REALM_CONSTRAINT, tableName=KEYCLOAK_ROLE; modifyDataType columnName=OWNER, tableName=RESOURCE_SERVER_POLICY; modifyDataType columnName=CLIENT_ID, ta...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('9.0.0-recreate-constraints-after-column-increase', 'keycloak', 'META-INF/jpa-changelog-9.0.0.xml', '2022-03-31 10:47:27.355606', 80, 'MARK_RAN', '8:c9db8784c33cea210872ac2d805439f8', 'addNotNullConstraint columnName=CLIENT_ID, tableName=OFFLINE_CLIENT_SESSION; addNotNullConstraint columnName=OWNER, tableName=RESOURCE_SERVER_PERM_TICKET; addNotNullConstraint columnName=REQUESTER, tableName=RESOURCE_SERVER_PERM_TICKET; addNotNull...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('9.0.1-add-index-to-client.client_id', 'keycloak', 'META-INF/jpa-changelog-9.0.1.xml', '2022-03-31 10:47:27.452688', 81, 'EXECUTED', '8:95b676ce8fc546a1fcfb4c92fae4add5', 'createIndex indexName=IDX_CLIENT_ID, tableName=CLIENT', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('9.0.1-KEYCLOAK-12579-drop-constraints', 'keycloak', 'META-INF/jpa-changelog-9.0.1.xml', '2022-03-31 10:47:27.454472', 82, 'MARK_RAN', '8:38a6b2a41f5651018b1aca93a41401e5', 'dropUniqueConstraint constraintName=SIBLING_NAMES, tableName=KEYCLOAK_GROUP', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('9.0.1-KEYCLOAK-12579-add-not-null-constraint', 'keycloak', 'META-INF/jpa-changelog-9.0.1.xml', '2022-03-31 10:47:27.458828', 83, 'EXECUTED', '8:3fb99bcad86a0229783123ac52f7609c', 'addNotNullConstraint columnName=PARENT_GROUP, tableName=KEYCLOAK_GROUP', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('9.0.1-KEYCLOAK-12579-recreate-constraints', 'keycloak', 'META-INF/jpa-changelog-9.0.1.xml', '2022-03-31 10:47:27.460831', 84, 'MARK_RAN', '8:64f27a6fdcad57f6f9153210f2ec1bdb', 'addUniqueConstraint constraintName=SIBLING_NAMES, tableName=KEYCLOAK_GROUP', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('9.0.1-add-index-to-events', 'keycloak', 'META-INF/jpa-changelog-9.0.1.xml', '2022-03-31 10:47:27.547078', 85, 'EXECUTED', '8:ab4f863f39adafd4c862f7ec01890abc', 'createIndex indexName=IDX_EVENT_TIME, tableName=EVENT_ENTITY', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('map-remove-ri', 'keycloak', 'META-INF/jpa-changelog-11.0.0.xml', '2022-03-31 10:47:27.552173', 86, 'EXECUTED', '8:13c419a0eb336e91ee3a3bf8fda6e2a7', 'dropForeignKeyConstraint baseTableName=REALM, constraintName=FK_TRAF444KK6QRKMS7N56AIWQ5Y; dropForeignKeyConstraint baseTableName=KEYCLOAK_ROLE, constraintName=FK_KJHO5LE2C0RAL09FL8CM9WFW9', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('map-remove-ri', 'keycloak', 'META-INF/jpa-changelog-12.0.0.xml', '2022-03-31 10:47:27.563192', 87, 'EXECUTED', '8:e3fb1e698e0471487f51af1ed80fe3ac', 'dropForeignKeyConstraint baseTableName=REALM_DEFAULT_GROUPS, constraintName=FK_DEF_GROUPS_GROUP; dropForeignKeyConstraint baseTableName=REALM_DEFAULT_ROLES, constraintName=FK_H4WPD7W4HSOOLNI3H0SW7BTJE; dropForeignKeyConstraint baseTableName=CLIENT...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('12.1.0-add-realm-localization-table', 'keycloak', 'META-INF/jpa-changelog-12.0.0.xml', '2022-03-31 10:47:27.646947', 88, 'EXECUTED', '8:babadb686aab7b56562817e60bf0abd0', 'createTable tableName=REALM_LOCALIZATIONS; addPrimaryKey tableName=REALM_LOCALIZATIONS', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('default-roles', 'keycloak', 'META-INF/jpa-changelog-13.0.0.xml', '2022-03-31 10:47:27.652528', 89, 'EXECUTED', '8:72d03345fda8e2f17093d08801947773', 'addColumn tableName=REALM; customChange', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('default-roles-cleanup', 'keycloak', 'META-INF/jpa-changelog-13.0.0.xml', '2022-03-31 10:47:27.742917', 90, 'EXECUTED', '8:61c9233951bd96ffecd9ba75f7d978a4', 'dropTable tableName=REALM_DEFAULT_ROLES; dropTable tableName=CLIENT_DEFAULT_ROLES', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('13.0.0-KEYCLOAK-16844', 'keycloak', 'META-INF/jpa-changelog-13.0.0.xml', '2022-03-31 10:47:27.757448', 91, 'EXECUTED', '8:ea82e6ad945cec250af6372767b25525', 'createIndex indexName=IDX_OFFLINE_USS_PRELOAD, tableName=OFFLINE_USER_SESSION', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('map-remove-ri-13.0.0', 'keycloak', 'META-INF/jpa-changelog-13.0.0.xml', '2022-03-31 10:47:27.767164', 92, 'EXECUTED', '8:d3f4a33f41d960ddacd7e2ef30d126b3', 'dropForeignKeyConstraint baseTableName=DEFAULT_CLIENT_SCOPE, constraintName=FK_R_DEF_CLI_SCOPE_SCOPE; dropForeignKeyConstraint baseTableName=CLIENT_SCOPE_CLIENT, constraintName=FK_C_CLI_SCOPE_SCOPE; dropForeignKeyConstraint baseTableName=CLIENT_SC...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('13.0.0-KEYCLOAK-17992-drop-constraints', 'keycloak', 'META-INF/jpa-changelog-13.0.0.xml', '2022-03-31 10:47:27.768966', 93, 'MARK_RAN', '8:1284a27fbd049d65831cb6fc07c8a783', 'dropPrimaryKey constraintName=C_CLI_SCOPE_BIND, tableName=CLIENT_SCOPE_CLIENT; dropIndex indexName=IDX_CLSCOPE_CL, tableName=CLIENT_SCOPE_CLIENT; dropIndex indexName=IDX_CL_CLSCOPE, tableName=CLIENT_SCOPE_CLIENT', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('13.0.0-increase-column-size-federated', 'keycloak', 'META-INF/jpa-changelog-13.0.0.xml', '2022-03-31 10:47:27.850532', 94, 'EXECUTED', '8:9d11b619db2ae27c25853b8a37cd0dea', 'modifyDataType columnName=CLIENT_ID, tableName=CLIENT_SCOPE_CLIENT; modifyDataType columnName=SCOPE_ID, tableName=CLIENT_SCOPE_CLIENT', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('13.0.0-KEYCLOAK-17992-recreate-constraints', 'keycloak', 'META-INF/jpa-changelog-13.0.0.xml', '2022-03-31 10:47:27.852561', 95, 'MARK_RAN', '8:3002bb3997451bb9e8bac5c5cd8d6327', 'addNotNullConstraint columnName=CLIENT_ID, tableName=CLIENT_SCOPE_CLIENT; addNotNullConstraint columnName=SCOPE_ID, tableName=CLIENT_SCOPE_CLIENT; addPrimaryKey constraintName=C_CLI_SCOPE_BIND, tableName=CLIENT_SCOPE_CLIENT; createIndex indexName=...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('json-string-accomodation-fixed', 'keycloak', 'META-INF/jpa-changelog-13.0.0.xml', '2022-03-31 10:47:27.858589', 96, 'EXECUTED', '8:dfbee0d6237a23ef4ccbb7a4e063c163', 'addColumn tableName=REALM_ATTRIBUTE; update tableName=REALM_ATTRIBUTE; dropColumn columnName=VALUE, tableName=REALM_ATTRIBUTE; renameColumn newColumnName=VALUE, oldColumnName=VALUE_NEW, tableName=REALM_ATTRIBUTE', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('14.0.0-KEYCLOAK-11019', 'keycloak', 'META-INF/jpa-changelog-14.0.0.xml', '2022-03-31 10:47:28.346631', 97, 'EXECUTED', '8:75f3e372df18d38c62734eebb986b960', 'createIndex indexName=IDX_OFFLINE_CSS_PRELOAD, tableName=OFFLINE_CLIENT_SESSION; createIndex indexName=IDX_OFFLINE_USS_BY_USER, tableName=OFFLINE_USER_SESSION; createIndex indexName=IDX_OFFLINE_USS_BY_USERSESS, tableName=OFFLINE_USER_SESSION', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('14.0.0-KEYCLOAK-18286', 'keycloak', 'META-INF/jpa-changelog-14.0.0.xml', '2022-03-31 10:47:28.348267', 98, 'MARK_RAN', '8:7fee73eddf84a6035691512c85637eef', 'createIndex indexName=IDX_CLIENT_ATT_BY_NAME_VALUE, tableName=CLIENT_ATTRIBUTES', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('14.0.0-KEYCLOAK-18286-revert', 'keycloak', 'META-INF/jpa-changelog-14.0.0.xml', '2022-03-31 10:47:28.445759', 99, 'MARK_RAN', '8:7a11134ab12820f999fbf3bb13c3adc8', 'dropIndex indexName=IDX_CLIENT_ATT_BY_NAME_VALUE, tableName=CLIENT_ATTRIBUTES', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('14.0.0-KEYCLOAK-18286-supported-dbs', 'keycloak', 'META-INF/jpa-changelog-14.0.0.xml', '2022-03-31 10:47:28.464765', 100, 'EXECUTED', '8:c0f6eaac1f3be773ffe54cb5b8482b70', 'createIndex indexName=IDX_CLIENT_ATT_BY_NAME_VALUE, tableName=CLIENT_ATTRIBUTES', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('14.0.0-KEYCLOAK-18286-unsupported-dbs', 'keycloak', 'META-INF/jpa-changelog-14.0.0.xml', '2022-03-31 10:47:28.466875', 101, 'MARK_RAN', '8:18186f0008b86e0f0f49b0c4d0e842ac', 'createIndex indexName=IDX_CLIENT_ATT_BY_NAME_VALUE, tableName=CLIENT_ATTRIBUTES', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('KEYCLOAK-17267-add-index-to-user-attributes', 'keycloak', 'META-INF/jpa-changelog-14.0.0.xml', '2022-03-31 10:47:28.569158', 102, 'EXECUTED', '8:09c2780bcb23b310a7019d217dc7b433', 'createIndex indexName=IDX_USER_ATTRIBUTE_NAME, tableName=USER_ATTRIBUTE', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('KEYCLOAK-18146-add-saml-art-binding-identifier', 'keycloak', 'META-INF/jpa-changelog-14.0.0.xml', '2022-03-31 10:47:28.646996', 103, 'EXECUTED', '8:276a44955eab693c970a42880197fff2', 'customChange', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('15.0.0-KEYCLOAK-18467', 'keycloak', 'META-INF/jpa-changelog-15.0.0.xml', '2022-03-31 10:47:28.653245', 104, 'EXECUTED', '8:ba8ee3b694d043f2bfc1a1079d0760d7', 'addColumn tableName=REALM_LOCALIZATIONS; update tableName=REALM_LOCALIZATIONS; dropColumn columnName=TEXTS, tableName=REALM_LOCALIZATIONS; renameColumn newColumnName=TEXTS, oldColumnName=TEXTS_NEW, tableName=REALM_LOCALIZATIONS; addNotNullConstrai...', '', NULL, '4.8.0', NULL, NULL, '8723626954');
INSERT INTO public.databasechangelog VALUES ('17.0.0-9562', 'keycloak', 'META-INF/jpa-changelog-17.0.0.xml', '2022-03-31 10:47:28.668155', 105, 'EXECUTED', '8:5e06b1d75f5d17685485e610c2851b17', 'createIndex indexName=IDX_USER_SERVICE_ACCOUNT, tableName=USER_ENTITY', '', NULL, '4.8.0', NULL, NULL, '8723626954');


--
-- TOC entry 3763 (class 0 OID 39982)
-- Dependencies: 202
-- Data for Name: databasechangeloglock; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.databasechangeloglock VALUES (1, false, NULL, NULL);
INSERT INTO public.databasechangeloglock VALUES (1000, false, NULL, NULL);
INSERT INTO public.databasechangeloglock VALUES (1001, false, NULL, NULL);


--
-- TOC entry 3847 (class 0 OID 41434)
-- Dependencies: 286
-- Data for Name: default_client_scope; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.default_client_scope VALUES ('master', 'c38ffa9e-7ffe-4bfc-91bf-a0ed0a5fcb40', false);
INSERT INTO public.default_client_scope VALUES ('master', '06199523-a820-4b2a-8641-ea225c29c921', true);
INSERT INTO public.default_client_scope VALUES ('master', '7f2a24ac-6d77-4068-a597-60c7706842ae', true);
INSERT INTO public.default_client_scope VALUES ('master', '60a4f821-7c71-47fe-a352-e6e24fde59bb', true);
INSERT INTO public.default_client_scope VALUES ('master', 'f569e5f0-d55f-4eec-851b-11645065b918', false);
INSERT INTO public.default_client_scope VALUES ('master', 'b4c3b2b2-c503-43d7-9b6f-960a94fe54d8', false);
INSERT INTO public.default_client_scope VALUES ('master', 'a47cfa61-711f-4f71-81a6-7631c5ed9e18', true);
INSERT INTO public.default_client_scope VALUES ('master', '34371776-65b2-4a47-a6ad-3f54635ffb36', true);
INSERT INTO public.default_client_scope VALUES ('master', '051c53b2-4c0f-4999-82d5-d4be5cbbf2d1', false);


--
-- TOC entry 3770 (class 0 OID 40026)
-- Dependencies: 209
-- Data for Name: event_entity; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3835 (class 0 OID 41123)
-- Dependencies: 274
-- Data for Name: fed_user_attribute; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3836 (class 0 OID 41129)
-- Dependencies: 275
-- Data for Name: fed_user_consent; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3849 (class 0 OID 41460)
-- Dependencies: 288
-- Data for Name: fed_user_consent_cl_scope; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3837 (class 0 OID 41138)
-- Dependencies: 276
-- Data for Name: fed_user_credential; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3838 (class 0 OID 41148)
-- Dependencies: 277
-- Data for Name: fed_user_group_membership; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3839 (class 0 OID 41151)
-- Dependencies: 278
-- Data for Name: fed_user_required_action; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3840 (class 0 OID 41158)
-- Dependencies: 279
-- Data for Name: fed_user_role_mapping; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3793 (class 0 OID 40420)
-- Dependencies: 232
-- Data for Name: federated_identity; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3843 (class 0 OID 41227)
-- Dependencies: 282
-- Data for Name: federated_user; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3819 (class 0 OID 40839)
-- Dependencies: 258
-- Data for Name: group_attribute; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3818 (class 0 OID 40836)
-- Dependencies: 257
-- Data for Name: group_role_mapping; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3794 (class 0 OID 40426)
-- Dependencies: 233
-- Data for Name: identity_provider; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3795 (class 0 OID 40436)
-- Dependencies: 234
-- Data for Name: identity_provider_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3800 (class 0 OID 40542)
-- Dependencies: 239
-- Data for Name: identity_provider_mapper; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3801 (class 0 OID 40548)
-- Dependencies: 240
-- Data for Name: idp_mapper_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3817 (class 0 OID 40833)
-- Dependencies: 256
-- Data for Name: keycloak_group; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3771 (class 0 OID 40035)
-- Dependencies: 210
-- Data for Name: keycloak_role; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.keycloak_role VALUES ('dbfd7da9-148f-4238-9c20-70b4b6db8b8f', 'master', false, '${role_default-roles}', 'default-roles-master', 'master', NULL, NULL);
INSERT INTO public.keycloak_role VALUES ('63360619-7883-41f8-b592-2b8fdc431180', 'master', false, '${role_admin}', 'admin', 'master', NULL, NULL);
INSERT INTO public.keycloak_role VALUES ('c8f24237-e6a9-440c-98c7-1fcff103014a', 'master', false, '${role_create-realm}', 'create-realm', 'master', NULL, NULL);
INSERT INTO public.keycloak_role VALUES ('1b81e720-8ca2-4042-bcec-c8d7cb523d59', '982f79bc-4b83-4983-abc4-f917708008ca', true, '${role_create-client}', 'create-client', 'master', '982f79bc-4b83-4983-abc4-f917708008ca', NULL);
INSERT INTO public.keycloak_role VALUES ('2e4ff29f-7b22-46b8-b23a-a80b26128e48', '982f79bc-4b83-4983-abc4-f917708008ca', true, '${role_view-realm}', 'view-realm', 'master', '982f79bc-4b83-4983-abc4-f917708008ca', NULL);
INSERT INTO public.keycloak_role VALUES ('f5050269-7ea4-468a-8f8f-6e47eba5bcef', '982f79bc-4b83-4983-abc4-f917708008ca', true, '${role_view-users}', 'view-users', 'master', '982f79bc-4b83-4983-abc4-f917708008ca', NULL);
INSERT INTO public.keycloak_role VALUES ('f498f8b4-8171-4f47-8239-017c31e7a99a', '982f79bc-4b83-4983-abc4-f917708008ca', true, '${role_view-clients}', 'view-clients', 'master', '982f79bc-4b83-4983-abc4-f917708008ca', NULL);
INSERT INTO public.keycloak_role VALUES ('86c5467f-bbdd-4a3a-8c9b-1b9b5c56f8f7', '982f79bc-4b83-4983-abc4-f917708008ca', true, '${role_view-events}', 'view-events', 'master', '982f79bc-4b83-4983-abc4-f917708008ca', NULL);
INSERT INTO public.keycloak_role VALUES ('2b963824-254d-4eaa-abdb-0f59560caf14', '982f79bc-4b83-4983-abc4-f917708008ca', true, '${role_view-identity-providers}', 'view-identity-providers', 'master', '982f79bc-4b83-4983-abc4-f917708008ca', NULL);
INSERT INTO public.keycloak_role VALUES ('0e96d281-63bb-4186-b87f-c3cc74e0c02f', '982f79bc-4b83-4983-abc4-f917708008ca', true, '${role_view-authorization}', 'view-authorization', 'master', '982f79bc-4b83-4983-abc4-f917708008ca', NULL);
INSERT INTO public.keycloak_role VALUES ('1a15278c-f18c-4b98-aee8-abeac072c43b', '982f79bc-4b83-4983-abc4-f917708008ca', true, '${role_manage-realm}', 'manage-realm', 'master', '982f79bc-4b83-4983-abc4-f917708008ca', NULL);
INSERT INTO public.keycloak_role VALUES ('9af21e36-a9c3-4a63-803c-3fe7ea636ed7', '982f79bc-4b83-4983-abc4-f917708008ca', true, '${role_manage-users}', 'manage-users', 'master', '982f79bc-4b83-4983-abc4-f917708008ca', NULL);
INSERT INTO public.keycloak_role VALUES ('584bd94c-0b83-4b95-8a4a-1eac53415ab1', '982f79bc-4b83-4983-abc4-f917708008ca', true, '${role_manage-clients}', 'manage-clients', 'master', '982f79bc-4b83-4983-abc4-f917708008ca', NULL);
INSERT INTO public.keycloak_role VALUES ('eb168aaa-4c79-49eb-894d-f2111eb54453', '982f79bc-4b83-4983-abc4-f917708008ca', true, '${role_manage-events}', 'manage-events', 'master', '982f79bc-4b83-4983-abc4-f917708008ca', NULL);
INSERT INTO public.keycloak_role VALUES ('cd9e4e06-e523-4882-9218-ce8227cec681', '982f79bc-4b83-4983-abc4-f917708008ca', true, '${role_manage-identity-providers}', 'manage-identity-providers', 'master', '982f79bc-4b83-4983-abc4-f917708008ca', NULL);
INSERT INTO public.keycloak_role VALUES ('327b973c-ed1a-4eaa-bc58-93d5295280a0', '982f79bc-4b83-4983-abc4-f917708008ca', true, '${role_manage-authorization}', 'manage-authorization', 'master', '982f79bc-4b83-4983-abc4-f917708008ca', NULL);
INSERT INTO public.keycloak_role VALUES ('06b6d07a-4432-4af5-9b4a-4d3c042e4eb2', '982f79bc-4b83-4983-abc4-f917708008ca', true, '${role_query-users}', 'query-users', 'master', '982f79bc-4b83-4983-abc4-f917708008ca', NULL);
INSERT INTO public.keycloak_role VALUES ('c6011a34-7fa4-4562-8ce4-18772a659c8b', '982f79bc-4b83-4983-abc4-f917708008ca', true, '${role_query-clients}', 'query-clients', 'master', '982f79bc-4b83-4983-abc4-f917708008ca', NULL);
INSERT INTO public.keycloak_role VALUES ('6ceacd69-dd9e-44a8-965b-df2d195bc19f', '982f79bc-4b83-4983-abc4-f917708008ca', true, '${role_query-realms}', 'query-realms', 'master', '982f79bc-4b83-4983-abc4-f917708008ca', NULL);
INSERT INTO public.keycloak_role VALUES ('a31140dc-9c2f-43e5-9c90-d92b4c8f797b', '982f79bc-4b83-4983-abc4-f917708008ca', true, '${role_query-groups}', 'query-groups', 'master', '982f79bc-4b83-4983-abc4-f917708008ca', NULL);
INSERT INTO public.keycloak_role VALUES ('1340b277-65bf-47b1-9697-9bc99ffe6d56', '0350c73b-e4db-4555-bf1d-bbf41a81315a', true, '${role_view-profile}', 'view-profile', 'master', '0350c73b-e4db-4555-bf1d-bbf41a81315a', NULL);
INSERT INTO public.keycloak_role VALUES ('6db6c2db-1a56-4164-bc6e-d2124baceeac', '0350c73b-e4db-4555-bf1d-bbf41a81315a', true, '${role_manage-account}', 'manage-account', 'master', '0350c73b-e4db-4555-bf1d-bbf41a81315a', NULL);
INSERT INTO public.keycloak_role VALUES ('b81c3922-3fb9-4f46-b8e6-832c798b5ea4', '0350c73b-e4db-4555-bf1d-bbf41a81315a', true, '${role_manage-account-links}', 'manage-account-links', 'master', '0350c73b-e4db-4555-bf1d-bbf41a81315a', NULL);
INSERT INTO public.keycloak_role VALUES ('da8dddac-c4fd-4db7-ac42-2e6c3d3d3f59', '0350c73b-e4db-4555-bf1d-bbf41a81315a', true, '${role_view-applications}', 'view-applications', 'master', '0350c73b-e4db-4555-bf1d-bbf41a81315a', NULL);
INSERT INTO public.keycloak_role VALUES ('d672adcd-22e5-4ca4-8d59-78769ab8da88', '0350c73b-e4db-4555-bf1d-bbf41a81315a', true, '${role_view-consent}', 'view-consent', 'master', '0350c73b-e4db-4555-bf1d-bbf41a81315a', NULL);
INSERT INTO public.keycloak_role VALUES ('7ecdb134-f1a1-4b8b-8f19-e0b241b3cb0b', '0350c73b-e4db-4555-bf1d-bbf41a81315a', true, '${role_manage-consent}', 'manage-consent', 'master', '0350c73b-e4db-4555-bf1d-bbf41a81315a', NULL);
INSERT INTO public.keycloak_role VALUES ('bfbb0a6e-4a42-4cd3-9cf5-6e1f32dce321', '0350c73b-e4db-4555-bf1d-bbf41a81315a', true, '${role_delete-account}', 'delete-account', 'master', '0350c73b-e4db-4555-bf1d-bbf41a81315a', NULL);
INSERT INTO public.keycloak_role VALUES ('d94f58a0-d55a-4f71-8857-0d51d9ad75b9', '234fc62f-0d9e-47f1-8ccd-905e33de62e3', true, '${role_read-token}', 'read-token', 'master', '234fc62f-0d9e-47f1-8ccd-905e33de62e3', NULL);
INSERT INTO public.keycloak_role VALUES ('688b927f-a73e-4524-a0b4-cc784141c5f0', '982f79bc-4b83-4983-abc4-f917708008ca', true, '${role_impersonation}', 'impersonation', 'master', '982f79bc-4b83-4983-abc4-f917708008ca', NULL);
INSERT INTO public.keycloak_role VALUES ('c03de996-5957-4060-a4a4-b4d21aadf9b8', 'master', false, '${role_offline-access}', 'offline_access', 'master', NULL, NULL);
INSERT INTO public.keycloak_role VALUES ('6c1807d3-8d72-4750-8757-5d2323a1879b', 'master', false, '${role_uma_authorization}', 'uma_authorization', 'master', NULL, NULL);


--
-- TOC entry 3799 (class 0 OID 40539)
-- Dependencies: 238
-- Data for Name: migration_model; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.migration_model VALUES ('58srw', '14.0.0', 1648732712);


--
-- TOC entry 3816 (class 0 OID 40823)
-- Dependencies: 255
-- Data for Name: offline_client_session; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3815 (class 0 OID 40817)
-- Dependencies: 254
-- Data for Name: offline_user_session; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3829 (class 0 OID 41044)
-- Dependencies: 268
-- Data for Name: policy_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3791 (class 0 OID 40407)
-- Dependencies: 230
-- Data for Name: protocol_mapper; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.protocol_mapper VALUES ('99fd7f12-301b-4d99-8692-45a2f207fc77', 'audience resolve', 'openid-connect', 'oidc-audience-resolve-mapper', 'f0861274-7936-4ee0-b4ef-087776e07f97', NULL);
INSERT INTO public.protocol_mapper VALUES ('dde3b619-be13-4457-bbf5-c29393599eaa', 'locale', 'openid-connect', 'oidc-usermodel-attribute-mapper', '551599da-86f9-447a-aa70-b3169d239cc8', NULL);
INSERT INTO public.protocol_mapper VALUES ('f744aff3-24b8-493d-82b8-e43128d769a6', 'role list', 'saml', 'saml-role-list-mapper', NULL, '06199523-a820-4b2a-8641-ea225c29c921');
INSERT INTO public.protocol_mapper VALUES ('3febd871-91e6-414b-a1cd-f85170936049', 'full name', 'openid-connect', 'oidc-full-name-mapper', NULL, '7f2a24ac-6d77-4068-a597-60c7706842ae');
INSERT INTO public.protocol_mapper VALUES ('2dc350b0-5818-4c83-9e77-523896846a98', 'family name', 'openid-connect', 'oidc-usermodel-property-mapper', NULL, '7f2a24ac-6d77-4068-a597-60c7706842ae');
INSERT INTO public.protocol_mapper VALUES ('8ddd55cf-79e2-4057-a84f-dba59d13ad23', 'given name', 'openid-connect', 'oidc-usermodel-property-mapper', NULL, '7f2a24ac-6d77-4068-a597-60c7706842ae');
INSERT INTO public.protocol_mapper VALUES ('1ccd0adc-3134-4ff6-af8d-61c22c60a224', 'middle name', 'openid-connect', 'oidc-usermodel-attribute-mapper', NULL, '7f2a24ac-6d77-4068-a597-60c7706842ae');
INSERT INTO public.protocol_mapper VALUES ('0b8dec42-52f1-4bce-821a-085b18ab1582', 'nickname', 'openid-connect', 'oidc-usermodel-attribute-mapper', NULL, '7f2a24ac-6d77-4068-a597-60c7706842ae');
INSERT INTO public.protocol_mapper VALUES ('1252b535-6bc6-4194-ace2-33f7c7535674', 'username', 'openid-connect', 'oidc-usermodel-property-mapper', NULL, '7f2a24ac-6d77-4068-a597-60c7706842ae');
INSERT INTO public.protocol_mapper VALUES ('b3723576-7a13-4f53-bec6-de909afaf915', 'profile', 'openid-connect', 'oidc-usermodel-attribute-mapper', NULL, '7f2a24ac-6d77-4068-a597-60c7706842ae');
INSERT INTO public.protocol_mapper VALUES ('8bab2590-2a62-4ac5-aa32-76dc1c08dbad', 'picture', 'openid-connect', 'oidc-usermodel-attribute-mapper', NULL, '7f2a24ac-6d77-4068-a597-60c7706842ae');
INSERT INTO public.protocol_mapper VALUES ('92216c48-3bf6-4bce-8878-38e2b78a5110', 'website', 'openid-connect', 'oidc-usermodel-attribute-mapper', NULL, '7f2a24ac-6d77-4068-a597-60c7706842ae');
INSERT INTO public.protocol_mapper VALUES ('c0644e04-1db4-4ce0-b474-6751e81bd556', 'gender', 'openid-connect', 'oidc-usermodel-attribute-mapper', NULL, '7f2a24ac-6d77-4068-a597-60c7706842ae');
INSERT INTO public.protocol_mapper VALUES ('57d48f4c-d335-4582-9704-9d19fd99feea', 'birthdate', 'openid-connect', 'oidc-usermodel-attribute-mapper', NULL, '7f2a24ac-6d77-4068-a597-60c7706842ae');
INSERT INTO public.protocol_mapper VALUES ('fdaa34c3-f3ee-45de-9b01-32cee0aaea68', 'zoneinfo', 'openid-connect', 'oidc-usermodel-attribute-mapper', NULL, '7f2a24ac-6d77-4068-a597-60c7706842ae');
INSERT INTO public.protocol_mapper VALUES ('eda95f51-58f5-4608-96cb-d18e2d6a0161', 'locale', 'openid-connect', 'oidc-usermodel-attribute-mapper', NULL, '7f2a24ac-6d77-4068-a597-60c7706842ae');
INSERT INTO public.protocol_mapper VALUES ('22fcc0aa-8066-466d-b200-ecd4d5dc426a', 'updated at', 'openid-connect', 'oidc-usermodel-attribute-mapper', NULL, '7f2a24ac-6d77-4068-a597-60c7706842ae');
INSERT INTO public.protocol_mapper VALUES ('92a1229f-c13e-4ac3-be8e-e5210f03f4f3', 'email', 'openid-connect', 'oidc-usermodel-property-mapper', NULL, '60a4f821-7c71-47fe-a352-e6e24fde59bb');
INSERT INTO public.protocol_mapper VALUES ('43627225-1ae1-4fd1-bc41-57cace87a6a8', 'email verified', 'openid-connect', 'oidc-usermodel-property-mapper', NULL, '60a4f821-7c71-47fe-a352-e6e24fde59bb');
INSERT INTO public.protocol_mapper VALUES ('eef56bf8-a105-4398-9f4c-0c213fa1ef4c', 'address', 'openid-connect', 'oidc-address-mapper', NULL, 'f569e5f0-d55f-4eec-851b-11645065b918');
INSERT INTO public.protocol_mapper VALUES ('143d09a3-f3eb-4dd0-9beb-9ecd10760f69', 'phone number', 'openid-connect', 'oidc-usermodel-attribute-mapper', NULL, 'b4c3b2b2-c503-43d7-9b6f-960a94fe54d8');
INSERT INTO public.protocol_mapper VALUES ('772dd8ab-fc0f-40d0-b8e6-2c142111c618', 'phone number verified', 'openid-connect', 'oidc-usermodel-attribute-mapper', NULL, 'b4c3b2b2-c503-43d7-9b6f-960a94fe54d8');
INSERT INTO public.protocol_mapper VALUES ('8d8c5c77-5008-4049-a307-f82cd2f83373', 'realm roles', 'openid-connect', 'oidc-usermodel-realm-role-mapper', NULL, 'a47cfa61-711f-4f71-81a6-7631c5ed9e18');
INSERT INTO public.protocol_mapper VALUES ('8ab9aeb3-c987-48a2-8820-4dcdd1a37766', 'client roles', 'openid-connect', 'oidc-usermodel-client-role-mapper', NULL, 'a47cfa61-711f-4f71-81a6-7631c5ed9e18');
INSERT INTO public.protocol_mapper VALUES ('e8e6718f-b656-49e2-adeb-3e1ecb723335', 'audience resolve', 'openid-connect', 'oidc-audience-resolve-mapper', NULL, 'a47cfa61-711f-4f71-81a6-7631c5ed9e18');
INSERT INTO public.protocol_mapper VALUES ('5dfc36d1-e4e1-462c-902e-82e43345bacf', 'allowed web origins', 'openid-connect', 'oidc-allowed-origins-mapper', NULL, '34371776-65b2-4a47-a6ad-3f54635ffb36');
INSERT INTO public.protocol_mapper VALUES ('0c2d6404-53d9-4d57-bbb7-a9edb4c6202f', 'upn', 'openid-connect', 'oidc-usermodel-property-mapper', NULL, '051c53b2-4c0f-4999-82d5-d4be5cbbf2d1');
INSERT INTO public.protocol_mapper VALUES ('ab5d5eac-7848-47b3-8728-c15559c64a5e', 'groups', 'openid-connect', 'oidc-usermodel-realm-role-mapper', NULL, '051c53b2-4c0f-4999-82d5-d4be5cbbf2d1');


--
-- TOC entry 3792 (class 0 OID 40414)
-- Dependencies: 231
-- Data for Name: protocol_mapper_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.protocol_mapper_config VALUES ('dde3b619-be13-4457-bbf5-c29393599eaa', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('dde3b619-be13-4457-bbf5-c29393599eaa', 'locale', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('dde3b619-be13-4457-bbf5-c29393599eaa', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('dde3b619-be13-4457-bbf5-c29393599eaa', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('dde3b619-be13-4457-bbf5-c29393599eaa', 'locale', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('dde3b619-be13-4457-bbf5-c29393599eaa', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('f744aff3-24b8-493d-82b8-e43128d769a6', 'false', 'single');
INSERT INTO public.protocol_mapper_config VALUES ('f744aff3-24b8-493d-82b8-e43128d769a6', 'Basic', 'attribute.nameformat');
INSERT INTO public.protocol_mapper_config VALUES ('f744aff3-24b8-493d-82b8-e43128d769a6', 'Role', 'attribute.name');
INSERT INTO public.protocol_mapper_config VALUES ('3febd871-91e6-414b-a1cd-f85170936049', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('3febd871-91e6-414b-a1cd-f85170936049', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('3febd871-91e6-414b-a1cd-f85170936049', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('2dc350b0-5818-4c83-9e77-523896846a98', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('2dc350b0-5818-4c83-9e77-523896846a98', 'lastName', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('2dc350b0-5818-4c83-9e77-523896846a98', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('2dc350b0-5818-4c83-9e77-523896846a98', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('2dc350b0-5818-4c83-9e77-523896846a98', 'family_name', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('2dc350b0-5818-4c83-9e77-523896846a98', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('8ddd55cf-79e2-4057-a84f-dba59d13ad23', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('8ddd55cf-79e2-4057-a84f-dba59d13ad23', 'firstName', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('8ddd55cf-79e2-4057-a84f-dba59d13ad23', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('8ddd55cf-79e2-4057-a84f-dba59d13ad23', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('8ddd55cf-79e2-4057-a84f-dba59d13ad23', 'given_name', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('8ddd55cf-79e2-4057-a84f-dba59d13ad23', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('1ccd0adc-3134-4ff6-af8d-61c22c60a224', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('1ccd0adc-3134-4ff6-af8d-61c22c60a224', 'middleName', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('1ccd0adc-3134-4ff6-af8d-61c22c60a224', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('1ccd0adc-3134-4ff6-af8d-61c22c60a224', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('1ccd0adc-3134-4ff6-af8d-61c22c60a224', 'middle_name', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('1ccd0adc-3134-4ff6-af8d-61c22c60a224', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('0b8dec42-52f1-4bce-821a-085b18ab1582', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('0b8dec42-52f1-4bce-821a-085b18ab1582', 'nickname', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('0b8dec42-52f1-4bce-821a-085b18ab1582', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('0b8dec42-52f1-4bce-821a-085b18ab1582', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('0b8dec42-52f1-4bce-821a-085b18ab1582', 'nickname', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('0b8dec42-52f1-4bce-821a-085b18ab1582', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('1252b535-6bc6-4194-ace2-33f7c7535674', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('1252b535-6bc6-4194-ace2-33f7c7535674', 'username', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('1252b535-6bc6-4194-ace2-33f7c7535674', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('1252b535-6bc6-4194-ace2-33f7c7535674', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('1252b535-6bc6-4194-ace2-33f7c7535674', 'preferred_username', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('1252b535-6bc6-4194-ace2-33f7c7535674', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('b3723576-7a13-4f53-bec6-de909afaf915', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('b3723576-7a13-4f53-bec6-de909afaf915', 'profile', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('b3723576-7a13-4f53-bec6-de909afaf915', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('b3723576-7a13-4f53-bec6-de909afaf915', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('b3723576-7a13-4f53-bec6-de909afaf915', 'profile', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('b3723576-7a13-4f53-bec6-de909afaf915', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('8bab2590-2a62-4ac5-aa32-76dc1c08dbad', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('8bab2590-2a62-4ac5-aa32-76dc1c08dbad', 'picture', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('8bab2590-2a62-4ac5-aa32-76dc1c08dbad', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('8bab2590-2a62-4ac5-aa32-76dc1c08dbad', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('8bab2590-2a62-4ac5-aa32-76dc1c08dbad', 'picture', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('8bab2590-2a62-4ac5-aa32-76dc1c08dbad', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('92216c48-3bf6-4bce-8878-38e2b78a5110', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('92216c48-3bf6-4bce-8878-38e2b78a5110', 'website', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('92216c48-3bf6-4bce-8878-38e2b78a5110', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('92216c48-3bf6-4bce-8878-38e2b78a5110', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('92216c48-3bf6-4bce-8878-38e2b78a5110', 'website', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('92216c48-3bf6-4bce-8878-38e2b78a5110', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('c0644e04-1db4-4ce0-b474-6751e81bd556', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('c0644e04-1db4-4ce0-b474-6751e81bd556', 'gender', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('c0644e04-1db4-4ce0-b474-6751e81bd556', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('c0644e04-1db4-4ce0-b474-6751e81bd556', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('c0644e04-1db4-4ce0-b474-6751e81bd556', 'gender', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('c0644e04-1db4-4ce0-b474-6751e81bd556', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('57d48f4c-d335-4582-9704-9d19fd99feea', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('57d48f4c-d335-4582-9704-9d19fd99feea', 'birthdate', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('57d48f4c-d335-4582-9704-9d19fd99feea', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('57d48f4c-d335-4582-9704-9d19fd99feea', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('57d48f4c-d335-4582-9704-9d19fd99feea', 'birthdate', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('57d48f4c-d335-4582-9704-9d19fd99feea', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('fdaa34c3-f3ee-45de-9b01-32cee0aaea68', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('fdaa34c3-f3ee-45de-9b01-32cee0aaea68', 'zoneinfo', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('fdaa34c3-f3ee-45de-9b01-32cee0aaea68', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('fdaa34c3-f3ee-45de-9b01-32cee0aaea68', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('fdaa34c3-f3ee-45de-9b01-32cee0aaea68', 'zoneinfo', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('fdaa34c3-f3ee-45de-9b01-32cee0aaea68', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('eda95f51-58f5-4608-96cb-d18e2d6a0161', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('eda95f51-58f5-4608-96cb-d18e2d6a0161', 'locale', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('eda95f51-58f5-4608-96cb-d18e2d6a0161', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('eda95f51-58f5-4608-96cb-d18e2d6a0161', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('eda95f51-58f5-4608-96cb-d18e2d6a0161', 'locale', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('eda95f51-58f5-4608-96cb-d18e2d6a0161', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('22fcc0aa-8066-466d-b200-ecd4d5dc426a', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('22fcc0aa-8066-466d-b200-ecd4d5dc426a', 'updatedAt', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('22fcc0aa-8066-466d-b200-ecd4d5dc426a', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('22fcc0aa-8066-466d-b200-ecd4d5dc426a', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('22fcc0aa-8066-466d-b200-ecd4d5dc426a', 'updated_at', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('22fcc0aa-8066-466d-b200-ecd4d5dc426a', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('92a1229f-c13e-4ac3-be8e-e5210f03f4f3', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('92a1229f-c13e-4ac3-be8e-e5210f03f4f3', 'email', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('92a1229f-c13e-4ac3-be8e-e5210f03f4f3', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('92a1229f-c13e-4ac3-be8e-e5210f03f4f3', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('92a1229f-c13e-4ac3-be8e-e5210f03f4f3', 'email', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('92a1229f-c13e-4ac3-be8e-e5210f03f4f3', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('43627225-1ae1-4fd1-bc41-57cace87a6a8', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('43627225-1ae1-4fd1-bc41-57cace87a6a8', 'emailVerified', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('43627225-1ae1-4fd1-bc41-57cace87a6a8', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('43627225-1ae1-4fd1-bc41-57cace87a6a8', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('43627225-1ae1-4fd1-bc41-57cace87a6a8', 'email_verified', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('43627225-1ae1-4fd1-bc41-57cace87a6a8', 'boolean', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('eef56bf8-a105-4398-9f4c-0c213fa1ef4c', 'formatted', 'user.attribute.formatted');
INSERT INTO public.protocol_mapper_config VALUES ('eef56bf8-a105-4398-9f4c-0c213fa1ef4c', 'country', 'user.attribute.country');
INSERT INTO public.protocol_mapper_config VALUES ('eef56bf8-a105-4398-9f4c-0c213fa1ef4c', 'postal_code', 'user.attribute.postal_code');
INSERT INTO public.protocol_mapper_config VALUES ('eef56bf8-a105-4398-9f4c-0c213fa1ef4c', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('eef56bf8-a105-4398-9f4c-0c213fa1ef4c', 'street', 'user.attribute.street');
INSERT INTO public.protocol_mapper_config VALUES ('eef56bf8-a105-4398-9f4c-0c213fa1ef4c', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('eef56bf8-a105-4398-9f4c-0c213fa1ef4c', 'region', 'user.attribute.region');
INSERT INTO public.protocol_mapper_config VALUES ('eef56bf8-a105-4398-9f4c-0c213fa1ef4c', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('eef56bf8-a105-4398-9f4c-0c213fa1ef4c', 'locality', 'user.attribute.locality');
INSERT INTO public.protocol_mapper_config VALUES ('143d09a3-f3eb-4dd0-9beb-9ecd10760f69', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('143d09a3-f3eb-4dd0-9beb-9ecd10760f69', 'phoneNumber', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('143d09a3-f3eb-4dd0-9beb-9ecd10760f69', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('143d09a3-f3eb-4dd0-9beb-9ecd10760f69', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('143d09a3-f3eb-4dd0-9beb-9ecd10760f69', 'phone_number', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('143d09a3-f3eb-4dd0-9beb-9ecd10760f69', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('772dd8ab-fc0f-40d0-b8e6-2c142111c618', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('772dd8ab-fc0f-40d0-b8e6-2c142111c618', 'phoneNumberVerified', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('772dd8ab-fc0f-40d0-b8e6-2c142111c618', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('772dd8ab-fc0f-40d0-b8e6-2c142111c618', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('772dd8ab-fc0f-40d0-b8e6-2c142111c618', 'phone_number_verified', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('772dd8ab-fc0f-40d0-b8e6-2c142111c618', 'boolean', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('8d8c5c77-5008-4049-a307-f82cd2f83373', 'true', 'multivalued');
INSERT INTO public.protocol_mapper_config VALUES ('8d8c5c77-5008-4049-a307-f82cd2f83373', 'foo', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('8d8c5c77-5008-4049-a307-f82cd2f83373', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('8d8c5c77-5008-4049-a307-f82cd2f83373', 'realm_access.roles', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('8d8c5c77-5008-4049-a307-f82cd2f83373', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('8ab9aeb3-c987-48a2-8820-4dcdd1a37766', 'true', 'multivalued');
INSERT INTO public.protocol_mapper_config VALUES ('8ab9aeb3-c987-48a2-8820-4dcdd1a37766', 'foo', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('8ab9aeb3-c987-48a2-8820-4dcdd1a37766', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('8ab9aeb3-c987-48a2-8820-4dcdd1a37766', 'resource_access.${client_id}.roles', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('8ab9aeb3-c987-48a2-8820-4dcdd1a37766', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('0c2d6404-53d9-4d57-bbb7-a9edb4c6202f', 'true', 'userinfo.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('0c2d6404-53d9-4d57-bbb7-a9edb4c6202f', 'username', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('0c2d6404-53d9-4d57-bbb7-a9edb4c6202f', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('0c2d6404-53d9-4d57-bbb7-a9edb4c6202f', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('0c2d6404-53d9-4d57-bbb7-a9edb4c6202f', 'upn', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('0c2d6404-53d9-4d57-bbb7-a9edb4c6202f', 'String', 'jsonType.label');
INSERT INTO public.protocol_mapper_config VALUES ('ab5d5eac-7848-47b3-8728-c15559c64a5e', 'true', 'multivalued');
INSERT INTO public.protocol_mapper_config VALUES ('ab5d5eac-7848-47b3-8728-c15559c64a5e', 'foo', 'user.attribute');
INSERT INTO public.protocol_mapper_config VALUES ('ab5d5eac-7848-47b3-8728-c15559c64a5e', 'true', 'id.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('ab5d5eac-7848-47b3-8728-c15559c64a5e', 'true', 'access.token.claim');
INSERT INTO public.protocol_mapper_config VALUES ('ab5d5eac-7848-47b3-8728-c15559c64a5e', 'groups', 'claim.name');
INSERT INTO public.protocol_mapper_config VALUES ('ab5d5eac-7848-47b3-8728-c15559c64a5e', 'String', 'jsonType.label');


--
-- TOC entry 3772 (class 0 OID 40042)
-- Dependencies: 211
-- Data for Name: realm; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.realm VALUES ('master', 60, 300, 60, NULL, NULL, NULL, true, false, 0, NULL, 'master', 0, NULL, false, false, false, false, 'EXTERNAL', 1800, 36000, false, false, '982f79bc-4b83-4983-abc4-f917708008ca', 1800, false, NULL, false, false, false, false, 0, 1, 30, 6, 'HmacSHA1', 'totp', '57ec5db6-28cb-457e-9fdf-8f3570278e3e', '77c4cd74-f290-4337-9885-d4969306fbb9', '918ddd3b-fc24-4bd0-918f-874795de1a4e', '3f2fafc6-4ca5-4c96-b59e-abcb3e1512a2', 'b7b4a721-a4a0-4886-8657-e1e061b2abae', 2592000, false, 900, true, false, '5e8f8121-6832-4301-a10c-1aa675b7b2af', 0, false, 0, 0, 'dbfd7da9-148f-4238-9c20-70b4b6db8b8f');


--
-- TOC entry 3773 (class 0 OID 40060)
-- Dependencies: 212
-- Data for Name: realm_attribute; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.realm_attribute VALUES ('_browser_header.contentSecurityPolicyReportOnly', 'master', '');
INSERT INTO public.realm_attribute VALUES ('_browser_header.xContentTypeOptions', 'master', 'nosniff');
INSERT INTO public.realm_attribute VALUES ('_browser_header.xRobotsTag', 'master', 'none');
INSERT INTO public.realm_attribute VALUES ('_browser_header.xFrameOptions', 'master', 'SAMEORIGIN');
INSERT INTO public.realm_attribute VALUES ('_browser_header.contentSecurityPolicy', 'master', 'frame-src ''self''; frame-ancestors ''self''; object-src ''none'';');
INSERT INTO public.realm_attribute VALUES ('_browser_header.xXSSProtection', 'master', '1; mode=block');
INSERT INTO public.realm_attribute VALUES ('_browser_header.strictTransportSecurity', 'master', 'max-age=31536000; includeSubDomains');
INSERT INTO public.realm_attribute VALUES ('bruteForceProtected', 'master', 'false');
INSERT INTO public.realm_attribute VALUES ('permanentLockout', 'master', 'false');
INSERT INTO public.realm_attribute VALUES ('maxFailureWaitSeconds', 'master', '900');
INSERT INTO public.realm_attribute VALUES ('minimumQuickLoginWaitSeconds', 'master', '60');
INSERT INTO public.realm_attribute VALUES ('waitIncrementSeconds', 'master', '60');
INSERT INTO public.realm_attribute VALUES ('quickLoginCheckMilliSeconds', 'master', '1000');
INSERT INTO public.realm_attribute VALUES ('maxDeltaTimeSeconds', 'master', '43200');
INSERT INTO public.realm_attribute VALUES ('failureFactor', 'master', '30');
INSERT INTO public.realm_attribute VALUES ('displayName', 'master', 'Keycloak');
INSERT INTO public.realm_attribute VALUES ('displayNameHtml', 'master', '<div class="kc-logo-text"><span>Keycloak</span></div>');
INSERT INTO public.realm_attribute VALUES ('defaultSignatureAlgorithm', 'master', 'RS256');
INSERT INTO public.realm_attribute VALUES ('offlineSessionMaxLifespanEnabled', 'master', 'false');
INSERT INTO public.realm_attribute VALUES ('offlineSessionMaxLifespan', 'master', '5184000');


--
-- TOC entry 3821 (class 0 OID 40849)
-- Dependencies: 260
-- Data for Name: realm_default_groups; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3798 (class 0 OID 40531)
-- Dependencies: 237
-- Data for Name: realm_enabled_event_types; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3774 (class 0 OID 40069)
-- Dependencies: 213
-- Data for Name: realm_events_listeners; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.realm_events_listeners VALUES ('master', 'jboss-logging');


--
-- TOC entry 3854 (class 0 OID 41572)
-- Dependencies: 293
-- Data for Name: realm_localizations; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3775 (class 0 OID 40072)
-- Dependencies: 214
-- Data for Name: realm_required_credential; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.realm_required_credential VALUES ('password', 'password', true, true, 'master');


--
-- TOC entry 3776 (class 0 OID 40080)
-- Dependencies: 215
-- Data for Name: realm_smtp_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3796 (class 0 OID 40446)
-- Dependencies: 235
-- Data for Name: realm_supported_locales; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3777 (class 0 OID 40092)
-- Dependencies: 216
-- Data for Name: redirect_uris; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.redirect_uris VALUES ('0350c73b-e4db-4555-bf1d-bbf41a81315a', '/realms/master/account/*');
INSERT INTO public.redirect_uris VALUES ('f0861274-7936-4ee0-b4ef-087776e07f97', '/realms/master/account/*');
INSERT INTO public.redirect_uris VALUES ('551599da-86f9-447a-aa70-b3169d239cc8', '/admin/master/console/*');


--
-- TOC entry 3814 (class 0 OID 40780)
-- Dependencies: 253
-- Data for Name: required_action_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3813 (class 0 OID 40772)
-- Dependencies: 252
-- Data for Name: required_action_provider; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.required_action_provider VALUES ('8e7bdb9d-6929-4368-9fdc-dcb339c3b941', 'VERIFY_EMAIL', 'Verify Email', 'master', true, false, 'VERIFY_EMAIL', 50);
INSERT INTO public.required_action_provider VALUES ('28b955a9-2706-44a1-b857-1ebc05fb82b6', 'UPDATE_PROFILE', 'Update Profile', 'master', true, false, 'UPDATE_PROFILE', 40);
INSERT INTO public.required_action_provider VALUES ('b5777b3c-a570-4b91-be10-27dfd72766b3', 'CONFIGURE_TOTP', 'Configure OTP', 'master', true, false, 'CONFIGURE_TOTP', 10);
INSERT INTO public.required_action_provider VALUES ('8be34318-48dd-4999-ba66-d1f015545b4a', 'UPDATE_PASSWORD', 'Update Password', 'master', true, false, 'UPDATE_PASSWORD', 30);
INSERT INTO public.required_action_provider VALUES ('b34d1057-ead0-4a8f-8acd-0dbd5645535c', 'terms_and_conditions', 'Terms and Conditions', 'master', false, false, 'terms_and_conditions', 20);
INSERT INTO public.required_action_provider VALUES ('12003f5d-a371-4a02-9539-fde46edea085', 'update_user_locale', 'Update User Locale', 'master', true, false, 'update_user_locale', 1000);
INSERT INTO public.required_action_provider VALUES ('339d8ba5-d288-41b6-afd9-171c62bbf2c8', 'delete_account', 'Delete Account', 'master', false, false, 'delete_account', 60);


--
-- TOC entry 3851 (class 0 OID 41499)
-- Dependencies: 290
-- Data for Name: resource_attribute; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3831 (class 0 OID 41072)
-- Dependencies: 270
-- Data for Name: resource_policy; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3830 (class 0 OID 41057)
-- Dependencies: 269
-- Data for Name: resource_scope; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3825 (class 0 OID 40991)
-- Dependencies: 264
-- Data for Name: resource_server; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3850 (class 0 OID 41475)
-- Dependencies: 289
-- Data for Name: resource_server_perm_ticket; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3828 (class 0 OID 41029)
-- Dependencies: 267
-- Data for Name: resource_server_policy; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3826 (class 0 OID 40999)
-- Dependencies: 265
-- Data for Name: resource_server_resource; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3827 (class 0 OID 41014)
-- Dependencies: 266
-- Data for Name: resource_server_scope; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3852 (class 0 OID 41518)
-- Dependencies: 291
-- Data for Name: resource_uris; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3853 (class 0 OID 41528)
-- Dependencies: 292
-- Data for Name: role_attribute; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3778 (class 0 OID 40095)
-- Dependencies: 217
-- Data for Name: scope_mapping; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.scope_mapping VALUES ('f0861274-7936-4ee0-b4ef-087776e07f97', '6db6c2db-1a56-4164-bc6e-d2124baceeac');


--
-- TOC entry 3832 (class 0 OID 41087)
-- Dependencies: 271
-- Data for Name: scope_policy; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3780 (class 0 OID 40101)
-- Dependencies: 219
-- Data for Name: user_attribute; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3802 (class 0 OID 40554)
-- Dependencies: 241
-- Data for Name: user_consent; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3848 (class 0 OID 41450)
-- Dependencies: 287
-- Data for Name: user_consent_client_scope; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3781 (class 0 OID 40107)
-- Dependencies: 220
-- Data for Name: user_entity; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.user_entity VALUES ('a97177fe-51da-4bb1-a0c4-28a54247fec0', NULL, 'e96c12cd-7cec-490f-a6eb-58caab96e2b8', false, true, NULL, NULL, NULL, 'master', 'admin', 1648732737067, NULL, 0);


--
-- TOC entry 3782 (class 0 OID 40116)
-- Dependencies: 221
-- Data for Name: user_federation_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3809 (class 0 OID 40670)
-- Dependencies: 248
-- Data for Name: user_federation_mapper; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3810 (class 0 OID 40676)
-- Dependencies: 249
-- Data for Name: user_federation_mapper_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3783 (class 0 OID 40122)
-- Dependencies: 222
-- Data for Name: user_federation_provider; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3820 (class 0 OID 40846)
-- Dependencies: 259
-- Data for Name: user_group_membership; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3784 (class 0 OID 40128)
-- Dependencies: 223
-- Data for Name: user_required_action; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3785 (class 0 OID 40131)
-- Dependencies: 224
-- Data for Name: user_role_mapping; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.user_role_mapping VALUES ('dbfd7da9-148f-4238-9c20-70b4b6db8b8f', 'a97177fe-51da-4bb1-a0c4-28a54247fec0');
INSERT INTO public.user_role_mapping VALUES ('63360619-7883-41f8-b592-2b8fdc431180', 'a97177fe-51da-4bb1-a0c4-28a54247fec0');


--
-- TOC entry 3786 (class 0 OID 40134)
-- Dependencies: 225
-- Data for Name: user_session; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3797 (class 0 OID 40449)
-- Dependencies: 236
-- Data for Name: user_session_note; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3779 (class 0 OID 40098)
-- Dependencies: 218
-- Data for Name: username_login_failure; Type: TABLE DATA; Schema: public; Owner: keycloak
--



--
-- TOC entry 3787 (class 0 OID 40147)
-- Dependencies: 226
-- Data for Name: web_origins; Type: TABLE DATA; Schema: public; Owner: keycloak
--

INSERT INTO public.web_origins VALUES ('551599da-86f9-447a-aa70-b3169d239cc8', '+');


--
-- TOC entry 3321 (class 2606 OID 41241)
-- Name: username_login_failure CONSTRAINT_17-2; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.username_login_failure
    ADD CONSTRAINT "CONSTRAINT_17-2" PRIMARY KEY (realm_id, username);


--
-- TOC entry 3294 (class 2606 OID 41553)
-- Name: keycloak_role UK_J3RWUVD56ONTGSUHOGM184WW2-2; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.keycloak_role
    ADD CONSTRAINT "UK_J3RWUVD56ONTGSUHOGM184WW2-2" UNIQUE (name, client_realm_constraint);


--
-- TOC entry 3536 (class 2606 OID 41380)
-- Name: client_auth_flow_bindings c_cli_flow_bind; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_auth_flow_bindings
    ADD CONSTRAINT c_cli_flow_bind PRIMARY KEY (client_id, binding_name);


--
-- TOC entry 3538 (class 2606 OID 41585)
-- Name: client_scope_client c_cli_scope_bind; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_scope_client
    ADD CONSTRAINT c_cli_scope_bind PRIMARY KEY (client_id, scope_id);


--
-- TOC entry 3533 (class 2606 OID 41255)
-- Name: client_initial_access cnstr_client_init_acc_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_initial_access
    ADD CONSTRAINT cnstr_client_init_acc_pk PRIMARY KEY (id);


--
-- TOC entry 3450 (class 2606 OID 40887)
-- Name: realm_default_groups con_group_id_def_groups; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_default_groups
    ADD CONSTRAINT con_group_id_def_groups UNIQUE (group_id);


--
-- TOC entry 3498 (class 2606 OID 41174)
-- Name: broker_link constr_broker_link_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.broker_link
    ADD CONSTRAINT constr_broker_link_pk PRIMARY KEY (identity_provider, user_id);


--
-- TOC entry 3420 (class 2606 OID 40793)
-- Name: client_user_session_note constr_cl_usr_ses_note; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_user_session_note
    ADD CONSTRAINT constr_cl_usr_ses_note PRIMARY KEY (client_session, name);


--
-- TOC entry 3524 (class 2606 OID 41194)
-- Name: component_config constr_component_config_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.component_config
    ADD CONSTRAINT constr_component_config_pk PRIMARY KEY (id);


--
-- TOC entry 3527 (class 2606 OID 41192)
-- Name: component constr_component_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.component
    ADD CONSTRAINT constr_component_pk PRIMARY KEY (id);


--
-- TOC entry 3516 (class 2606 OID 41190)
-- Name: fed_user_required_action constr_fed_required_action; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.fed_user_required_action
    ADD CONSTRAINT constr_fed_required_action PRIMARY KEY (required_action, user_id);


--
-- TOC entry 3500 (class 2606 OID 41176)
-- Name: fed_user_attribute constr_fed_user_attr_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.fed_user_attribute
    ADD CONSTRAINT constr_fed_user_attr_pk PRIMARY KEY (id);


--
-- TOC entry 3503 (class 2606 OID 41178)
-- Name: fed_user_consent constr_fed_user_consent_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.fed_user_consent
    ADD CONSTRAINT constr_fed_user_consent_pk PRIMARY KEY (id);


--
-- TOC entry 3508 (class 2606 OID 41184)
-- Name: fed_user_credential constr_fed_user_cred_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.fed_user_credential
    ADD CONSTRAINT constr_fed_user_cred_pk PRIMARY KEY (id);


--
-- TOC entry 3512 (class 2606 OID 41186)
-- Name: fed_user_group_membership constr_fed_user_group; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.fed_user_group_membership
    ADD CONSTRAINT constr_fed_user_group PRIMARY KEY (group_id, user_id);


--
-- TOC entry 3520 (class 2606 OID 41188)
-- Name: fed_user_role_mapping constr_fed_user_role; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.fed_user_role_mapping
    ADD CONSTRAINT constr_fed_user_role PRIMARY KEY (role_id, user_id);


--
-- TOC entry 3531 (class 2606 OID 41234)
-- Name: federated_user constr_federated_user; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.federated_user
    ADD CONSTRAINT constr_federated_user PRIMARY KEY (id);


--
-- TOC entry 3452 (class 2606 OID 41339)
-- Name: realm_default_groups constr_realm_default_groups; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_default_groups
    ADD CONSTRAINT constr_realm_default_groups PRIMARY KEY (realm_id, group_id);


--
-- TOC entry 3380 (class 2606 OID 41356)
-- Name: realm_enabled_event_types constr_realm_enabl_event_types; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_enabled_event_types
    ADD CONSTRAINT constr_realm_enabl_event_types PRIMARY KEY (realm_id, value);


--
-- TOC entry 3308 (class 2606 OID 41358)
-- Name: realm_events_listeners constr_realm_events_listeners; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_events_listeners
    ADD CONSTRAINT constr_realm_events_listeners PRIMARY KEY (realm_id, value);


--
-- TOC entry 3375 (class 2606 OID 41360)
-- Name: realm_supported_locales constr_realm_supported_locales; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_supported_locales
    ADD CONSTRAINT constr_realm_supported_locales PRIMARY KEY (realm_id, value);


--
-- TOC entry 3368 (class 2606 OID 40459)
-- Name: identity_provider constraint_2b; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.identity_provider
    ADD CONSTRAINT constraint_2b PRIMARY KEY (internal_id);


--
-- TOC entry 3351 (class 2606 OID 40387)
-- Name: client_attributes constraint_3c; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_attributes
    ADD CONSTRAINT constraint_3c PRIMARY KEY (client_id, name);


--
-- TOC entry 3291 (class 2606 OID 40159)
-- Name: event_entity constraint_4; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.event_entity
    ADD CONSTRAINT constraint_4 PRIMARY KEY (id);


--
-- TOC entry 3364 (class 2606 OID 40461)
-- Name: federated_identity constraint_40; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.federated_identity
    ADD CONSTRAINT constraint_40 PRIMARY KEY (identity_provider, user_id);


--
-- TOC entry 3300 (class 2606 OID 40161)
-- Name: realm constraint_4a; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm
    ADD CONSTRAINT constraint_4a PRIMARY KEY (id);


--
-- TOC entry 3282 (class 2606 OID 40163)
-- Name: client_session_role constraint_5; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session_role
    ADD CONSTRAINT constraint_5 PRIMARY KEY (client_session, role_id);


--
-- TOC entry 3346 (class 2606 OID 40165)
-- Name: user_session constraint_57; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_session
    ADD CONSTRAINT constraint_57 PRIMARY KEY (id);


--
-- TOC entry 3337 (class 2606 OID 40167)
-- Name: user_federation_provider constraint_5c; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_federation_provider
    ADD CONSTRAINT constraint_5c PRIMARY KEY (id);


--
-- TOC entry 3354 (class 2606 OID 40389)
-- Name: client_session_note constraint_5e; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session_note
    ADD CONSTRAINT constraint_5e PRIMARY KEY (client_session, name);


--
-- TOC entry 3274 (class 2606 OID 40171)
-- Name: client constraint_7; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT constraint_7 PRIMARY KEY (id);


--
-- TOC entry 3279 (class 2606 OID 40173)
-- Name: client_session constraint_8; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session
    ADD CONSTRAINT constraint_8 PRIMARY KEY (id);


--
-- TOC entry 3318 (class 2606 OID 40175)
-- Name: scope_mapping constraint_81; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.scope_mapping
    ADD CONSTRAINT constraint_81 PRIMARY KEY (client_id, role_id);


--
-- TOC entry 3356 (class 2606 OID 40391)
-- Name: client_node_registrations constraint_84; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_node_registrations
    ADD CONSTRAINT constraint_84 PRIMARY KEY (client_id, name);


--
-- TOC entry 3305 (class 2606 OID 40177)
-- Name: realm_attribute constraint_9; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_attribute
    ADD CONSTRAINT constraint_9 PRIMARY KEY (name, realm_id);


--
-- TOC entry 3311 (class 2606 OID 40179)
-- Name: realm_required_credential constraint_92; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_required_credential
    ADD CONSTRAINT constraint_92 PRIMARY KEY (realm_id, type);


--
-- TOC entry 3296 (class 2606 OID 40181)
-- Name: keycloak_role constraint_a; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.keycloak_role
    ADD CONSTRAINT constraint_a PRIMARY KEY (id);


--
-- TOC entry 3398 (class 2606 OID 41343)
-- Name: admin_event_entity constraint_admin_event_entity; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.admin_event_entity
    ADD CONSTRAINT constraint_admin_event_entity PRIMARY KEY (id);


--
-- TOC entry 3410 (class 2606 OID 40698)
-- Name: authenticator_config_entry constraint_auth_cfg_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.authenticator_config_entry
    ADD CONSTRAINT constraint_auth_cfg_pk PRIMARY KEY (authenticator_id, name);


--
-- TOC entry 3406 (class 2606 OID 40696)
-- Name: authentication_execution constraint_auth_exec_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.authentication_execution
    ADD CONSTRAINT constraint_auth_exec_pk PRIMARY KEY (id);


--
-- TOC entry 3403 (class 2606 OID 40694)
-- Name: authentication_flow constraint_auth_flow_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.authentication_flow
    ADD CONSTRAINT constraint_auth_flow_pk PRIMARY KEY (id);


--
-- TOC entry 3400 (class 2606 OID 40692)
-- Name: authenticator_config constraint_auth_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.authenticator_config
    ADD CONSTRAINT constraint_auth_pk PRIMARY KEY (id);


--
-- TOC entry 3418 (class 2606 OID 40702)
-- Name: client_session_auth_status constraint_auth_status_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session_auth_status
    ADD CONSTRAINT constraint_auth_status_pk PRIMARY KEY (client_session, authenticator);


--
-- TOC entry 3343 (class 2606 OID 40183)
-- Name: user_role_mapping constraint_c; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_role_mapping
    ADD CONSTRAINT constraint_c PRIMARY KEY (role_id, user_id);


--
-- TOC entry 3284 (class 2606 OID 41337)
-- Name: composite_role constraint_composite_role; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.composite_role
    ADD CONSTRAINT constraint_composite_role PRIMARY KEY (composite, child_role);


--
-- TOC entry 3396 (class 2606 OID 40579)
-- Name: client_session_prot_mapper constraint_cs_pmp_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session_prot_mapper
    ADD CONSTRAINT constraint_cs_pmp_pk PRIMARY KEY (client_session, protocol_mapper_id);


--
-- TOC entry 3373 (class 2606 OID 40463)
-- Name: identity_provider_config constraint_d; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.identity_provider_config
    ADD CONSTRAINT constraint_d PRIMARY KEY (identity_provider_id, name);


--
-- TOC entry 3484 (class 2606 OID 41051)
-- Name: policy_config constraint_dpc; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.policy_config
    ADD CONSTRAINT constraint_dpc PRIMARY KEY (policy_id, name);


--
-- TOC entry 3313 (class 2606 OID 40185)
-- Name: realm_smtp_config constraint_e; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_smtp_config
    ADD CONSTRAINT constraint_e PRIMARY KEY (realm_id, name);


--
-- TOC entry 3288 (class 2606 OID 40187)
-- Name: credential constraint_f; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.credential
    ADD CONSTRAINT constraint_f PRIMARY KEY (id);


--
-- TOC entry 3335 (class 2606 OID 40189)
-- Name: user_federation_config constraint_f9; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_federation_config
    ADD CONSTRAINT constraint_f9 PRIMARY KEY (user_federation_provider_id, name);


--
-- TOC entry 3551 (class 2606 OID 41479)
-- Name: resource_server_perm_ticket constraint_fapmt; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_perm_ticket
    ADD CONSTRAINT constraint_fapmt PRIMARY KEY (id);


--
-- TOC entry 3469 (class 2606 OID 41006)
-- Name: resource_server_resource constraint_farsr; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_resource
    ADD CONSTRAINT constraint_farsr PRIMARY KEY (id);


--
-- TOC entry 3479 (class 2606 OID 41036)
-- Name: resource_server_policy constraint_farsrp; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_policy
    ADD CONSTRAINT constraint_farsrp PRIMARY KEY (id);


--
-- TOC entry 3495 (class 2606 OID 41106)
-- Name: associated_policy constraint_farsrpap; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.associated_policy
    ADD CONSTRAINT constraint_farsrpap PRIMARY KEY (policy_id, associated_policy_id);


--
-- TOC entry 3489 (class 2606 OID 41076)
-- Name: resource_policy constraint_farsrpp; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_policy
    ADD CONSTRAINT constraint_farsrpp PRIMARY KEY (resource_id, policy_id);


--
-- TOC entry 3474 (class 2606 OID 41021)
-- Name: resource_server_scope constraint_farsrs; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_scope
    ADD CONSTRAINT constraint_farsrs PRIMARY KEY (id);


--
-- TOC entry 3486 (class 2606 OID 41061)
-- Name: resource_scope constraint_farsrsp; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_scope
    ADD CONSTRAINT constraint_farsrsp PRIMARY KEY (resource_id, scope_id);


--
-- TOC entry 3492 (class 2606 OID 41091)
-- Name: scope_policy constraint_farsrsps; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.scope_policy
    ADD CONSTRAINT constraint_farsrsps PRIMARY KEY (scope_id, policy_id);


--
-- TOC entry 3327 (class 2606 OID 40191)
-- Name: user_entity constraint_fb; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_entity
    ADD CONSTRAINT constraint_fb PRIMARY KEY (id);


--
-- TOC entry 3416 (class 2606 OID 40706)
-- Name: user_federation_mapper_config constraint_fedmapper_cfg_pm; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_federation_mapper_config
    ADD CONSTRAINT constraint_fedmapper_cfg_pm PRIMARY KEY (user_federation_mapper_id, name);


--
-- TOC entry 3412 (class 2606 OID 40704)
-- Name: user_federation_mapper constraint_fedmapperpm; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_federation_mapper
    ADD CONSTRAINT constraint_fedmapperpm PRIMARY KEY (id);


--
-- TOC entry 3549 (class 2606 OID 41464)
-- Name: fed_user_consent_cl_scope constraint_fgrntcsnt_clsc_pm; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.fed_user_consent_cl_scope
    ADD CONSTRAINT constraint_fgrntcsnt_clsc_pm PRIMARY KEY (user_consent_id, scope_id);


--
-- TOC entry 3546 (class 2606 OID 41454)
-- Name: user_consent_client_scope constraint_grntcsnt_clsc_pm; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_consent_client_scope
    ADD CONSTRAINT constraint_grntcsnt_clsc_pm PRIMARY KEY (user_consent_id, scope_id);


--
-- TOC entry 3391 (class 2606 OID 40573)
-- Name: user_consent constraint_grntcsnt_pm; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_consent
    ADD CONSTRAINT constraint_grntcsnt_pm PRIMARY KEY (id);


--
-- TOC entry 3437 (class 2606 OID 40854)
-- Name: keycloak_group constraint_group; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.keycloak_group
    ADD CONSTRAINT constraint_group PRIMARY KEY (id);


--
-- TOC entry 3444 (class 2606 OID 40861)
-- Name: group_attribute constraint_group_attribute_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.group_attribute
    ADD CONSTRAINT constraint_group_attribute_pk PRIMARY KEY (id);


--
-- TOC entry 3441 (class 2606 OID 40875)
-- Name: group_role_mapping constraint_group_role; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.group_role_mapping
    ADD CONSTRAINT constraint_group_role PRIMARY KEY (role_id, group_id);


--
-- TOC entry 3386 (class 2606 OID 40569)
-- Name: identity_provider_mapper constraint_idpm; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.identity_provider_mapper
    ADD CONSTRAINT constraint_idpm PRIMARY KEY (id);


--
-- TOC entry 3389 (class 2606 OID 40755)
-- Name: idp_mapper_config constraint_idpmconfig; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.idp_mapper_config
    ADD CONSTRAINT constraint_idpmconfig PRIMARY KEY (idp_mapper_id, name);


--
-- TOC entry 3383 (class 2606 OID 40567)
-- Name: migration_model constraint_migmod; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.migration_model
    ADD CONSTRAINT constraint_migmod PRIMARY KEY (id);


--
-- TOC entry 3433 (class 2606 OID 41560)
-- Name: offline_client_session constraint_offl_cl_ses_pk3; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.offline_client_session
    ADD CONSTRAINT constraint_offl_cl_ses_pk3 PRIMARY KEY (user_session_id, client_id, client_storage_provider, external_client_id, offline_flag);


--
-- TOC entry 3427 (class 2606 OID 40830)
-- Name: offline_user_session constraint_offl_us_ses_pk2; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.offline_user_session
    ADD CONSTRAINT constraint_offl_us_ses_pk2 PRIMARY KEY (user_session_id, offline_flag);


--
-- TOC entry 3358 (class 2606 OID 40457)
-- Name: protocol_mapper constraint_pcm; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.protocol_mapper
    ADD CONSTRAINT constraint_pcm PRIMARY KEY (id);


--
-- TOC entry 3362 (class 2606 OID 40748)
-- Name: protocol_mapper_config constraint_pmconfig; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.protocol_mapper_config
    ADD CONSTRAINT constraint_pmconfig PRIMARY KEY (protocol_mapper_id, name);


--
-- TOC entry 3315 (class 2606 OID 41362)
-- Name: redirect_uris constraint_redirect_uris; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.redirect_uris
    ADD CONSTRAINT constraint_redirect_uris PRIMARY KEY (client_id, value);


--
-- TOC entry 3425 (class 2606 OID 40791)
-- Name: required_action_config constraint_req_act_cfg_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.required_action_config
    ADD CONSTRAINT constraint_req_act_cfg_pk PRIMARY KEY (required_action_id, name);


--
-- TOC entry 3422 (class 2606 OID 40789)
-- Name: required_action_provider constraint_req_act_prv_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.required_action_provider
    ADD CONSTRAINT constraint_req_act_prv_pk PRIMARY KEY (id);


--
-- TOC entry 3340 (class 2606 OID 40700)
-- Name: user_required_action constraint_required_action; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_required_action
    ADD CONSTRAINT constraint_required_action PRIMARY KEY (required_action, user_id);


--
-- TOC entry 3557 (class 2606 OID 41527)
-- Name: resource_uris constraint_resour_uris_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_uris
    ADD CONSTRAINT constraint_resour_uris_pk PRIMARY KEY (resource_id, value);


--
-- TOC entry 3559 (class 2606 OID 41535)
-- Name: role_attribute constraint_role_attribute_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.role_attribute
    ADD CONSTRAINT constraint_role_attribute_pk PRIMARY KEY (id);


--
-- TOC entry 3323 (class 2606 OID 40787)
-- Name: user_attribute constraint_user_attribute_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_attribute
    ADD CONSTRAINT constraint_user_attribute_pk PRIMARY KEY (id);


--
-- TOC entry 3447 (class 2606 OID 40868)
-- Name: user_group_membership constraint_user_group; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_group_membership
    ADD CONSTRAINT constraint_user_group PRIMARY KEY (group_id, user_id);


--
-- TOC entry 3378 (class 2606 OID 40467)
-- Name: user_session_note constraint_usn_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_session_note
    ADD CONSTRAINT constraint_usn_pk PRIMARY KEY (user_session, name);


--
-- TOC entry 3348 (class 2606 OID 41364)
-- Name: web_origins constraint_web_origins; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.web_origins
    ADD CONSTRAINT constraint_web_origins PRIMARY KEY (client_id, value);


--
-- TOC entry 3272 (class 2606 OID 39986)
-- Name: databasechangeloglock databasechangeloglock_pkey; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.databasechangeloglock
    ADD CONSTRAINT databasechangeloglock_pkey PRIMARY KEY (id);


--
-- TOC entry 3461 (class 2606 OID 40973)
-- Name: client_scope_attributes pk_cl_tmpl_attr; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_scope_attributes
    ADD CONSTRAINT pk_cl_tmpl_attr PRIMARY KEY (scope_id, name);


--
-- TOC entry 3456 (class 2606 OID 40932)
-- Name: client_scope pk_cli_template; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_scope
    ADD CONSTRAINT pk_cli_template PRIMARY KEY (id);


--
-- TOC entry 3467 (class 2606 OID 41317)
-- Name: resource_server pk_resource_server; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server
    ADD CONSTRAINT pk_resource_server PRIMARY KEY (id);


--
-- TOC entry 3465 (class 2606 OID 40961)
-- Name: client_scope_role_mapping pk_template_scope; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_scope_role_mapping
    ADD CONSTRAINT pk_template_scope PRIMARY KEY (scope_id, role_id);


--
-- TOC entry 3544 (class 2606 OID 41439)
-- Name: default_client_scope r_def_cli_scope_bind; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.default_client_scope
    ADD CONSTRAINT r_def_cli_scope_bind PRIMARY KEY (realm_id, scope_id);


--
-- TOC entry 3562 (class 2606 OID 41579)
-- Name: realm_localizations realm_localizations_pkey; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_localizations
    ADD CONSTRAINT realm_localizations_pkey PRIMARY KEY (realm_id, locale);


--
-- TOC entry 3555 (class 2606 OID 41507)
-- Name: resource_attribute res_attr_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_attribute
    ADD CONSTRAINT res_attr_pk PRIMARY KEY (id);


--
-- TOC entry 3439 (class 2606 OID 41247)
-- Name: keycloak_group sibling_names; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.keycloak_group
    ADD CONSTRAINT sibling_names UNIQUE (realm_id, parent_group, name);


--
-- TOC entry 3371 (class 2606 OID 40514)
-- Name: identity_provider uk_2daelwnibji49avxsrtuf6xj33; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.identity_provider
    ADD CONSTRAINT uk_2daelwnibji49avxsrtuf6xj33 UNIQUE (provider_alias, realm_id);


--
-- TOC entry 3277 (class 2606 OID 40195)
-- Name: client uk_b71cjlbenv945rb6gcon438at; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT uk_b71cjlbenv945rb6gcon438at UNIQUE (realm_id, client_id);


--
-- TOC entry 3458 (class 2606 OID 41392)
-- Name: client_scope uk_cli_scope; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_scope
    ADD CONSTRAINT uk_cli_scope UNIQUE (realm_id, name);


--
-- TOC entry 3331 (class 2606 OID 40199)
-- Name: user_entity uk_dykn684sl8up1crfei6eckhd7; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_entity
    ADD CONSTRAINT uk_dykn684sl8up1crfei6eckhd7 UNIQUE (realm_id, email_constraint);


--
-- TOC entry 3472 (class 2606 OID 41569)
-- Name: resource_server_resource uk_frsr6t700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_resource
    ADD CONSTRAINT uk_frsr6t700s9v50bu18ws5ha6 UNIQUE (name, owner, resource_server_id);


--
-- TOC entry 3553 (class 2606 OID 41564)
-- Name: resource_server_perm_ticket uk_frsr6t700s9v50bu18ws5pmt; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_perm_ticket
    ADD CONSTRAINT uk_frsr6t700s9v50bu18ws5pmt UNIQUE (owner, requester, resource_server_id, resource_id, scope_id);


--
-- TOC entry 3482 (class 2606 OID 41308)
-- Name: resource_server_policy uk_frsrpt700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_policy
    ADD CONSTRAINT uk_frsrpt700s9v50bu18ws5ha6 UNIQUE (name, resource_server_id);


--
-- TOC entry 3477 (class 2606 OID 41312)
-- Name: resource_server_scope uk_frsrst700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_scope
    ADD CONSTRAINT uk_frsrst700s9v50bu18ws5ha6 UNIQUE (name, resource_server_id);


--
-- TOC entry 3394 (class 2606 OID 41555)
-- Name: user_consent uk_jkuwuvd56ontgsuhogm8uewrt; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_consent
    ADD CONSTRAINT uk_jkuwuvd56ontgsuhogm8uewrt UNIQUE (client_id, client_storage_provider, external_client_id, user_id);


--
-- TOC entry 3303 (class 2606 OID 40207)
-- Name: realm uk_orvsdmla56612eaefiq6wl5oi; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm
    ADD CONSTRAINT uk_orvsdmla56612eaefiq6wl5oi UNIQUE (name);


--
-- TOC entry 3333 (class 2606 OID 41236)
-- Name: user_entity uk_ru8tt6t700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_entity
    ADD CONSTRAINT uk_ru8tt6t700s9v50bu18ws5ha6 UNIQUE (realm_id, username);


--
-- TOC entry 3496 (class 1259 OID 41261)
-- Name: idx_assoc_pol_assoc_pol_id; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_assoc_pol_assoc_pol_id ON public.associated_policy USING btree (associated_policy_id);


--
-- TOC entry 3401 (class 1259 OID 41265)
-- Name: idx_auth_config_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_auth_config_realm ON public.authenticator_config USING btree (realm_id);


--
-- TOC entry 3407 (class 1259 OID 41263)
-- Name: idx_auth_exec_flow; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_auth_exec_flow ON public.authentication_execution USING btree (flow_id);


--
-- TOC entry 3408 (class 1259 OID 41262)
-- Name: idx_auth_exec_realm_flow; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_auth_exec_realm_flow ON public.authentication_execution USING btree (realm_id, flow_id);


--
-- TOC entry 3404 (class 1259 OID 41264)
-- Name: idx_auth_flow_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_auth_flow_realm ON public.authentication_flow USING btree (realm_id);


--
-- TOC entry 3539 (class 1259 OID 41586)
-- Name: idx_cl_clscope; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_cl_clscope ON public.client_scope_client USING btree (scope_id);


--
-- TOC entry 3352 (class 1259 OID 41593)
-- Name: idx_client_att_by_name_value; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_client_att_by_name_value ON public.client_attributes USING btree (name, ((value)::character varying(250)));


--
-- TOC entry 3275 (class 1259 OID 41570)
-- Name: idx_client_id; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_client_id ON public.client USING btree (client_id);


--
-- TOC entry 3534 (class 1259 OID 41305)
-- Name: idx_client_init_acc_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_client_init_acc_realm ON public.client_initial_access USING btree (realm_id);


--
-- TOC entry 3280 (class 1259 OID 41269)
-- Name: idx_client_session_session; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_client_session_session ON public.client_session USING btree (session_id);


--
-- TOC entry 3459 (class 1259 OID 41469)
-- Name: idx_clscope_attrs; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_clscope_attrs ON public.client_scope_attributes USING btree (scope_id);


--
-- TOC entry 3540 (class 1259 OID 41583)
-- Name: idx_clscope_cl; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_clscope_cl ON public.client_scope_client USING btree (client_id);


--
-- TOC entry 3359 (class 1259 OID 41466)
-- Name: idx_clscope_protmap; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_clscope_protmap ON public.protocol_mapper USING btree (client_scope_id);


--
-- TOC entry 3462 (class 1259 OID 41467)
-- Name: idx_clscope_role; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_clscope_role ON public.client_scope_role_mapping USING btree (scope_id);


--
-- TOC entry 3525 (class 1259 OID 41271)
-- Name: idx_compo_config_compo; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_compo_config_compo ON public.component_config USING btree (component_id);


--
-- TOC entry 3528 (class 1259 OID 41542)
-- Name: idx_component_provider_type; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_component_provider_type ON public.component USING btree (provider_type);


--
-- TOC entry 3529 (class 1259 OID 41270)
-- Name: idx_component_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_component_realm ON public.component USING btree (realm_id);


--
-- TOC entry 3285 (class 1259 OID 41272)
-- Name: idx_composite; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_composite ON public.composite_role USING btree (composite);


--
-- TOC entry 3286 (class 1259 OID 41273)
-- Name: idx_composite_child; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_composite_child ON public.composite_role USING btree (child_role);


--
-- TOC entry 3541 (class 1259 OID 41472)
-- Name: idx_defcls_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_defcls_realm ON public.default_client_scope USING btree (realm_id);


--
-- TOC entry 3542 (class 1259 OID 41473)
-- Name: idx_defcls_scope; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_defcls_scope ON public.default_client_scope USING btree (scope_id);


--
-- TOC entry 3292 (class 1259 OID 41571)
-- Name: idx_event_time; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_event_time ON public.event_entity USING btree (realm_id, event_time);


--
-- TOC entry 3365 (class 1259 OID 40990)
-- Name: idx_fedidentity_feduser; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fedidentity_feduser ON public.federated_identity USING btree (federated_user_id);


--
-- TOC entry 3366 (class 1259 OID 40989)
-- Name: idx_fedidentity_user; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fedidentity_user ON public.federated_identity USING btree (user_id);


--
-- TOC entry 3501 (class 1259 OID 41365)
-- Name: idx_fu_attribute; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_attribute ON public.fed_user_attribute USING btree (user_id, realm_id, name);


--
-- TOC entry 3504 (class 1259 OID 41386)
-- Name: idx_fu_cnsnt_ext; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_cnsnt_ext ON public.fed_user_consent USING btree (user_id, client_storage_provider, external_client_id);


--
-- TOC entry 3505 (class 1259 OID 41551)
-- Name: idx_fu_consent; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_consent ON public.fed_user_consent USING btree (user_id, client_id);


--
-- TOC entry 3506 (class 1259 OID 41367)
-- Name: idx_fu_consent_ru; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_consent_ru ON public.fed_user_consent USING btree (realm_id, user_id);


--
-- TOC entry 3509 (class 1259 OID 41368)
-- Name: idx_fu_credential; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_credential ON public.fed_user_credential USING btree (user_id, type);


--
-- TOC entry 3510 (class 1259 OID 41369)
-- Name: idx_fu_credential_ru; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_credential_ru ON public.fed_user_credential USING btree (realm_id, user_id);


--
-- TOC entry 3513 (class 1259 OID 41370)
-- Name: idx_fu_group_membership; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_group_membership ON public.fed_user_group_membership USING btree (user_id, group_id);


--
-- TOC entry 3514 (class 1259 OID 41371)
-- Name: idx_fu_group_membership_ru; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_group_membership_ru ON public.fed_user_group_membership USING btree (realm_id, user_id);


--
-- TOC entry 3517 (class 1259 OID 41372)
-- Name: idx_fu_required_action; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_required_action ON public.fed_user_required_action USING btree (user_id, required_action);


--
-- TOC entry 3518 (class 1259 OID 41373)
-- Name: idx_fu_required_action_ru; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_required_action_ru ON public.fed_user_required_action USING btree (realm_id, user_id);


--
-- TOC entry 3521 (class 1259 OID 41374)
-- Name: idx_fu_role_mapping; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_role_mapping ON public.fed_user_role_mapping USING btree (user_id, role_id);


--
-- TOC entry 3522 (class 1259 OID 41375)
-- Name: idx_fu_role_mapping_ru; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_role_mapping_ru ON public.fed_user_role_mapping USING btree (realm_id, user_id);


--
-- TOC entry 3445 (class 1259 OID 41276)
-- Name: idx_group_attr_group; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_group_attr_group ON public.group_attribute USING btree (group_id);


--
-- TOC entry 3442 (class 1259 OID 41277)
-- Name: idx_group_role_mapp_group; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_group_role_mapp_group ON public.group_role_mapping USING btree (group_id);


--
-- TOC entry 3387 (class 1259 OID 41279)
-- Name: idx_id_prov_mapp_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_id_prov_mapp_realm ON public.identity_provider_mapper USING btree (realm_id);


--
-- TOC entry 3369 (class 1259 OID 41278)
-- Name: idx_ident_prov_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_ident_prov_realm ON public.identity_provider USING btree (realm_id);


--
-- TOC entry 3297 (class 1259 OID 41280)
-- Name: idx_keycloak_role_client; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_keycloak_role_client ON public.keycloak_role USING btree (client);


--
-- TOC entry 3298 (class 1259 OID 41281)
-- Name: idx_keycloak_role_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_keycloak_role_realm ON public.keycloak_role USING btree (realm);


--
-- TOC entry 3434 (class 1259 OID 41590)
-- Name: idx_offline_css_preload; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_offline_css_preload ON public.offline_client_session USING btree (client_id, offline_flag);


--
-- TOC entry 3428 (class 1259 OID 41591)
-- Name: idx_offline_uss_by_user; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_offline_uss_by_user ON public.offline_user_session USING btree (user_id, realm_id, offline_flag);


--
-- TOC entry 3429 (class 1259 OID 41592)
-- Name: idx_offline_uss_by_usersess; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_offline_uss_by_usersess ON public.offline_user_session USING btree (realm_id, offline_flag, user_session_id);


--
-- TOC entry 3430 (class 1259 OID 41546)
-- Name: idx_offline_uss_createdon; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_offline_uss_createdon ON public.offline_user_session USING btree (created_on);


--
-- TOC entry 3431 (class 1259 OID 41580)
-- Name: idx_offline_uss_preload; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_offline_uss_preload ON public.offline_user_session USING btree (offline_flag, created_on, user_session_id);


--
-- TOC entry 3360 (class 1259 OID 41282)
-- Name: idx_protocol_mapper_client; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_protocol_mapper_client ON public.protocol_mapper USING btree (client_id);


--
-- TOC entry 3306 (class 1259 OID 41285)
-- Name: idx_realm_attr_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_realm_attr_realm ON public.realm_attribute USING btree (realm_id);


--
-- TOC entry 3454 (class 1259 OID 41465)
-- Name: idx_realm_clscope; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_realm_clscope ON public.client_scope USING btree (realm_id);


--
-- TOC entry 3453 (class 1259 OID 41286)
-- Name: idx_realm_def_grp_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_realm_def_grp_realm ON public.realm_default_groups USING btree (realm_id);


--
-- TOC entry 3309 (class 1259 OID 41289)
-- Name: idx_realm_evt_list_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_realm_evt_list_realm ON public.realm_events_listeners USING btree (realm_id);


--
-- TOC entry 3381 (class 1259 OID 41288)
-- Name: idx_realm_evt_types_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_realm_evt_types_realm ON public.realm_enabled_event_types USING btree (realm_id);


--
-- TOC entry 3301 (class 1259 OID 41284)
-- Name: idx_realm_master_adm_cli; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_realm_master_adm_cli ON public.realm USING btree (master_admin_client);


--
-- TOC entry 3376 (class 1259 OID 41290)
-- Name: idx_realm_supp_local_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_realm_supp_local_realm ON public.realm_supported_locales USING btree (realm_id);


--
-- TOC entry 3316 (class 1259 OID 41291)
-- Name: idx_redir_uri_client; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_redir_uri_client ON public.redirect_uris USING btree (client_id);


--
-- TOC entry 3423 (class 1259 OID 41292)
-- Name: idx_req_act_prov_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_req_act_prov_realm ON public.required_action_provider USING btree (realm_id);


--
-- TOC entry 3490 (class 1259 OID 41293)
-- Name: idx_res_policy_policy; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_res_policy_policy ON public.resource_policy USING btree (policy_id);


--
-- TOC entry 3487 (class 1259 OID 41294)
-- Name: idx_res_scope_scope; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_res_scope_scope ON public.resource_scope USING btree (scope_id);


--
-- TOC entry 3480 (class 1259 OID 41313)
-- Name: idx_res_serv_pol_res_serv; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_res_serv_pol_res_serv ON public.resource_server_policy USING btree (resource_server_id);


--
-- TOC entry 3470 (class 1259 OID 41314)
-- Name: idx_res_srv_res_res_srv; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_res_srv_res_res_srv ON public.resource_server_resource USING btree (resource_server_id);


--
-- TOC entry 3475 (class 1259 OID 41315)
-- Name: idx_res_srv_scope_res_srv; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_res_srv_scope_res_srv ON public.resource_server_scope USING btree (resource_server_id);


--
-- TOC entry 3560 (class 1259 OID 41541)
-- Name: idx_role_attribute; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_role_attribute ON public.role_attribute USING btree (role_id);


--
-- TOC entry 3463 (class 1259 OID 41468)
-- Name: idx_role_clscope; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_role_clscope ON public.client_scope_role_mapping USING btree (role_id);


--
-- TOC entry 3319 (class 1259 OID 41298)
-- Name: idx_scope_mapping_role; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_scope_mapping_role ON public.scope_mapping USING btree (role_id);


--
-- TOC entry 3493 (class 1259 OID 41299)
-- Name: idx_scope_policy_policy; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_scope_policy_policy ON public.scope_policy USING btree (policy_id);


--
-- TOC entry 3384 (class 1259 OID 41549)
-- Name: idx_update_time; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_update_time ON public.migration_model USING btree (update_time);


--
-- TOC entry 3435 (class 1259 OID 40979)
-- Name: idx_us_sess_id_on_cl_sess; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_us_sess_id_on_cl_sess ON public.offline_client_session USING btree (user_session_id);


--
-- TOC entry 3547 (class 1259 OID 41474)
-- Name: idx_usconsent_clscope; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_usconsent_clscope ON public.user_consent_client_scope USING btree (user_consent_id);


--
-- TOC entry 3324 (class 1259 OID 40986)
-- Name: idx_user_attribute; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_user_attribute ON public.user_attribute USING btree (user_id);


--
-- TOC entry 3325 (class 1259 OID 41594)
-- Name: idx_user_attribute_name; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_user_attribute_name ON public.user_attribute USING btree (name, value);


--
-- TOC entry 3392 (class 1259 OID 40983)
-- Name: idx_user_consent; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_user_consent ON public.user_consent USING btree (user_id);


--
-- TOC entry 3289 (class 1259 OID 40987)
-- Name: idx_user_credential; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_user_credential ON public.credential USING btree (user_id);


--
-- TOC entry 3328 (class 1259 OID 40980)
-- Name: idx_user_email; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_user_email ON public.user_entity USING btree (email);


--
-- TOC entry 3448 (class 1259 OID 40982)
-- Name: idx_user_group_mapping; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_user_group_mapping ON public.user_group_membership USING btree (user_id);


--
-- TOC entry 3341 (class 1259 OID 40988)
-- Name: idx_user_reqactions; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_user_reqactions ON public.user_required_action USING btree (user_id);


--
-- TOC entry 3344 (class 1259 OID 40981)
-- Name: idx_user_role_mapping; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_user_role_mapping ON public.user_role_mapping USING btree (user_id);


--
-- TOC entry 3329 (class 1259 OID 41595)
-- Name: idx_user_service_account; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_user_service_account ON public.user_entity USING btree (realm_id, service_account_client_link);


--
-- TOC entry 3413 (class 1259 OID 41301)
-- Name: idx_usr_fed_map_fed_prv; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_usr_fed_map_fed_prv ON public.user_federation_mapper USING btree (federation_provider_id);


--
-- TOC entry 3414 (class 1259 OID 41302)
-- Name: idx_usr_fed_map_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_usr_fed_map_realm ON public.user_federation_mapper USING btree (realm_id);


--
-- TOC entry 3338 (class 1259 OID 41303)
-- Name: idx_usr_fed_prv_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_usr_fed_prv_realm ON public.user_federation_provider USING btree (realm_id);


--
-- TOC entry 3349 (class 1259 OID 41304)
-- Name: idx_web_orig_client; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_web_orig_client ON public.web_origins USING btree (client_id);


--
-- TOC entry 3604 (class 2606 OID 40707)
-- Name: client_session_auth_status auth_status_constraint; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session_auth_status
    ADD CONSTRAINT auth_status_constraint FOREIGN KEY (client_session) REFERENCES public.client_session(id);


--
-- TOC entry 3588 (class 2606 OID 40468)
-- Name: identity_provider fk2b4ebc52ae5c3b34; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.identity_provider
    ADD CONSTRAINT fk2b4ebc52ae5c3b34 FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- TOC entry 3581 (class 2606 OID 40392)
-- Name: client_attributes fk3c47c64beacca966; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_attributes
    ADD CONSTRAINT fk3c47c64beacca966 FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- TOC entry 3587 (class 2606 OID 40478)
-- Name: federated_identity fk404288b92ef007a6; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.federated_identity
    ADD CONSTRAINT fk404288b92ef007a6 FOREIGN KEY (user_id) REFERENCES public.user_entity(id);


--
-- TOC entry 3583 (class 2606 OID 40627)
-- Name: client_node_registrations fk4129723ba992f594; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_node_registrations
    ADD CONSTRAINT fk4129723ba992f594 FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- TOC entry 3582 (class 2606 OID 40397)
-- Name: client_session_note fk5edfb00ff51c2736; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session_note
    ADD CONSTRAINT fk5edfb00ff51c2736 FOREIGN KEY (client_session) REFERENCES public.client_session(id);


--
-- TOC entry 3591 (class 2606 OID 40508)
-- Name: user_session_note fk5edfb00ff51d3472; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_session_note
    ADD CONSTRAINT fk5edfb00ff51d3472 FOREIGN KEY (user_session) REFERENCES public.user_session(id);


--
-- TOC entry 3564 (class 2606 OID 40210)
-- Name: client_session_role fk_11b7sgqw18i532811v7o2dv76; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session_role
    ADD CONSTRAINT fk_11b7sgqw18i532811v7o2dv76 FOREIGN KEY (client_session) REFERENCES public.client_session(id);


--
-- TOC entry 3573 (class 2606 OID 40215)
-- Name: redirect_uris fk_1burs8pb4ouj97h5wuppahv9f; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.redirect_uris
    ADD CONSTRAINT fk_1burs8pb4ouj97h5wuppahv9f FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- TOC entry 3577 (class 2606 OID 40220)
-- Name: user_federation_provider fk_1fj32f6ptolw2qy60cd8n01e8; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_federation_provider
    ADD CONSTRAINT fk_1fj32f6ptolw2qy60cd8n01e8 FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- TOC entry 3596 (class 2606 OID 40605)
-- Name: client_session_prot_mapper fk_33a8sgqw18i532811v7o2dk89; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session_prot_mapper
    ADD CONSTRAINT fk_33a8sgqw18i532811v7o2dk89 FOREIGN KEY (client_session) REFERENCES public.client_session(id);


--
-- TOC entry 3571 (class 2606 OID 40230)
-- Name: realm_required_credential fk_5hg65lybevavkqfki3kponh9v; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_required_credential
    ADD CONSTRAINT fk_5hg65lybevavkqfki3kponh9v FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- TOC entry 3634 (class 2606 OID 41508)
-- Name: resource_attribute fk_5hrm2vlf9ql5fu022kqepovbr; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_attribute
    ADD CONSTRAINT fk_5hrm2vlf9ql5fu022kqepovbr FOREIGN KEY (resource_id) REFERENCES public.resource_server_resource(id);


--
-- TOC entry 3575 (class 2606 OID 40235)
-- Name: user_attribute fk_5hrm2vlf9ql5fu043kqepovbr; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_attribute
    ADD CONSTRAINT fk_5hrm2vlf9ql5fu043kqepovbr FOREIGN KEY (user_id) REFERENCES public.user_entity(id);


--
-- TOC entry 3578 (class 2606 OID 40245)
-- Name: user_required_action fk_6qj3w1jw9cvafhe19bwsiuvmd; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_required_action
    ADD CONSTRAINT fk_6qj3w1jw9cvafhe19bwsiuvmd FOREIGN KEY (user_id) REFERENCES public.user_entity(id);


--
-- TOC entry 3568 (class 2606 OID 40250)
-- Name: keycloak_role fk_6vyqfe4cn4wlq8r6kt5vdsj5c; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.keycloak_role
    ADD CONSTRAINT fk_6vyqfe4cn4wlq8r6kt5vdsj5c FOREIGN KEY (realm) REFERENCES public.realm(id);


--
-- TOC entry 3572 (class 2606 OID 40255)
-- Name: realm_smtp_config fk_70ej8xdxgxd0b9hh6180irr0o; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_smtp_config
    ADD CONSTRAINT fk_70ej8xdxgxd0b9hh6180irr0o FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- TOC entry 3569 (class 2606 OID 40270)
-- Name: realm_attribute fk_8shxd6l3e9atqukacxgpffptw; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_attribute
    ADD CONSTRAINT fk_8shxd6l3e9atqukacxgpffptw FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- TOC entry 3565 (class 2606 OID 40275)
-- Name: composite_role fk_a63wvekftu8jo1pnj81e7mce2; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.composite_role
    ADD CONSTRAINT fk_a63wvekftu8jo1pnj81e7mce2 FOREIGN KEY (composite) REFERENCES public.keycloak_role(id);


--
-- TOC entry 3600 (class 2606 OID 40727)
-- Name: authentication_execution fk_auth_exec_flow; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.authentication_execution
    ADD CONSTRAINT fk_auth_exec_flow FOREIGN KEY (flow_id) REFERENCES public.authentication_flow(id);


--
-- TOC entry 3599 (class 2606 OID 40722)
-- Name: authentication_execution fk_auth_exec_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.authentication_execution
    ADD CONSTRAINT fk_auth_exec_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- TOC entry 3598 (class 2606 OID 40717)
-- Name: authentication_flow fk_auth_flow_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.authentication_flow
    ADD CONSTRAINT fk_auth_flow_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- TOC entry 3597 (class 2606 OID 40712)
-- Name: authenticator_config fk_auth_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.authenticator_config
    ADD CONSTRAINT fk_auth_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- TOC entry 3563 (class 2606 OID 40280)
-- Name: client_session fk_b4ao2vcvat6ukau74wbwtfqo1; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session
    ADD CONSTRAINT fk_b4ao2vcvat6ukau74wbwtfqo1 FOREIGN KEY (session_id) REFERENCES public.user_session(id);


--
-- TOC entry 3579 (class 2606 OID 40285)
-- Name: user_role_mapping fk_c4fqv34p1mbylloxang7b1q3l; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_role_mapping
    ADD CONSTRAINT fk_c4fqv34p1mbylloxang7b1q3l FOREIGN KEY (user_id) REFERENCES public.user_entity(id);


--
-- TOC entry 3611 (class 2606 OID 41413)
-- Name: client_scope_attributes fk_cl_scope_attr_scope; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_scope_attributes
    ADD CONSTRAINT fk_cl_scope_attr_scope FOREIGN KEY (scope_id) REFERENCES public.client_scope(id);


--
-- TOC entry 3612 (class 2606 OID 41403)
-- Name: client_scope_role_mapping fk_cl_scope_rm_scope; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_scope_role_mapping
    ADD CONSTRAINT fk_cl_scope_rm_scope FOREIGN KEY (scope_id) REFERENCES public.client_scope(id);


--
-- TOC entry 3605 (class 2606 OID 40799)
-- Name: client_user_session_note fk_cl_usr_ses_note; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_user_session_note
    ADD CONSTRAINT fk_cl_usr_ses_note FOREIGN KEY (client_session) REFERENCES public.client_session(id);


--
-- TOC entry 3585 (class 2606 OID 41398)
-- Name: protocol_mapper fk_cli_scope_mapper; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.protocol_mapper
    ADD CONSTRAINT fk_cli_scope_mapper FOREIGN KEY (client_scope_id) REFERENCES public.client_scope(id);


--
-- TOC entry 3627 (class 2606 OID 41256)
-- Name: client_initial_access fk_client_init_acc_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_initial_access
    ADD CONSTRAINT fk_client_init_acc_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- TOC entry 3625 (class 2606 OID 41200)
-- Name: component_config fk_component_config; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.component_config
    ADD CONSTRAINT fk_component_config FOREIGN KEY (component_id) REFERENCES public.component(id);


--
-- TOC entry 3626 (class 2606 OID 41195)
-- Name: component fk_component_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.component
    ADD CONSTRAINT fk_component_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- TOC entry 3610 (class 2606 OID 40888)
-- Name: realm_default_groups fk_def_groups_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_default_groups
    ADD CONSTRAINT fk_def_groups_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- TOC entry 3603 (class 2606 OID 40742)
-- Name: user_federation_mapper_config fk_fedmapper_cfg; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_federation_mapper_config
    ADD CONSTRAINT fk_fedmapper_cfg FOREIGN KEY (user_federation_mapper_id) REFERENCES public.user_federation_mapper(id);


--
-- TOC entry 3602 (class 2606 OID 40737)
-- Name: user_federation_mapper fk_fedmapperpm_fedprv; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_federation_mapper
    ADD CONSTRAINT fk_fedmapperpm_fedprv FOREIGN KEY (federation_provider_id) REFERENCES public.user_federation_provider(id);


--
-- TOC entry 3601 (class 2606 OID 40732)
-- Name: user_federation_mapper fk_fedmapperpm_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_federation_mapper
    ADD CONSTRAINT fk_fedmapperpm_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- TOC entry 3624 (class 2606 OID 41112)
-- Name: associated_policy fk_frsr5s213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.associated_policy
    ADD CONSTRAINT fk_frsr5s213xcx4wnkog82ssrfy FOREIGN KEY (associated_policy_id) REFERENCES public.resource_server_policy(id);


--
-- TOC entry 3622 (class 2606 OID 41097)
-- Name: scope_policy fk_frsrasp13xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.scope_policy
    ADD CONSTRAINT fk_frsrasp13xcx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES public.resource_server_policy(id);


--
-- TOC entry 3630 (class 2606 OID 41480)
-- Name: resource_server_perm_ticket fk_frsrho213xcx4wnkog82sspmt; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrho213xcx4wnkog82sspmt FOREIGN KEY (resource_server_id) REFERENCES public.resource_server(id);


--
-- TOC entry 3613 (class 2606 OID 41323)
-- Name: resource_server_resource fk_frsrho213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_resource
    ADD CONSTRAINT fk_frsrho213xcx4wnkog82ssrfy FOREIGN KEY (resource_server_id) REFERENCES public.resource_server(id);


--
-- TOC entry 3631 (class 2606 OID 41485)
-- Name: resource_server_perm_ticket fk_frsrho213xcx4wnkog83sspmt; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrho213xcx4wnkog83sspmt FOREIGN KEY (resource_id) REFERENCES public.resource_server_resource(id);


--
-- TOC entry 3632 (class 2606 OID 41490)
-- Name: resource_server_perm_ticket fk_frsrho213xcx4wnkog84sspmt; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrho213xcx4wnkog84sspmt FOREIGN KEY (scope_id) REFERENCES public.resource_server_scope(id);


--
-- TOC entry 3623 (class 2606 OID 41107)
-- Name: associated_policy fk_frsrpas14xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.associated_policy
    ADD CONSTRAINT fk_frsrpas14xcx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES public.resource_server_policy(id);


--
-- TOC entry 3621 (class 2606 OID 41092)
-- Name: scope_policy fk_frsrpass3xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.scope_policy
    ADD CONSTRAINT fk_frsrpass3xcx4wnkog82ssrfy FOREIGN KEY (scope_id) REFERENCES public.resource_server_scope(id);


--
-- TOC entry 3633 (class 2606 OID 41513)
-- Name: resource_server_perm_ticket fk_frsrpo2128cx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrpo2128cx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES public.resource_server_policy(id);


--
-- TOC entry 3615 (class 2606 OID 41318)
-- Name: resource_server_policy fk_frsrpo213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_policy
    ADD CONSTRAINT fk_frsrpo213xcx4wnkog82ssrfy FOREIGN KEY (resource_server_id) REFERENCES public.resource_server(id);


--
-- TOC entry 3617 (class 2606 OID 41062)
-- Name: resource_scope fk_frsrpos13xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_scope
    ADD CONSTRAINT fk_frsrpos13xcx4wnkog82ssrfy FOREIGN KEY (resource_id) REFERENCES public.resource_server_resource(id);


--
-- TOC entry 3619 (class 2606 OID 41077)
-- Name: resource_policy fk_frsrpos53xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_policy
    ADD CONSTRAINT fk_frsrpos53xcx4wnkog82ssrfy FOREIGN KEY (resource_id) REFERENCES public.resource_server_resource(id);


--
-- TOC entry 3620 (class 2606 OID 41082)
-- Name: resource_policy fk_frsrpp213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_policy
    ADD CONSTRAINT fk_frsrpp213xcx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES public.resource_server_policy(id);


--
-- TOC entry 3618 (class 2606 OID 41067)
-- Name: resource_scope fk_frsrps213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_scope
    ADD CONSTRAINT fk_frsrps213xcx4wnkog82ssrfy FOREIGN KEY (scope_id) REFERENCES public.resource_server_scope(id);


--
-- TOC entry 3614 (class 2606 OID 41328)
-- Name: resource_server_scope fk_frsrso213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_scope
    ADD CONSTRAINT fk_frsrso213xcx4wnkog82ssrfy FOREIGN KEY (resource_server_id) REFERENCES public.resource_server(id);


--
-- TOC entry 3566 (class 2606 OID 40300)
-- Name: composite_role fk_gr7thllb9lu8q4vqa4524jjy8; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.composite_role
    ADD CONSTRAINT fk_gr7thllb9lu8q4vqa4524jjy8 FOREIGN KEY (child_role) REFERENCES public.keycloak_role(id);


--
-- TOC entry 3629 (class 2606 OID 41455)
-- Name: user_consent_client_scope fk_grntcsnt_clsc_usc; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_consent_client_scope
    ADD CONSTRAINT fk_grntcsnt_clsc_usc FOREIGN KEY (user_consent_id) REFERENCES public.user_consent(id);


--
-- TOC entry 3595 (class 2606 OID 40590)
-- Name: user_consent fk_grntcsnt_user; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_consent
    ADD CONSTRAINT fk_grntcsnt_user FOREIGN KEY (user_id) REFERENCES public.user_entity(id);


--
-- TOC entry 3608 (class 2606 OID 40862)
-- Name: group_attribute fk_group_attribute_group; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.group_attribute
    ADD CONSTRAINT fk_group_attribute_group FOREIGN KEY (group_id) REFERENCES public.keycloak_group(id);


--
-- TOC entry 3607 (class 2606 OID 40876)
-- Name: group_role_mapping fk_group_role_group; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.group_role_mapping
    ADD CONSTRAINT fk_group_role_group FOREIGN KEY (group_id) REFERENCES public.keycloak_group(id);


--
-- TOC entry 3592 (class 2606 OID 40534)
-- Name: realm_enabled_event_types fk_h846o4h0w8epx5nwedrf5y69j; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_enabled_event_types
    ADD CONSTRAINT fk_h846o4h0w8epx5nwedrf5y69j FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- TOC entry 3570 (class 2606 OID 40310)
-- Name: realm_events_listeners fk_h846o4h0w8epx5nxev9f5y69j; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_events_listeners
    ADD CONSTRAINT fk_h846o4h0w8epx5nxev9f5y69j FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- TOC entry 3593 (class 2606 OID 40580)
-- Name: identity_provider_mapper fk_idpm_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.identity_provider_mapper
    ADD CONSTRAINT fk_idpm_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- TOC entry 3594 (class 2606 OID 40756)
-- Name: idp_mapper_config fk_idpmconfig; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.idp_mapper_config
    ADD CONSTRAINT fk_idpmconfig FOREIGN KEY (idp_mapper_id) REFERENCES public.identity_provider_mapper(id);


--
-- TOC entry 3580 (class 2606 OID 40320)
-- Name: web_origins fk_lojpho213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.web_origins
    ADD CONSTRAINT fk_lojpho213xcx4wnkog82ssrfy FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- TOC entry 3574 (class 2606 OID 40330)
-- Name: scope_mapping fk_ouse064plmlr732lxjcn1q5f1; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.scope_mapping
    ADD CONSTRAINT fk_ouse064plmlr732lxjcn1q5f1 FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- TOC entry 3584 (class 2606 OID 40473)
-- Name: protocol_mapper fk_pcm_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.protocol_mapper
    ADD CONSTRAINT fk_pcm_realm FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- TOC entry 3567 (class 2606 OID 40345)
-- Name: credential fk_pfyr0glasqyl0dei3kl69r6v0; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.credential
    ADD CONSTRAINT fk_pfyr0glasqyl0dei3kl69r6v0 FOREIGN KEY (user_id) REFERENCES public.user_entity(id);


--
-- TOC entry 3586 (class 2606 OID 40749)
-- Name: protocol_mapper_config fk_pmconfig; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.protocol_mapper_config
    ADD CONSTRAINT fk_pmconfig FOREIGN KEY (protocol_mapper_id) REFERENCES public.protocol_mapper(id);


--
-- TOC entry 3628 (class 2606 OID 41440)
-- Name: default_client_scope fk_r_def_cli_scope_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.default_client_scope
    ADD CONSTRAINT fk_r_def_cli_scope_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- TOC entry 3606 (class 2606 OID 40794)
-- Name: required_action_provider fk_req_act_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.required_action_provider
    ADD CONSTRAINT fk_req_act_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- TOC entry 3635 (class 2606 OID 41521)
-- Name: resource_uris fk_resource_server_uris; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_uris
    ADD CONSTRAINT fk_resource_server_uris FOREIGN KEY (resource_id) REFERENCES public.resource_server_resource(id);


--
-- TOC entry 3636 (class 2606 OID 41536)
-- Name: role_attribute fk_role_attribute_id; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.role_attribute
    ADD CONSTRAINT fk_role_attribute_id FOREIGN KEY (role_id) REFERENCES public.keycloak_role(id);


--
-- TOC entry 3590 (class 2606 OID 40503)
-- Name: realm_supported_locales fk_supported_locales_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_supported_locales
    ADD CONSTRAINT fk_supported_locales_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- TOC entry 3576 (class 2606 OID 40365)
-- Name: user_federation_config fk_t13hpu1j94r2ebpekr39x5eu5; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_federation_config
    ADD CONSTRAINT fk_t13hpu1j94r2ebpekr39x5eu5 FOREIGN KEY (user_federation_provider_id) REFERENCES public.user_federation_provider(id);


--
-- TOC entry 3609 (class 2606 OID 40869)
-- Name: user_group_membership fk_user_group_user; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_group_membership
    ADD CONSTRAINT fk_user_group_user FOREIGN KEY (user_id) REFERENCES public.user_entity(id);


--
-- TOC entry 3616 (class 2606 OID 41052)
-- Name: policy_config fkdc34197cf864c4e43; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.policy_config
    ADD CONSTRAINT fkdc34197cf864c4e43 FOREIGN KEY (policy_id) REFERENCES public.resource_server_policy(id);


--
-- TOC entry 3589 (class 2606 OID 40483)
-- Name: identity_provider_config fkdc4897cf864c4e43; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.identity_provider_config
    ADD CONSTRAINT fkdc4897cf864c4e43 FOREIGN KEY (identity_provider_id) REFERENCES public.identity_provider(internal_id);


-- Completed on 2022-03-31 15:58:26 UTC

--
-- PostgreSQL database dump complete
--

