alter table rewards drop column "oncePerPlayer";

alter table rewards alter column "order" set not null;

alter table rewards add constraint "freeSpinsData" check("creditType" <> 'freeSpins' or ("bonusCode" is not null and game is not null and spins is not null));
alter table rewards add constraint "realOrBonusData" check(("creditType" <> 'real' and "creditType" <> 'bonus') or "bonusCode" is not null);
alter table rewards add constraint "currencyData" check("currency" is null or "price" is not null);
