-- Dutch names for the categories created from the old topics (only where still empty)
UPDATE "Category" c SET "nameNl" = v.nl
FROM (VALUES
  ('AI Marketing', 'AI-marketing'),
  ('SEO', 'SEO'),
  ('Creators', 'Creators'),
  ('Video', 'Video'),
  ('Content Marketing', 'Contentmarketing'),
  ('Website Design', 'Websiteontwerp'),
  ('Paid Media', 'Betaalde media'),
  ('Businesses', 'Bedrijven'),
  ('Company Intro', 'Bedrijfsintroductie')
) AS v(en, nl)
WHERE c."name" = v.en AND c."nameNl" = '';

UPDATE "Author" SET "roleNl" = 'Head of Growth bij Finloa' WHERE "slug" = 'maya-collins' AND "roleNl" = '' AND "role" = 'Head of Growth at Finloa';
