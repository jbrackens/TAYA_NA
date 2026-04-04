-- TODO: Move to two column key
ALTER TABLE players DROP CONSTRAINT "players_clickId_fkey";

ALTER TABLE clicks RENAME TO old_nonpartitioned_clicks;

CREATE TABLE clicks
(
   id                serial,
   "linkId"          integer                  not null
       references links
           on delete cascade,
   "clickDate"       timestamp with time zone not null,
   "referralId"      varchar(255),
   segment           varchar(255),
   "queryParameters" json,
   "ipAddress"       inet                     not null,
   "userAgent"       text,
   referer           text,
   CONSTRAINT pk_affmore_clicks PRIMARY KEY ("id", "clickDate")
) partition by range ("clickDate");

CREATE INDEX ON clicks using BTREE ("linkId");
CREATE INDEX ON clicks using BRIN ("clickDate") with (pages_per_range = 32, autosummarize = on);

-- This date 2014-07-07 is hardcoded and is equal to the earliest click date in production
SELECT partman.create_parent( p_parent_table => 'public.clicks',
 p_control => 'clickDate',
 p_type => 'native',
 p_interval => 'monthly',
 p_start_partition => '2014-07-07');

UPDATE partman.part_config
    SET infinite_time_partitions = true
    WHERE parent_table = 'public.clicks';

--SELECT cron.schedule('@monthly', $$CALL partman.run_maintenance_proc()$$);

SET enable_partition_pruning = on;
