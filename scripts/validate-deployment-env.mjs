const requiredVariables = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SITE_URL',
];

const deploymentEnvironment = process.env.VERCEL_ENV;

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

console.log(
  `Required ${deploymentEnvironment} environment variables are present and environment URLs are correctly separated.`,
);
