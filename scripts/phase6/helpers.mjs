import {bootstrap} from '../phase5/helpers.mjs';
export function bootstrapCandidate(db) {
  bootstrap(db);
  db.query("create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,bucket_id text);alter table storage.objects enable row level security;");
  for (const name of ['20261103090000_add_v2_content_publishing.sql','20261103091000_add_v2_private_content_storage.sql','20261103100000_fix_v2_content_readonly_previews.sql','20261103110000_fix_v2_content_conflict_responses.sql']) db.apply(name);
}
