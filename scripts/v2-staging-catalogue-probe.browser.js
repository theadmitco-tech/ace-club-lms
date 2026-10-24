// Run in the verified PR Preview's browser console. All requests use GET.
// Public API keys stay in memory; session cookies and browser storage are not read.
// Only fixed diagnostic fields are printed. No purchase or student data is queried.
(async () => {
  // PR #23 branch link verified at d3020c1; recheck its source after any push.
  const allowedOrigins = new Set([
    'https://ace-club-a8go51h46-theadmitco-techs-projects.vercel.app',
    'https://ace-club-lms-git-intern-v2-onboarding-theadmitco-techs-projects.vercel.app',
  ]);
  const previewOrigin = location.origin;
  const projectRef = 'eyphkkginlgoaxflauog';
  const stagingOrigin = `https://${projectRef}.supabase.co`;
  const report = { check: 'phase1_public_catalogue', catalogue: 'NOT_RUN', quote: 'NOT_RUN' };
  const finish = (result) => console.info(JSON.stringify({ ...report, result }, null, 2));

  try {
    if (!allowedOrigins.has(previewOrigin)) return finish('WRONG_PREVIEW');

    const resources = performance.getEntriesByType('resource')
      .map((entry) => new URL(entry.name, location.origin));
    const backendOrigins = new Set(resources
      .filter((url) => url.hostname.endsWith('.supabase.co')).map((url) => url.origin));
    if (backendOrigins.size !== 1 || !backendOrigins.has(stagingOrigin)) {
      return finish('STAGING_CONNECTION_NOT_OBSERVED_RELOAD_AND_RETRY');
    }

    const scriptUrls = [...new Set([
      ...Array.from(document.querySelectorAll('script[src]'), (script) => script.src),
      ...resources.map((url) => url.href),
    ].map((value) => new URL(value, location.origin))
      .filter((url) => url.origin === previewOrigin
        && url.pathname.startsWith('/_next/static/') && url.pathname.endsWith('.js'))
      .map((url) => url.href))];

    const signal = AbortSignal.timeout(20_000);
    let publicKey;
    for (const url of scriptUrls.slice(0, 64)) {
      if (signal.aborted) break;
      let source;
      try {
        const response = await fetch(url, {
          method: 'GET', credentials: 'same-origin', redirect: 'error',
          cache: 'force-cache', signal,
        });
        if (!response.ok) continue;
        source = await response.text();
      } catch {
        continue;
      }
      if (source.length > 2_000_000) continue;

      const candidates = new Set();
      for (const match of source.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
        try {
          const payload = match[0].split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
          const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
          if (claims.role === 'anon' && claims.ref === projectRef) candidates.add(match[0]);
        } catch {
          // Non-configuration strings are ignored without logging their contents.
        }
      }
      if (source.includes(stagingOrigin)) {
        for (const match of source.matchAll(/sb_publishable_[A-Za-z0-9_-]{16,512}/g)) {
          candidates.add(match[0]);
        }
      }
      if (candidates.size > 1) return finish('AMBIGUOUS_PUBLIC_CONFIGURATION');
      if (candidates.size === 1) {
        [publicKey] = candidates;
        break;
      }
    }
    if (!publicKey) return finish('PUBLIC_CONFIGURATION_NOT_FOUND');

    const options = {
      method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store',
      referrerPolicy: 'no-referrer',
      headers: { apikey: publicKey, Accept: 'application/json' },
    };
    if (publicKey.startsWith('eyJ')) options.headers.Authorization = `Bearer ${publicKey}`;
    const knownErrorCodes = new Set(['PGRST202', 'PGRST205', '42P01', '42501', '22023']);
    const errorCode = (data) => knownErrorCodes.has(data?.code) ? data.code : 'UNCLASSIFIED';
    const catalogueUrl = new URL('/rest/v1/v2_products', stagingOrigin);
    catalogueUrl.search = new URLSearchParams({
      select: 'code,product_kind,sections', order: 'code', limit: '5',
    }).toString();
    const catalogueResponse = await fetch(catalogueUrl.href, {
      ...options, signal: AbortSignal.timeout(10_000),
    });
    report.catalogue_http = catalogueResponse.status;
    const catalogue = await catalogueResponse.json();
    if (!catalogueResponse.ok) {
      report.catalogue = errorCode(catalogue);
      return finish('CATALOGUE_UNAVAILABLE');
    }

    const expected = [
      { code: 'di_crash', product_kind: 'crash_course', sections: ['di'] },
      { code: 'full_batch', product_kind: 'full_batch', sections: ['quant', 'verbal', 'di'] },
      { code: 'quant_crash', product_kind: 'crash_course', sections: ['quant'] },
      { code: 'verbal_crash', product_kind: 'crash_course', sections: ['verbal'] },
    ];
    const matches = Array.isArray(catalogue) && catalogue.length === expected.length
      && expected.every((product, index) => product.code === catalogue[index]?.code
        && product.product_kind === catalogue[index]?.product_kind
        && JSON.stringify(product.sections) === JSON.stringify(catalogue[index]?.sections));
    report.catalogue = matches ? 'FOUR_PRODUCTS_MATCH' : 'CATALOGUE_DIFFERS';
    if (!matches) return finish('REVIEW_CATALOGUE_CONFIGURATION');

    const quoteUrl = new URL('/rest/v1/rpc/quote_v2_products', stagingOrigin);
    quoteUrl.search = new URLSearchParams({ p_product_codes: '{full_batch}' }).toString();
    const quoteResponse = await fetch(quoteUrl.href, {
      ...options, signal: AbortSignal.timeout(10_000),
    });
    report.quote_http = quoteResponse.status;
    const quote = await quoteResponse.json();
    if (!quoteResponse.ok) {
      report.quote = errorCode(quote);
      return finish('QUOTE_UNAVAILABLE');
    }
    const quoteMatches = quote?.currency === 'INR' && quote?.amount_paise === 2_500_000
      && Array.isArray(quote?.product_codes) && quote.product_codes.length === 1
      && quote.product_codes[0] === 'full_batch';
    report.quote = quoteMatches ? 'FULL_BATCH_INR_25000' : 'QUOTE_DIFFERS';
    return finish(quoteMatches ? 'PUBLIC_CHECKS_PASSED' : 'REVIEW_PRICE_CONFIGURATION');
  } catch {
    return finish('READ_FAILED');
  }
})();
