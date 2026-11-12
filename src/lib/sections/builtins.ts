import { parseYoutubeId } from "../../routes/videos";
import type { FieldDef } from "./fields";

/**
 * Built-in section types. They are synced into the SectionType table on startup and are locked in the admin
 * (duplicate one to customise it). Their styling lives in finloa-fe/src/app/globals.css (.post-body …), so `css`
 * stays empty. Bump `version` whenever a template or field list changes; posts using the type are then re-rendered.
 */
export type Builtin = {
  key: string;
  name: string;
  group: string;
  description: string;
  version: number;
  fields: FieldDef[];
  template: string;
  sample: Record<string, unknown>;
  /** Code-only extra step before rendering (custom types can't have one). */
  prepare?: (data: Record<string, unknown>, post: Record<string, unknown>) => void;
};

const heading: FieldDef = { key: "heading", label: "Heading", type: "text", help: "Shown as a large heading and listed in the contents. Optional." };
const headingTpl = "{{#heading}}<h2>{{heading}}</h2>{{/heading}}";

export const BUILTINS: Builtin[] = [
  {
    key: "text",
    name: "Text",
    group: "Text",
    version: 1,
    description: "A heading with paragraphs. Rich text: bold, italic and links.",
    fields: [heading, { key: "body", label: "Text", type: "richtext" }],
    template: `${headingTpl}\n{{{body}}}`,
    sample: {
      heading: "Why an emergency fund comes first",
      body: "An emergency fund keeps a surprise bill from turning into debt.\n\nMost advisers suggest <strong>three to six months</strong> of essential costs.",
    },
  },
  {
    key: "markdown",
    name: "Text (Markdown)",
    group: "Text",
    version: 1,
    description: "Longer text written in Markdown: ## headings, lists, links, images and > quotes.",
    fields: [
      {
        key: "text",
        label: "Markdown",
        type: "markdown",
        help: "## Heading (listed in the contents), ### Sub-heading, **bold**, [link](https://…), ![alt](image URL), - list, > quote.",
      },
    ],
    template: "{{{text}}}",
    sample: { text: "## A heading\n\nA paragraph with **bold** text and a [link](https://finloa.com).\n\n- First point\n- Second point" },
  },
  {
    key: "heading",
    name: "Heading",
    group: "Text",
    version: 1,
    description: "A heading on its own. H2 headings are listed in the contents.",
    fields: [
      { key: "text", label: "Heading", type: "text", required: true },
      { key: "level", label: "Size", type: "select", options: ["H2", "H3"], default: "H2", help: "H2 is listed in the contents; H3 is a sub-heading." },
    ],
    prepare: (d) => {
      d.h2 = d.level !== "H3";
    },
    template: "{{#h2}}<h2>{{text}}</h2>{{/h2}}{{^h2}}<h3>{{text}}</h3>{{/h2}}",
    sample: { text: "How much should you save?", level: "H2" },
  },
  {
    key: "image",
    name: "Image",
    group: "Media",
    version: 1,
    description: "A photo or chart with an optional caption.",
    fields: [
      { key: "image", label: "Image", type: "image", required: true },
      { key: "alt", label: "Alt text", type: "text", help: "Describes the image for screen readers and search engines." },
      { key: "caption", label: "Caption", type: "text" },
    ],
    template: `<figure class="fl-figure">{{#image}}<img src="{{image}}" alt="{{alt}}" loading="lazy">{{/image}}{{#caption}}<figcaption>{{caption}}</figcaption>{{/caption}}</figure>`,
    sample: { image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200", alt: "Calculator and notes", caption: "Plan the month before it starts." },
  },
  {
    key: "video",
    name: "YouTube video",
    group: "Media",
    version: 2,
    description: "An extra YouTube video inside the article. The post's main video is set in the post settings.",
    fields: [
      { key: "youtube", label: "YouTube link", type: "link", required: true, placeholder: "https://youtu.be/…" },
      { key: "title", label: "Title", type: "text", help: "For screen readers." },
      { key: "caption", label: "Caption", type: "text" },
    ],
    prepare: (d) => {
      d.videoId = parseYoutubeId(String(d.youtube ?? "")) ?? "";
      if (!d.title) d.title = "Video";
    },
    template: `{{#videoId}}<figure class="fl-video"><div class="fl-video__frame"><iframe src="https://www.youtube-nocookie.com/embed/{{videoId}}?rel=0" title="{{title}}" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>{{#caption}}<figcaption>{{caption}}</figcaption>{{/caption}}</figure>{{/videoId}}`,
    sample: { youtube: "", caption: "A short walkthrough." },
  },
  {
    key: "quote",
    name: "Quote",
    group: "Text",
    version: 1,
    description: "A large dark quote block with an optional name.",
    fields: [
      { key: "text", label: "Quote", type: "textarea", required: true },
      { key: "cite", label: "Who said it", type: "text", placeholder: "Name, role" },
    ],
    template: `<blockquote><p>{{text}}</p>{{#cite}}<footer>— {{cite}}</footer>{{/cite}}</blockquote>`,
    sample: { text: "Pay yourself first, then spend what is left.", cite: "Finloa team" },
  },
  {
    key: "cards",
    name: "Cards",
    group: "Layout",
    version: 1,
    description: "A grid of small cards with a title and a short text each.",
    fields: [
      heading,
      { key: "intro", label: "Intro", type: "richtext" },
      {
        key: "items",
        label: "Cards",
        type: "list",
        itemLabel: "{{title}}",
        fields: [
          { key: "title", label: "Title", type: "text", required: true },
          { key: "text", label: "Text", type: "textarea" },
        ],
      },
    ],
    template: `${headingTpl}\n{{{intro}}}\n<div class="post-cards">{{#items}}<div class="post-card"><h3>{{title}}</h3>{{#text}}<p>{{text}}</p>{{/text}}</div>{{/items}}</div>`,
    sample: {
      heading: "Three accounts to set up",
      items: [
        { title: "Everyday", text: "Bills and spending. Your salary lands here." },
        { title: "Buffer", text: "Three to six months of costs, easy to reach." },
        { title: "Goals", text: "Savings for the next big thing, out of sight." },
      ],
    },
  },
  {
    key: "steps",
    name: "Steps",
    group: "Layout",
    version: 1,
    description: "Numbered steps, for how-tos and checklists.",
    fields: [
      heading,
      {
        key: "items",
        label: "Steps",
        type: "list",
        itemLabel: "{{title}}",
        fields: [
          { key: "title", label: "Title", type: "text", required: true },
          { key: "text", label: "Text", type: "richtext" },
        ],
      },
    ],
    template: `${headingTpl}\n<ol class="fl-steps">{{#items}}<li><span class="fl-steps__n">{{@n}}</span><div><h3>{{title}}</h3>{{{text}}}</div></li>{{/items}}</ol>`,
    sample: {
      heading: "Set up your budget in four steps",
      items: [
        { title: "List your income", text: "Use your net pay after tax." },
        { title: "Add fixed costs", text: "Rent, insurance, subscriptions." },
        { title: "Pick a savings rate", text: "Start with 10% and raise it later." },
        { title: "Automate it", text: "Move the money on payday." },
      ],
    },
  },
  {
    key: "stats",
    name: "Key figures",
    group: "Layout",
    version: 1,
    description: "Two to four big numbers with a short label each.",
    fields: [
      heading,
      {
        key: "items",
        label: "Figures",
        type: "list",
        itemLabel: "{{value}} · {{label}}",
        fields: [
          { key: "value", label: "Number", type: "text", required: true, placeholder: "68%" },
          { key: "label", label: "Label", type: "text" },
        ],
      },
      { key: "source", label: "Source", type: "text" },
    ],
    template: `${headingTpl}\n<div class="fl-stats">{{#items}}<div class="fl-stat"><b>{{value}}</b><span>{{label}}</span></div>{{/items}}</div>{{#source}}<p class="fl-note">Source: {{source}}</p>{{/source}}`,
    sample: {
      items: [
        { value: "3–6", label: "months of costs in your buffer" },
        { value: "10%", label: "of income saved to start" },
        { value: "50/30/20", label: "needs, wants, savings" },
      ],
    },
  },
  {
    key: "table",
    name: "Table",
    group: "Data",
    version: 1,
    description: "A comparison table. Separate cells with |; end a value with * to highlight it.",
    fields: [
      heading,
      { key: "columns", label: "Column headings", type: "cells", placeholder: "Account | Interest | Access" },
      { key: "rows", label: "Rows", type: "list", itemLabel: "{{cells}}", fields: [{ key: "cells", label: "Cells", type: "cells", placeholder: "Savings | 2.5%* | Any time" }] },
      { key: "note", label: "Note under the table", type: "text" },
    ],
    template: `${headingTpl}\n<div class="fl-table"><table><thead><tr>{{#columns}}<th>{{value}}</th>{{/columns}}</tr></thead><tbody>{{#rows}}<tr>{{#cells}}<td{{#best}} class="is-best"{{/best}}>{{value}}</td>{{/cells}}</tr>{{/rows}}</tbody></table></div>{{#note}}<p class="fl-note">{{note}}</p>{{/note}}`,
    sample: {
      columns: "Account | Interest | Access",
      rows: [{ cells: "Savings | 2.5%* | Any time" }, { cells: "Deposit | 3.1% | After 1 year" }],
    },
  },
  {
    key: "callout",
    name: "Callout",
    group: "Highlights",
    version: 2,
    description: "A coloured box for a tip, a note or a warning.",
    fields: [
      { key: "tone", label: "Type", type: "select", options: ["Tip", "Info", "Warning"], default: "Tip" },
      { key: "title", label: "Title", type: "text" },
      { key: "text", label: "Text", type: "richtext", required: true },
    ],
    prepare: (d) => {
      d.toneClass = String(d.tone || "Tip").toLowerCase();
    },
    template: `{{#text}}<aside class="fl-callout fl-callout--{{toneClass}}">{{#title}}<strong class="fl-callout__title">{{title}}</strong>{{/title}}{{{text}}}</aside>{{/text}}`,
    sample: { tone: "Tip", title: "Tip", text: "Name your savings accounts after the goal. People save more when the goal is visible." },
  },
  {
    key: "cta",
    name: "Call to action",
    group: "Highlights",
    version: 1,
    description: "A blue box with a short pitch and a button.",
    fields: [
      { key: "heading", label: "Heading", type: "text", default: "Want a plan that fits you?" },
      { key: "text", label: "Text", type: "textarea" },
      { key: "buttonLabel", label: "Button text", type: "text", default: "Talk to us" },
      { key: "buttonUrl", label: "Button link", type: "link", default: "/#goals" },
    ],
    template: `<div class="fl-cta"><div>{{#heading}}<h3>{{heading}}</h3>{{/heading}}{{#text}}<p>{{text}}</p>{{/text}}</div>{{#buttonUrl}}<a class="fl-cta__btn" href="{{buttonUrl}}">{{buttonLabel}}</a>{{/buttonUrl}}</div>`,
    sample: { heading: "Want a plan that fits you?", text: "Tell us your goals and we'll come back with next steps.", buttonLabel: "Talk to us", buttonUrl: "/#goals" },
  },
  {
    key: "related",
    name: "Read next",
    group: "Highlights",
    version: 1,
    description: "A card linking to another blog post.",
    fields: [
      { key: "label", label: "Label", type: "text", default: "Read next" },
      { key: "article", label: "Post", type: "post", required: true },
    ],
    prepare: (d, post) => {
      const a = d.article as Record<string, unknown> | null;
      if (a && post.lang === "nl") a.title = a.titleNl;
    },
    template: `{{#article}}<a class="fl-related" href="{{url}}">{{#coverImage}}<img src="{{coverImage}}" alt="" loading="lazy">{{/coverImage}}<span><small>{{label}}</small><b>{{title}}</b>{{#excerpt}}<span>{{excerpt}}</span>{{/excerpt}}</span></a>{{/article}}`,
    sample: { label: "Read next" },
  },
  {
    key: "divider",
    name: "Divider",
    group: "Layout",
    version: 1,
    description: "A thin line between parts of the article.",
    fields: [],
    template: "<hr>",
    sample: {},
  },
  {
    key: "custom-html",
    name: "Custom HTML",
    group: "Advanced",
    version: 1,
    description: "Any HTML. Use it for one-off layouts; style it in the post's CSS tab.",
    fields: [{ key: "html", label: "HTML", type: "code" }],
    template: "{{{html}}}",
    sample: { html: '<p class="my-note">Custom HTML</p>' },
  },
];

export const BUILTIN_BY_KEY = new Map(BUILTINS.map((b) => [b.key, b]));
