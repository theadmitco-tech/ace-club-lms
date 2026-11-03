-- Private content storage; existing buckets and policies retain their behavior.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('v2-course-content','v2-course-content',false,52428800,array['video/mp4','video/webm','application/pdf']);
-- Restrictive guards exclude the new bucket even when an older permissive policy is broad.
-- Upload tokens and server-authorized streaming use the service boundary.
create policy v2_private_content_no_browser_access on storage.objects as restrictive
for all to anon,authenticated using(bucket_id <> 'v2-course-content') with check(bucket_id <> 'v2-course-content');
commit;
