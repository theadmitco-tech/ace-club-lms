// Run on the verified PR #23 Preview as Admin, Student, then signed out of the LMS.
// Two POST requests send only {}. Reviewed handlers reject this before any write.
// Browser-managed authentication is used; cookies, storage and tokens are not read.
(async () => {
  // Verified against d3020c1; recheck the branch alias and handlers after any push.
  const allowedOrigins = new Set([
    'https://ace-club-a8go51h46-theadmitco-techs-projects.vercel.app',
    'https://ace-club-lms-git-intern-v2-onboarding-theadmitco-techs-projects.vercel.app',
  ]);
  const report = { check: 'phase1_admin_api_boundary', endpoints: [] };
  const finish = (result) => console.info(JSON.stringify({ ...report, result }, null, 2));
  if (!allowedOrigins.has(location.origin)) return finish('WRONG_PREVIEW');

  const endpoints = [
    { path: '/api/admin/set-user-active', validation: 'User ID and active state are required.' },
    { path: '/api/admin/session-materials', validation: 'A valid batch session and title are required.' },
  ];
  try {
    for (const endpoint of endpoints) {
      const response = await fetch(new URL(endpoint.path, location.origin).href, {
        method: 'POST', body: '{}', credentials: 'same-origin', redirect: 'error',
        cache: 'no-store', referrerPolicy: 'no-referrer',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
      const data = await response.json();
      let observation = 'UNEXPECTED_RESPONSE';
      if (response.status === 400 && data?.error === endpoint.validation) {
        observation = 'ADMIN_VALIDATION_REACHED';
      } else if (response.status === 403 && data?.error === 'Admin access required') {
        observation = 'NON_ADMIN_DENIED';
      } else if (response.status === 401 && data?.error === 'Authentication required') {
        observation = 'SIGNED_OUT_DENIED';
      }
      report.endpoints.push({ path: endpoint.path, http: response.status, observation });
      if (observation === 'UNEXPECTED_RESPONSE') return finish('REVIEW_REQUIRED');
    }
    const observations = new Set(report.endpoints.map((endpoint) => endpoint.observation));
    return finish(observations.size === 1 ? report.endpoints[0].observation : 'ROLE_RESULTS_DIFFER');
  } catch {
    return finish('REQUEST_FAILED');
  }
})();
