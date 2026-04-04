alter table logs rename column "attachmentUrl" TO attachments;
alter table logs alter column attachments type varchar(255)[] USING attachments::character varying(255)[];
alter table logs alter column attachments set not null;
alter table logs alter column attachments set default array[]::varchar[];
