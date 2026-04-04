alter table subscription_options add column "playerId" int null;

insert into subscription_options ("playerId", emails, smses, "snoozeEmailsUntil", "snoozeSmsesUntil")
select
    players.id,
    case when players."allowEmailPromotions" = false then 'none' else 'all' end,
    case when players."allowSMSPromotions" = false then 'none' else 'all' end,
    null,
    null
from players
where "subscriptionOptionsId" is null;

update players
set "subscriptionOptionsId" = subscription_options.id
from subscription_options
where players.id = subscription_options."playerId";

alter table subscription_options drop column "playerId";