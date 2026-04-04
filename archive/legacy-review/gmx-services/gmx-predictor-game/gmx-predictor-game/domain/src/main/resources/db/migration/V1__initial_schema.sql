create table events (
  id                            varchar(22) not null,
  home_team_name                varchar(255) not null,
  home_team_id                  varchar(255) not null,
  away_team_name                varchar(255) not null,
  away_team_id                  varchar(255) not null,
  start_time                    timestamptz not null,
  status                        varchar(255) not null,
  round_no                      integer not null,
  home_team_score               integer,
  away_team_score               integer,
  winner                        varchar(255),
  constraint pk_events primary key (id)
);

create table users (
  id                            varchar(22) not null,
  oidc_sub                      varchar(255) not null,
  external_id                   varchar(255),
  partner_id                    varchar(255) not null,
  constraint pk_users primary key (id)
);

create table user_predictions (
  id                            varchar(22) not null,
  user_id                       varchar(22) not null,
  round_no                      integer not null,
  score                         integer,
  locked                        boolean default false not null,
  constraint pk_user_predictions primary key (id)
);

alter table user_predictions add constraint fk_user_predictions_user_id foreign key (user_id) references users (id) on delete restrict on update restrict;
create index ix_user_predictions_user_id on user_predictions (user_id);

create table event_predictions (
  id                            varchar(22) not null,
  prediction_id                 varchar(22) not null,
  event_id                      varchar(22) not null,
  selection                     varchar(255) not null,
  index                         integer not null,
  locked                        boolean default false not null,
  constraint pk_event_predictions primary key (id)
);

alter table event_predictions add constraint fk_event_predictions_prediction_id foreign key (prediction_id) references user_predictions (id) on delete restrict on update restrict;
create index ix_event_predictions_prediction_id on event_predictions (prediction_id);
alter table event_predictions add constraint fk_event_predictions_event_id foreign key (event_id) references events (id) on delete restrict on update restrict;
create index ix_event_predictions_event_id on event_predictions (event_id);
