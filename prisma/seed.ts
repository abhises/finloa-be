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

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({ where: { slug: plan.slug }, update: plan, create: plan });
  }
  console.log(`Seeded ${plans.length} plans`);

  // Newest first in the list above, so stagger publish dates backwards by day
  const now = Date.now();
  for (const [i, post] of posts.entries()) {
    const data = { ...post, publishedAt: new Date(now - i * 86_400_000) };
    await prisma.post.upsert({ where: { slug: post.slug }, update: data, create: data });
  }
  console.log(`Seeded ${posts.length} posts`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
