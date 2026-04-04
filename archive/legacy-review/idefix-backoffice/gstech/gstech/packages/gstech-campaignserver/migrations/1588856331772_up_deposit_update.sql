alter table deposits rename column "playerId" to "externalPlayerId";
alter table deposits add column "convertedAmount" int not null;

alter table campaigns_deposits add column "playerConsent" boolean not null;
