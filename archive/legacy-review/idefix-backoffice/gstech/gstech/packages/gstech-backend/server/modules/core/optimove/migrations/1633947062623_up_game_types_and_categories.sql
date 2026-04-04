-- gstech.games
create table "GameTypesAndCategories" (
	-- games.id
  "GameID" serial primary key,
	-- games.name
  "GameName" varchar(200) not null,
	--? games.id -> (brand_game_profiles) <- game_profiles.id => game_profiles.name 
  "GameCategory" varchar(200)

  -- primary key ("GameID")
);

comment on column "GameTypesAndCategories"."GameID" is 'Game unique identifier';
comment on column "GameTypesAndCategories"."GameName" is 'Game name (e.g. Blackjack, Silver Dollar)';
comment on column "GameTypesAndCategories"."GameCategory" is 'Division of games into major categories (e.g. Slots, Roulette, Table, etc.)';