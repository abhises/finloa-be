import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const plans = [
  {
    slug: "starter",
    name: "Starter",
    tagline: "1 video a week",
    priceCents: 29900,
    description: "For businesses starting a YouTube channel and building a steady rhythm.",
    ctaLabel: "Start with Starter",
    longVideos: 4,
    shorts: 4,
    featuresIntro: null,
    features: [
      "Editing, thumbnails, titles, descriptions and tags",
      "Uploads and scheduling on YouTube",
      "Monthly content calendar",
    ],
    popular: false,
    highlighted: false,
    sortOrder: 1,
  },
  {
    slug: "growth",
    name: "Growth",
    tagline: "2 videos a week + social",
    priceCents: 59900,
    description: "For brands ready to grow on YouTube and reuse every Short on TikTok.",
    ctaLabel: "Get Growth",
    longVideos: 8,
    shorts: 12,
    featuresIntro: "Everything in Starter, plus:",
    features: [
      "Shorts cross-posted to TikTok",
      "Keyword and topic research for every video",
      "Monthly performance report",
    ],
    popular: true,
    highlighted: true,
    sortOrder: 2,
  },
  {
    slug: "pro",
    name: "Pro",
    tagline: "3 videos a week + strategy",
    priceCents: 99900,
    description: "For teams that want a growth plan behind the content, not just more of it.",
    ctaLabel: "Get Pro",
    longVideos: 12,
    shorts: 24,
    featuresIntro: "Everything in Growth, plus:",
    features: ["Shorts cross-posted to Facebook", "Competitor and niche analysis"],
    popular: false,
    highlighted: false,
    sortOrder: 3,
  },
  {
    slug: "premium",
    name: "Premium",
    tagline: "Every weekday, fully managed",
    priceCents: 199900,
    description: "For companies that want a daily channel without managing a single step.",
    ctaLabel: "Get started",
    longVideos: 20,
    shorts: 40,
    featuresIntro: "Everything in Pro, plus:",
    features: [
      "Dedicated channel manager",
      "Comment and community management",
      "Priority turnaround",
      "Quarterly channel audit",
    ],
    popular: false,
    highlighted: false,
    sortOrder: 4,
  },
];

const posts: { slug: string; topic: string; title: string; readMinutes: number }[] = [
  { slug: "ai-workflows-save-ten-hours", topic: "AI Marketing", title: "Five AI workflows that save a marketing team ten hours a week", readMinutes: 6 },
  { slug: "get-cited-in-chatgpt-and-ai-overviews", topic: "SEO", title: "How to get your brand cited in ChatGPT and Google AI Overviews", readMinutes: 9 },
  { slug: "six-income-streams-for-creators", topic: "Creators", title: "Beyond ads and sponsors: six income streams for creators with 10k+ followers", readMinutes: 8 },
  { slug: "posting-shorts-youtube-tiktok-facebook", topic: "Video", title: "Posting Shorts on YouTube, TikTok and Facebook: what actually works", readMinutes: 5 },
  { slug: "content-that-ranks-and-gets-quoted", topic: "Content Marketing", title: "Writing content that ranks and gets quoted by AI tools", readMinutes: 5 },
  { slug: "redesign-without-losing-rankings", topic: "Website Design", title: "Redesigning your website without losing your search rankings", readMinutes: 6 },
  { slug: "first-1000-on-ads", topic: "Paid Media", title: "Where to spend your first $1,000 on ads", readMinutes: 7 },
  { slug: "adding-a-membership-to-your-business", topic: "Businesses", title: "Adding a membership or subscription to a profitable business", readMinutes: 8 },
];

/** Dutch category names for a fresh database */
const CATEGORY_NL: Record<string, string> = {
  "AI Marketing": "AI-marketing",
  SEO: "SEO",
  Creators: "Creators",
  Video: "Video",
  "Content Marketing": "Contentmarketing",
  "Website Design": "Websiteontwerp",
  "Paid Media": "Betaalde media",
  Businesses: "Bedrijven",
  "Company Intro": "Bedrijfsintroductie",
};

/** Homepage showreel (top of finloa.com) */
const SHOWREEL_YOUTUBE_ID = "wcGq9GSD1AE";

const samsungIntro = {
  slug: "samsung-business-intro",
  topic: "Company Intro",
  title: "Samsung Business Intro: devices, displays and security for companies.",
  excerpt: "A short introduction to Samsung Business: who they are, what they offer companies and who it is built for.",
  readMinutes: 4,
  videoLength: "2:48",
  tags: ["Company intro", "Samsung", "Technology"],
  faqs: [
    {
      q: "What is Samsung Business?",
      a: "Samsung Business is Samsung's offer for companies: mobile devices, displays, security and services built for work.",
    },
    {
      q: "Who is Samsung Business for?",
      a: "Small businesses, enterprises and public sector teams that need devices and displays they can deploy and manage at scale.",
    },
    {
      q: "What is Samsung Knox?",
      a: "Knox is Samsung's security platform built into its devices, with tools to deploy, manage and protect a company fleet.",
    },
  ],
  body: `Samsung Business is the part of Samsung that serves companies. It brings Samsung's phones, tablets, displays and security tools together in one offer built for work.

## Who they are

Samsung Electronics was founded in 1969 and is headquartered in Suwon, South Korea. Its business division helps organisations of every size choose, deploy and manage Samsung technology. Visit [Samsung Business](https://www.samsung.com/business/) for the full range.

## What they offer

### Mobile devices

Galaxy phones, tablets and wearables set up for business use.

### Displays

Monitors, digital signage and interactive displays for offices and stores.

### Knox security

Security built into the device, with tools to deploy and manage a fleet.

### Services and support

Enterprise editions, extended warranties and partner programs.

## Who it's for

Small businesses, enterprises and public sector teams that need devices and displays they can roll out and manage at scale. Want help presenting your own company like this? See our [video creation](/videos) and [SEO](/seo) services.`,
};

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({ where: { slug: plan.slug }, update: plan, create: plan });
  }
  console.log(`Seeded ${plans.length} plans`);

  // Categories and authors are create-only too: edits in the admin dashboard win
  const categoryId = async (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const c = await prisma.category.upsert({ where: { slug }, update: {}, create: { slug, name, nameNl: CATEGORY_NL[name] ?? "" } });
    return c.id;
  };
  const maya = await prisma.author.upsert({
    where: { slug: "maya-collins" },
    update: {},
    create: {
      slug: "maya-collins",
      name: "Maya Collins",
      role: "Head of Growth at Finloa",
      roleNl: "Head of Growth bij Finloa",
      bio: "Maya writes company intros and leads strategy for business accounts at Finloa.",
      bioNl: "Maya schrijft bedrijfsintroducties en leidt de strategie voor zakelijke klanten bij Finloa.",
    },
  });

  // Newest first in the list above, so stagger publish dates backwards by day
  const now = Date.now();
  for (const [i, { topic, ...post }] of posts.entries()) {
    const data = { ...post, categoryId: await categoryId(topic), publishedAt: new Date(now - i * 86_400_000) };
    // Create-only: edits made in the admin dashboard survive restarts and deploys
    await prisma.post.upsert({ where: { slug: post.slug }, update: {}, create: data });
  }
  const { topic, ...intro } = samsungIntro;
  await prisma.post.upsert({
    where: { slug: intro.slug },
    update: {},
    create: { ...intro, categoryId: await categoryId(topic), authorId: maya.id },
  });
  console.log(`Seeded ${posts.length + 1} posts`);

  // Only seeds the showreel once; after that it's managed in the admin dashboard
  const hasShowreel = await prisma.video.count({ where: { niche: "showreel" } });
  if (!hasShowreel) {
    await prisma.video.create({
      data: { niche: "showreel", kind: "LONG", youtubeId: SHOWREEL_YOUTUBE_ID, title: "Finloa showreel" },
    });
    console.log("Seeded homepage showreel");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
