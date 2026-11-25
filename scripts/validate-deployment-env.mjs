const requiredVariables = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SITE_URL',
];

const deploymentEnvironment = process.env.VERCEL_ENV;

if (deploymentEnvironment && !['preview', 'production', 'development'].includes(deploymentEnvironment)) {
  console.error('Unknown Vercel environment; deployment refused.');
  process.exit(1);
}

if (!deploymentEnvironment) {
  console.log('Deployment environment validation skipped outside Vercel.');
  process.exit(0);
}

const missingVariables = requiredVariables.filter(
  (name) => !process.env[name]?.trim(),
);

if (missingVariables.length > 0) {
  console.error(
    `Missing required ${deploymentEnvironment} environment variables: ${missingVariables.join(', ')}`,
  );
  process.exit(1);
}

const expectedProjects = {
  preview: {
    supabaseHost: 'eyphkkginlgoaxflauog.supabase.co',
  },
  development: {
    supabaseHost: 'eyphkkginlgoaxflauog.supabase.co',
  },
  production: {
    supabaseHost: 'owmlxsnzogfapotmjrqk.supabase.co',
    siteOrigin: 'https://aceclub.theadmitco.com',
  },
};

const expected = expectedProjects[deploymentEnvironment];

if (expected) {
  let supabaseUrl;
  let siteUrl;

  try {
    supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL);
  } catch {
    console.error(
      `Invalid URL in the ${deploymentEnvironment} deployment environment.`,
    );
    process.exit(1);
  }

  const hasOriginOnly = (url) => !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash;
  const localSite = deploymentEnvironment === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(siteUrl.hostname);
  if (supabaseUrl.protocol !== 'https:' || supabaseUrl.port || !hasOriginOnly(supabaseUrl)
    || !hasOriginOnly(siteUrl) || (siteUrl.protocol !== 'https:' && !(localSite && siteUrl.protocol === 'http:'))) {
    console.error('Deployment URLs must be valid environment origins without credentials, paths, queries or fragments.');
    process.exit(1);
  }

  if (supabaseUrl.hostname !== expected.supabaseHost) {
    console.error(
      `Refusing ${deploymentEnvironment} build: NEXT_PUBLIC_SUPABASE_URL targets the wrong Supabase project.`,
    );
    process.exit(1);
  }

  if (expected.siteOrigin && siteUrl.origin !== expected.siteOrigin) {
    console.error(
      `Refusing Production build: NEXT_PUBLIC_SITE_URL must be ${expected.siteOrigin}.`,
    );
    process.exit(1);
  }
}

const productionSite = expectedProjects.production.siteOrigin;
if (deploymentEnvironment !== 'production') {
  if (new URL(process.env.NEXT_PUBLIC_SITE_URL).origin === productionSite
    || process.env.V2_CHECKOUT_LIVE_ENABLED === 'true' || process.env.V2_PRODUCTION_RELEASE_ENABLED === 'true'
    || Object.entries(process.env).some(([key, value]) => key.startsWith('V2_RAZORPAY_LIVE_') && value?.trim())) {
    console.error('Production origins, release flags and V2 Live Mode credentials are excluded from Preview and development.');
    process.exit(1);
  }
  if (process.env.V2_RAZORPAY_TEST_KEY_ID?.trim() && !/^rzp_test_[A-Za-z0-9]+$/.test(process.env.V2_RAZORPAY_TEST_KEY_ID)) {
    console.error('The V2 Test Mode key identifier is invalid.');
    process.exit(1);
  }
  if (process.env.V2_CHECKOUT_TEST_ENABLED === 'true'
    && (!/^rzp_test_[A-Za-z0-9]+$/.test(process.env.V2_RAZORPAY_TEST_KEY_ID ?? '')
      || (process.env.V2_RAZORPAY_TEST_KEY_SECRET?.trim().length ?? 0) < 16
      || (process.env.V2_RAZORPAY_TEST_WEBHOOK_SECRET?.trim().length ?? 0) < 32)) {
    console.error('Enabled V2 Test Mode checkout requires its dedicated API and webhook configuration.');
    process.exit(1);
  }
} else {
  const releaseFlag = process.env.V2_PRODUCTION_RELEASE_ENABLED;
  const featureFlags = ['V2_TEMPLATE_AUTHORING_ENABLED', 'V2_BATCH_AUTHORING_ENABLED', 'V2_STUDENT_SCHEDULE_ENABLED',
    'V2_LEARNING_DELIVERY_ENABLED', 'V2_CONTENT_PUBLISHING_ENABLED'];
  if (releaseFlag !== undefined && releaseFlag !== '' && releaseFlag !== 'true' && releaseFlag !== 'false') {
    console.error('V2_PRODUCTION_RELEASE_ENABLED must be exactly true or false.');
    process.exit(1);
  }
  // Test Mode checkout never runs in Production. Live checkout is refused until its reviewed implementation exists.
  if (process.env.V2_CHECKOUT_TEST_ENABLED === 'true' || process.env.V2_CHECKOUT_LIVE_ENABLED === 'true'
    || Object.entries(process.env).some(([key, value]) => key.startsWith('V2_RAZORPAY_TEST_') && value?.trim())) {
    console.error('V2 Test Mode checkout is excluded from Production, and V2 Live Mode checkout is not yet implemented.');
    process.exit(1);
  }
  // Feature flags alone cannot authorize a release; they take effect only with the master release flag.
  if (releaseFlag !== 'true' && featureFlags.some(key => process.env[key] === 'true')) {
    console.error('V2 feature flags require V2_PRODUCTION_RELEASE_ENABLED=true in Production; Preview flags cannot authorize a release.');
    process.exit(1);
  }
}

console.log(
  `Required ${deploymentEnvironment} environment variables are present and environment URLs are correctly separated.`,
);
