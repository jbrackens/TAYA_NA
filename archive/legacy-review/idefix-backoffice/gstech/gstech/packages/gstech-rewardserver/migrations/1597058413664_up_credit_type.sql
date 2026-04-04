alter table rewards drop constraint "freeSpinsData";
alter table rewards drop constraint "realOrBonusData";
alter table rewards drop constraint "currencyData";

alter table rewards alter column "creditType" type varchar(255) USING "creditType"::text;
drop type credit_type;

alter table rewards add constraint "freeSpinsData" check("creditType" <> 'freeSpins' or ("bonusCode" is not null and "gameId" is not null and spins is not null));
alter table rewards add constraint "realOrBonusData" check(("creditType" <> 'real' and "creditType" <> 'bonus') or "bonusCode" is not null);
alter table rewards add constraint "currencyData" check("currency" is null or "price" is not null);
