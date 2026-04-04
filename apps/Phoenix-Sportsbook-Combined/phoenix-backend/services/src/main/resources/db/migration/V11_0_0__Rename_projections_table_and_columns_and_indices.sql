ALTER TABLE "AKKA_PROJECTION_OFFSET_STORE" RENAME TO "akka_projection_offset_store";

ALTER TABLE akka_projection_offset_store RENAME COLUMN "PROJECTION_NAME" TO "projection_name";
ALTER TABLE akka_projection_offset_store RENAME COLUMN "PROJECTION_KEY" TO "projection_key";
ALTER TABLE akka_projection_offset_store RENAME COLUMN "CURRENT_OFFSET" TO "current_offset";
ALTER TABLE akka_projection_offset_store RENAME COLUMN "MANIFEST" TO "manifest";
ALTER TABLE akka_projection_offset_store RENAME COLUMN "MERGEABLE" TO "mergeable";
ALTER TABLE akka_projection_offset_store RENAME COLUMN "LAST_UPDATED" TO "last_updated";

ALTER INDEX "AKKA_PROJECTION_OFFSET_STORE_pkey" RENAME TO "akka_projection_offset_store_pkey";
ALTER INDEX "PROJECTION_NAME_INDEX" RENAME TO "projection_name_index";