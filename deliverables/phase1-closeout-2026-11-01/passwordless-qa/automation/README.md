# Reviewed QA automation snapshot

Copied from the isolated checkout at application commit `155b3fbffc46db94be0fbee70b7b6fd9465a74b4`.
These scripts are evidence/tooling, not deployed application code. The named QA run is
cleaned up; do not rerun setup or use its deleted accounts. A future run needs new
owned fixtures, a private credential file and a verified staging Preview.

The repair builder reads only the additive portion of the reference metadata SQL.
Do not run the reference SQL directly: its historical heuristic UPDATE is deliberately
excluded from the reviewed repair. The applied operator file is `../03-CLEANUP-AND-REPAIR-EDITOR.sql`.
Tests run from the isolated checkout against its original migration and dependencies.
No credentials or session files are included.
