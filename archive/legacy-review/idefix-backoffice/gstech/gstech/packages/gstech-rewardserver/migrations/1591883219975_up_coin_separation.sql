-- Reward type
alter table reward_definitions alter column "rewardType" type varchar(255);

-- Credit type
alter type credit_type rename to old_credit_type;

create type credit_type as enum('freeSpins', 'real', 'bonus', 'depositBonus', 'physical', 'wheelSpin', 'markka', 'iron', 'gold', 'lootBox');

alter table rewards alter column "creditType" type credit_type USING "creditType"::text::credit_type;

drop type old_credit_type;
