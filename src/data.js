export const C = { violet: "#7C3AED", mint: "#34D399", amber: "#F59E0B", sky: "#38BDF8", rose: "#FB7185", lime: "#A3E635" };

export const SOURCES = [
  /* Vibe coding — the reason most of this list exists now. Kept first
     because it is what the site is mainly about. */
  { id: "willison",   name: "Simon Willison",        url: "https://simonwillison.net/atom/everything/",            tag: "vibe coding", color: C.lime },
  { id: "latent",     name: "Latent Space",          url: "https://www.latent.space/feed",                         tag: "vibe coding", color: C.lime },
  { id: "cursor",     name: "Cursor Changelog",      url: "https://cursor.com/changelog/rss.xml",                  tag: "vibe coding", color: C.lime },
  { id: "ghchange",   name: "GitHub Changelog",      url: "https://github.blog/changelog/feed/",                   tag: "vibe coding", color: C.lime },
  { id: "srcgraph",   name: "Sourcegraph",           url: "https://sourcegraph.com/blog/rss.xml",                  tag: "vibe coding", color: C.lime },
  { id: "hnvibe",     name: "HN · Vibe coding",     url: "https://hnrss.org/newest?q=vibe+coding&points=20",       tag: "vibe coding", color: C.lime },
  { id: "hnaireview", name: "HN · AI code review",  url: "https://hnrss.org/newest?q=AI+code+review&points=20",    tag: "vibe coding", color: C.lime },

  // Open source & maintainership
  { id: "github",     name: "GitHub Blog",           url: "https://github.blog/feed/",                             tag: "open source", color: C.violet },
  { id: "gitlab",     name: "GitLab",                url: "https://about.gitlab.com/atom.xml",                     tag: "open source", color: C.violet },
  { id: "googleoss",  name: "Google Open Source",    url: "https://feeds.feedburner.com/GoogleOpenSourceBlog",     tag: "open source", color: C.violet },
  { id: "osi",        name: "Open Source Initiative",url: "https://opensource.org/feed",                           tag: "open source", color: C.violet },
  { id: "lfoss",      name: "Linux Foundation",      url: "https://www.linuxfoundation.org/blog/rss.xml",          tag: "open source", color: C.violet },
  { id: "fossforce",  name: "FOSS Force",            url: "https://fossforce.com/feed/",                           tag: "open source", color: C.violet },

  // Engineering practice
  { id: "fowler",     name: "Martin Fowler",         url: "https://martinfowler.com/feed.atom",                    tag: "practice", color: C.mint },
  { id: "pragmatic",  name: "Pragmatic Engineer",    url: "https://blog.pragmaticengineer.com/rss/",               tag: "practice", color: C.mint },
  { id: "sooblog",    name: "Stack Overflow Blog",   url: "https://stackoverflow.blog/feed/",                      tag: "practice", color: C.mint },
  { id: "infoq",      name: "InfoQ",                 url: "https://feed.infoq.com/",                               tag: "practice", color: C.mint },
  { id: "changelog",  name: "The Changelog",         url: "https://changelog.com/feed",                            tag: "practice", color: C.mint },
  { id: "thoughtworks",name:"Thoughtworks Insights", url: "https://www.thoughtworks.com/rss/insights.xml",         tag: "practice", color: C.mint },
  { id: "honeycomb",  name: "Honeycomb",             url: "https://www.honeycomb.io/feed",                         tag: "practice", color: C.mint },
  { id: "increment",  name: "Kent Beck",             url: "https://tidyfirst.substack.com/feed",                   tag: "practice", color: C.mint },

  // Team culture & remote work
  { id: "hey",        name: "DHH / HEY World",       url: "https://world.hey.com/dhh/feed.atom",                   tag: "team culture", color: C.amber },
  { id: "atlassian",  name: "Atlassian Work Life",   url: "https://www.atlassian.com/blog/feed",                   tag: "team culture", color: C.amber },
  { id: "doist",      name: "Doist / Ambition",      url: "https://blog.doist.com/rss/",                           tag: "team culture", color: C.amber },
  { id: "charity",    name: "Charity Majors",        url: "https://charity.wtf/feed/",                             tag: "team culture", color: C.amber },
  { id: "rands",      name: "Rands in Repose",       url: "https://randsinrepose.com/feed/",                       tag: "team culture", color: C.amber },
  { id: "leaddev",    name: "LeadDev",               url: "https://leaddev.com/rss.xml",                           tag: "team culture", color: C.amber },
  { id: "irrational", name: "Irrational Exuberance", url: "https://lethain.com/feeds/",                            tag: "team culture", color: C.amber },

  // Community firehose
  { id: "devto",      name: "DEV Community",         url: "https://dev.to/feed",                                   tag: "community", color: C.sky },
  { id: "hn",         name: "Hacker News",           url: "https://hnrss.org/frontpage?points=150",                tag: "community", color: C.sky },
  { id: "lobsters",   name: "Lobsters",              url: "https://lobste.rs/rss",                                 tag: "community", color: C.sky },
  { id: "smashing",   name: "Smashing Magazine",     url: "https://www.smashingmagazine.com/feed/",                tag: "community", color: C.sky },
  { id: "hnopen",     name: "HN · Open Source",      url: "https://hnrss.org/newest?q=open+source&points=40",      tag: "community", color: C.sky },
  { id: "hncollab",   name: "HN · Collaboration",    url: "https://hnrss.org/newest?q=collaboration&points=20",    tag: "community", color: C.sky },

  // Tools & platforms
  { id: "vscode",     name: "VS Code Releases",      url: "https://code.visualstudio.com/feed.xml",                tag: "tooling", color: C.rose },
  { id: "linear",     name: "Linear Changelog",      url: "https://linear.app/rss/changelog.xml",                  tag: "tooling", color: C.rose },
  { id: "replit",     name: "Replit Blog",           url: "https://blog.replit.com/feed.xml",                      tag: "tooling", color: C.rose },
];

export const TAGS = ["all", "vibe coding", "practice", "open source", "team culture", "community", "tooling"];

export const COLLAB_TERMS = [
  /* Vibe-coding vocabulary first: the "collab only" filter scored for standups
     and retros while the field argued about agents, so the articles most
     relevant to this site were the ones it ranked lowest. */
  "vibe cod","agentic","coding agent","ai-generated","ai generated","llm","copilot",
  "cursor","claude code","prompt","context window","hallucinat","review debt","provenance",
  "spec-driven","eval","autocomplete","pair with","model wrote","generated code",

  "collaborat","pair program","mob program","ensemble","code review","open source","contributor",
  "team","remote work","async","pull request","rfc","community","maintainer","onboarding",
  "documentation","handoff","distributed team","standup","retro","knowledge sharing","mentor",
  "pairing","coauthor","co-author","fork","governance","working group","bus factor","code owner",
  "monorepo","trunk-based","postmortem","design doc","adr","hackathon","peer review","feedback",
];

/* Feed fetch strategy, tried in order.
   1. /api/feed  — our own Netlify Edge Function (fast, cached, no rate limit)
   2..4          — public CORS proxies, used only if the edge function is absent
                   (e.g. a plain static drop with no functions enabled) */
/* Route feed thumbnails through our own /api/img edge function so the
   visitor's browser never contacts third-party image CDNs.

   IMPORTANT: /api/img only exists when the edge functions actually deployed,
   which requires a build step. On a drag-and-drop deploy it 404s — and if we
   trusted the proxy blindly, EVERY thumbnail would fail and the feed would
   show nothing but gradients. So this degrades: proxy first, direct on
   failure. Privacy when we can, images always.

   Set to false to skip the proxy entirely and always load direct. */
/* The hero slot cycles through these. Names that do not exist yet are simply
   skipped — drop a file in and it joins the rotation on the next deploy, with
   no code change. Prompts for the unbuilt ones are in ART-PROMPTS-8.2.md. */
export const HERO_ART = [
  "/art/hero.jpg",

  // Purpose-made hero art. Prompts are in ART-PROMPTS-8.2.md; these names do
  // not exist yet and are skipped until they do.
  "/art/hero-2.jpg",
  "/art/hero-3.jpg",
  "/art/hero-4.jpg",
  "/art/hero-5.jpg",

  // Standing in meanwhile: two renders already in the site's own art, same
  // documentary look and the same palette. They double as section headers on
  // Board and Toolbox, so the hero repeats them until the four above land —
  // which is still better than a hero that never changes. Delete these two
  // lines once hero-2 and hero-3 exist.
  "/art/header-board.jpg",
  "/art/header-toolbox.jpg",
];

export const USE_IMG_PROXY = true;

export const proxied = (url) => `/api/img?url=${encodeURIComponent(url)}`;

export const imgSrc = (url) =>
  !url ? null : USE_IMG_PROXY ? proxied(url) : url;

export const PROXIES = [
  (u) => `/api/feed?url=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
];

/* ═══════════════════════════════════════════════════════════════
   2. PLAYBOOK — curated practice guides (original content)
   ═══════════════════════════════════════════════════════════════ */

export const PLAYBOOK = [
  {
    id: "reading-generated", name: "Reviewing Code You Did Not Write", family: "With a model", heat: "high",
    one: "The first human to read it is the person who has to own it.",
    when: "Every change a model produced, which is now most of them.",
    how: [
      "Read the diff before you run it. Running it first tells you it works, not what it does.",
      "Ask what it does NOT handle. Generated code is confident about the happy path and silent about the rest.",
      "Check the imports. A plausible library that does not exist is the cheapest error to catch and the most embarrassing to ship.",
      "Look for the thing you did not ask for: an extra dependency, a widened permission, a swallowed error.",
      "If you cannot explain a block to someone else, you have not reviewed it. Understand it or delete it.",
    ],
    pitfalls: [
      "Approving because the tests pass. The model may have written the tests.",
      "Reviewing 900 lines because it arrived in one go. The 400-line limit was about the reader, and the reader has not changed.",
      "Treating the model as the explanation in a postmortem. Nobody accepts it, and rightly.",
    ],
    metric: "Share of merged changes a human can still explain a week later.",
  },
  {
    id: "pairing-model", name: "Pairing With a Model", family: "With a model", heat: "high",
    one: "You are the navigator now. It is a fast driver with no memory of yesterday.",
    when: "Unfamiliar APIs, mechanical refactors, first drafts, anything where typing was the slow part.",
    how: [
      "Say the goal and the constraints before the task. It cannot infer the ones living in your head.",
      "Give it the shape you want back, or you will get its favourite shape.",
      "Work in small turns. A long autonomous run is a large diff nobody watched being written.",
      "When it is wrong twice about the same thing, change the framing rather than correcting again. Repeating yourself louder is not a prompt.",
      "Keep the tests visible. Watching it fail is most of the value.",
    ],
    pitfalls: [
      "Letting it drive somewhere you could not have driven yourself. That is not pairing, it is outsourcing with extra steps.",
      "Accepting an architecture from something with no stake in maintaining it.",
      "Three hours in, nobody knows why the code is shaped this way, including you.",
    ],
    metric: "How often a session of work gets reverted wholesale.",
  },
  {
    id: "spec-first", name: "Writing the Spec First", family: "With a model", heat: "high",
    one: "A prompt is a specification, whether or not you wrote it like one.",
    when: "Anything bigger than a function. The vaguer the ask, the more confidently wrong the answer.",
    how: [
      "State the inputs, the outputs, and what must not change. Three lines beats three paragraphs.",
      "Name the failure cases up front. Models optimise for the case you described.",
      "Put the spec in the repo, not only in the chat. The chat is gone tomorrow; the decision is not.",
      "Re-read the spec against the result. Half of what looks like a wrong answer is an ambiguous ask.",
    ],
    pitfalls: [
      "Iterating conversationally toward something you could have specified in one line.",
      "Letting the generated code become the spec, so nobody can say what the intended behaviour was.",
    ],
    metric: "How often work is rejected for doing the wrong thing rather than doing it badly.",
  },
  {
    id: "provenance", name: "Provenance", family: "With a model", heat: "medium",
    one: "Knowing which lines nobody has actually read.",
    when: "Any codebase where more than one person and one model are committing.",
    how: [
      "Say so in the commit message when a change was largely generated. Not for blame, for the next reader's calibration.",
      "Review generated code hardest where mistakes are expensive: auth, money, migrations, anything that deletes.",
      "Treat a large generated block with no tests as undocumented, because it is.",
      "Licence matters: code suggested from training data can carry obligations nobody chose.",
    ],
    pitfalls: [
      "A repo where nobody can tell which parts a person wrote. Every line looks equally trustworthy, so none of it is.",
      "Recording provenance and never using it to decide where to look first.",
    ],
    metric: "Whether you can point at the riskiest unreviewed code in your repo today.",
  },
  {
    id: "tests-contract", name: "Tests as the Contract", family: "With a model", heat: "high",
    one: "The only part of the ask a model cannot talk its way around.",
    when: "Whenever you are accepting code faster than you can read it.",
    how: [
      "Write the failing test yourself, then let it make the test pass. The test is the spec it cannot misread.",
      "Never take the test and the implementation from the same run without reading the test.",
      "One test per behaviour you actually care about. Two hundred generated assertions prove patience, not correctness.",
      "Run them before you read the diff. A red suite saves you the reading.",
    ],
    pitfalls: [
      "Tests that assert the implementation rather than the behaviour. They pass forever and catch nothing.",
      "Coverage as the goal. Generated code makes coverage cheap and meaningless in one stroke.",
    ],
    metric: "Bugs caught by tests versus bugs caught in review or in production.",
  },
  {
    id: "pairing", name: "Pair Programming", family: "Live", heat: "high",
    one: "Two people, one problem, one keyboard at a time.",
    when: "Gnarly bugs, unfamiliar code, onboarding, anything where a wrong turn costs a day.",
    how: [
      "Agree the goal out loud before touching the keyboard. One sentence.",
      "Driver types, navigator thinks one step ahead. Swap every 15–25 minutes on a timer.",
      "Navigator does not dictate keystrokes. Speak in intentions: 'extract that into a function.'",
      "Take a real break every hour. Pairing is more tiring than solo work, not less.",
      "End with a two-minute recap: what changed, what's still open.",
    ],
    pitfalls: [
      "One person drives for three hours. That's a demo, not a pair.",
      "Pairing on trivial work. If it's mechanical, do it alone.",
      "Silent pairing. If nobody's talking, you're just being watched.",
    ],
    metric: "Time-to-first-working-change on unfamiliar code.",
  },
  {
    id: "mobbing", name: "Mob / Ensemble Programming", family: "Live", heat: "medium",
    one: "The whole team on one thing, at one time, at one machine.",
    when: "Architectural decisions, spreading knowledge fast, breaking a long-stuck problem.",
    how: [
      "One driver, everyone else navigates. Driver's hands, group's brain.",
      "Rotate the driver every 4–7 minutes. Use a timer app — don't self-police.",
      "Nobody types their own idea. You have to say it and let someone else type it.",
      "Cap the session at 90 minutes. Ensemble work burns attention fast.",
    ],
    pitfalls: [
      "Loudest voice wins. Use a round-robin for opinions on contested calls.",
      "Running it as a permanent mode. It's a tool for specific problems, not a default.",
    ],
    metric: "How many people can now safely change this subsystem.",
  },
  {
    id: "review", name: "Code Review", family: "Async", heat: "high",
    one: "Asynchronous critique that improves the code without stalling the author.",
    when: "Every change that touches shared code. No exceptions, including yours.",
    how: [
      "Keep PRs under ~400 lines. Review quality collapses past that — measurably.",
      "Author writes the 'why' in the description. Reviewers should never have to guess intent.",
      "Label comments by force: 'blocking', 'suggestion', 'nit', 'question'. Removes ambiguity.",
      "Review within one working day or hand it off. Stale PRs rot and get rubber-stamped.",
      "Approve with open nits. Trust the author to handle small things.",
    ],
    pitfalls: [
      "Style debates that a linter should be settling. Automate the argument away.",
      "Rewriting the author's approach in comments. If it's that different, talk live.",
      "Review as gatekeeping. The job is better code, not proving you read it.",
    ],
    metric: "Median PR open-to-merge time, and review comments per 100 lines.",
  },
  {
    id: "rfc", name: "RFCs & Design Docs", family: "Async", heat: "high",
    one: "Write the decision down before you build it, and let people argue in the margins.",
    when: "Anything that's expensive to reverse: schemas, APIs, dependencies, architecture.",
    how: [
      "Fixed template: context, problem, options considered, recommendation, open questions.",
      "Always include the option you rejected and why. That's the highest-value section.",
      "Set a comment deadline. 'Open for feedback until Thursday' beats open-ended.",
      "Name a decider. Consensus is nice; a DRI is what actually closes the doc.",
      "Archive it next to the code as an ADR. Future-you needs the reasoning, not the outcome.",
    ],
    pitfalls: [
      "Writing the RFC after you've already built it. That's a changelog with extra steps.",
      "Docs so long nobody reads them. Two pages, then an appendix.",
    ],
    metric: "How often you re-litigate a decision that already has a doc.",
  },
  {
    id: "trunk", name: "Trunk-Based Development", family: "Flow", heat: "medium",
    one: "Everyone merges to main every day. Branches measured in hours, not weeks.",
    when: "Teams where merge conflicts and 'integration week' are a recurring tax.",
    how: [
      "Branch lifetime target: under 24 hours. If it's longer, split the work.",
      "Hide unfinished work behind feature flags, not behind unmerged branches.",
      "Main must always be releasable. That's the whole contract.",
      "Fast CI is a prerequisite, not a nice-to-have. Under 10 minutes or people batch.",
    ],
    pitfalls: [
      "Adopting it without CI discipline. You just get a broken main faster.",
      "Flag debt. Every flag needs an owner and a removal date.",
    ],
    metric: "Average branch age at merge.",
  },
  {
    id: "async-standup", name: "Async Standups", family: "Async", heat: "medium",
    one: "Written status that respects timezones and doesn't cost 15 people 15 minutes.",
    when: "Distributed teams, or any team where the standup has become theatre.",
    how: [
      "Three lines: shipped, doing, blocked. Blocked goes first if it exists.",
      "Post to a channel, not DMs. The value is other people reading it.",
      "Tag a person on blockers, not the channel. @here is not an owner.",
      "One synchronous slot per week for the things that genuinely need voices.",
    ],
    pitfalls: [
      "Writing for a manager instead of for teammates. It becomes a status report and dies.",
      "Nobody reads them. If that's true, kill them — the ritual isn't the point.",
    ],
    metric: "Median time from 'blocked' post to first response.",
  },
  {
    id: "onboarding", name: "Onboarding Contributors", family: "Community", heat: "high",
    one: "The distance between 'interested' and 'first merged PR.'",
    when: "Every open source project, and every new hire's first week.",
    how: [
      "One command to a running environment. If setup takes a day, most people leave.",
      "Maintain a real 'good first issue' queue — scoped, described, with a pointer to the file.",
      "CONTRIBUTING.md answers: how to run tests, code style, how long review takes.",
      "Assign a named buddy. 'Ask in the channel' is not a person.",
      "Merge something of theirs in week one. Momentum compounds.",
    ],
    pitfalls: [
      "Stale good-first-issues that were fixed months ago. Nothing kills goodwill faster.",
      "Ghosting a first PR. One ignored contribution loses that person permanently.",
    ],
    metric: "Days from first clone to first merged PR.",
  },
  {
    id: "postmortem", name: "Blameless Postmortems", family: "Recovery", heat: "high",
    one: "Learn from the outage without hunting for someone to blame.",
    when: "After every incident that hit users, and every near-miss worth remembering.",
    how: [
      "Timeline first, facts only. What happened and when, before any interpretation.",
      "Ask what made the mistake easy to make. The answer is a system, not a person.",
      "Every action item gets an owner and a date, or it isn't an action item.",
      "Publish internally by default. A postmortem nobody reads taught nobody anything.",
    ],
    pitfalls: [
      "'Human error' as a root cause. That's where analysis stops being useful.",
      "Action items nobody schedules. Track them like any other work.",
    ],
    metric: "Repeat incidents with the same root cause.",
  },
  {
    id: "charter", name: "Working Agreements", family: "Foundations", heat: "medium",
    one: "The team writes down how it actually wants to work, then holds itself to it.",
    when: "New team, new members, or when the same friction keeps recurring.",
    how: [
      "Cover: core hours, response expectations, meeting rules, definition of done, decision rights.",
      "Write it together in one session. An imposed charter is a policy, not an agreement.",
      "Keep it to one page. Revisit quarterly and delete what nobody follows.",
    ],
    pitfalls: [
      "Aspirational rules nobody enforces. Weakens every other line on the page.",
      "Writing it once and never revisiting. Teams change; the agreement should too.",
    ],
    metric: "How often the same conflict comes back.",
  },
  {
    id: "docs", name: "Docs as Collaboration", family: "Foundations", heat: "medium",
    one: "Documentation is the asynchronous version of asking someone a question.",
    when: "Always. Especially anywhere the same question gets asked twice.",
    how: [
      "README answers: what is this, how do I run it, how do I contribute. In that order.",
      "ADRs capture *why*. Code shows what; nothing else shows why.",
      "Write the doc the second time someone asks. First time is a conversation, second is a pattern.",
      "Docs live in the repo. Wikis drift because nothing forces them to change with the code.",
    ],
    pitfalls: [
      "Auto-generated docs treated as real docs. Signatures aren't explanations.",
      "No owner. Unowned docs decay into actively misleading ones.",
    ],
    metric: "Repeat questions in the team channel.",
  },
  {
    id: "handoff", name: "Timezone Handoffs", family: "Async", heat: "low",
    one: "Passing live work across the globe without dropping it.",
    when: "Teams split across more than ~6 hours of offset.",
    how: [
      "Handoff note on the ticket, not in chat: state, next step, known traps.",
      "Never hand off a red build. Fix or revert before you sign off.",
      "Protect one overlap hour and treat it as sacred. That's where the hard stuff happens.",
    ],
    pitfalls: [
      "Assuming the next person will read the whole thread. They won't. Summarize.",
      "Scheduling the overlap at 6am for one side permanently. Rotate the pain.",
    ],
    metric: "Work items that stall for a full day mid-flight.",
  },
  {
    id: "pr-etiquette", name: "PR Etiquette", family: "Async", heat: "medium",
    one: "Small social rules that make review feel like help instead of judgment.",
    when: "Any team where review comments have started to sting.",
    how: [
      "Reviewers: ask questions before asserting. 'What happens if x is null?' beats 'this is wrong.'",
      "Authors: reply to every comment, even with 'good catch, fixed.' Silence reads as dismissal.",
      "Praise specific things. Reviews that are 100% criticism train people to fear them.",
      "Disagreement over two rounds moves to a call. Text loses arguments it shouldn't.",
    ],
    pitfalls: [
      "Sarcasm. It never survives the trip to text.",
      "Reviewing the person's competence instead of the diff.",
    ],
    metric: "How willing junior people are to open PRs at all.",
  },
];

/* ═══════════════════════════════════════════════════════════════
   3. TOOLBOX — curated tool directory
   ═══════════════════════════════════════════════════════════════ */

export const TOOLS = [
  { cat: "Coding with a model", items: [
    { name: "Claude Code", note: "Agentic CLI that edits files and runs commands in your repo. Strong across many files at once; you are trusting a loop you did not watch, so the diff is the review.", url: "https://claude.com/claude-code" },
    { name: "Cursor", note: "An editor built around the model rather than bolted onto one. Excellent inline flow, and correspondingly easy to accept more than you read.", url: "https://cursor.com" },
    { name: "GitHub Copilot", note: "The default, and now much more than autocomplete. Best where your repo conventions are already consistent, because it copies what it sees.", url: "https://github.com/features/copilot" },
    { name: "aider", note: "Open-source CLI pair that commits each change separately, which makes generated work reviewable one step at a time. The best provenance story of the set.", url: "https://aider.chat" },
    { name: "Cline", note: "Open-source agent inside VS Code. Shows each proposed command before running it, which is slower and much harder to sleepwalk through.", url: "https://cline.bot" },
    { name: "Continue", note: "Open source, bring your own model. The one to reach for when the code cannot leave your own infrastructure.", url: "https://continue.dev" },
  ]},
  { cat: "Live pairing", items: [
    { name: "VS Code Live Share", note: "Share your editor session, terminals and servers included. Free, and already installed for most teams.", url: "https://visualstudio.microsoft.com/services/live-share/" },
    { name: "Tuple", note: "Purpose-built remote pairing with very low latency. macOS-first, paid.", url: "https://tuple.app" },
    { name: "CodeTogether", note: "Cross-IDE pairing — VS Code, IntelliJ, Eclipse in the same session.", url: "https://www.codetogether.com" },
    { name: "Pop", note: "Screen sharing tuned for pairing rather than presenting. Multi-cursor.", url: "https://pop.com" },
    { name: "Replit Multiplayer", note: "Browser IDE with real-time co-editing. Good for teaching and quick spikes.", url: "https://replit.com" },
  ]},
  { cat: "Review & code hosting", items: [
    { name: "GitHub", note: "The default. Worth knowing CODEOWNERS, draft PRs, and suggested changes properly.", url: "https://github.com" },
    { name: "GitLab", note: "Full DevOps in one place; self-hostable, which matters for some orgs.", url: "https://gitlab.com" },
    { name: "Graphite", note: "Stacked PRs. Fixes the 'my change is blocked on my other change' problem.", url: "https://graphite.dev" },
    { name: "Gerrit", note: "Change-centric review. Heavy, but unmatched for large multi-reviewer projects.", url: "https://www.gerritcodereview.com" },
    { name: "Reviewable", note: "Sits on GitHub; far better at multi-round review on large diffs.", url: "https://reviewable.io" },
  ]},
  { cat: "Shared environments", items: [
    { name: "GitHub Codespaces", note: "Repo-defined dev containers in the cloud. Kills 'works on my machine.'", url: "https://github.com/features/codespaces" },
    { name: "Gitpod", note: "Ephemeral, pre-built workspaces per branch. Strong for OSS contributors.", url: "https://gitpod.io" },
    { name: "Coder", note: "Self-hosted dev environments — for teams with compliance constraints.", url: "https://coder.com" },
    { name: "Dev Containers", note: "The open spec underneath most of the above. Start here; it's portable.", url: "https://containers.dev" },
  ]},
  { cat: "Knowledge & docs", items: [
    { name: "HackMD", note: "Real-time collaborative markdown. Excellent for drafting RFCs live.", url: "https://hackmd.io" },
    { name: "Obsidian", note: "Local-first notes over plain markdown. Git-syncable for teams.", url: "https://obsidian.md" },
    { name: "Docusaurus", note: "Docs sites from markdown in your repo. Versioning built in.", url: "https://docusaurus.io" },
    { name: "adr-tools", note: "CLI for Architecture Decision Records. Tiny, and it changes how teams decide.", url: "https://github.com/npryce/adr-tools" },
    { name: "Notion", note: "Flexible team wiki. Drifts from code — pair it with in-repo docs.", url: "https://notion.so" },
  ]},
  { cat: "Async comms", items: [
    { name: "Slack", note: "Ubiquitous. Threads and channel conventions matter more than the tool.", url: "https://slack.com" },
    { name: "Discord", note: "Where most OSS communities actually live now. Voice channels are underrated for ad-hoc pairing.", url: "https://discord.com" },
    { name: "Twist", note: "Threaded and deliberately slow. Built for async-first teams.", url: "https://twist.com" },
    { name: "Loom", note: "Async video. One 3-minute recording often beats a 40-message thread.", url: "https://loom.com" },
  ]},
  { cat: "Thinking together", items: [
    { name: "Excalidraw", note: "Fast collaborative whiteboard. Diagrams save as editable files you can commit.", url: "https://excalidraw.com" },
    { name: "tldraw", note: "Slicker canvas, embeddable, open source.", url: "https://tldraw.com" },
    { name: "Figma / FigJam", note: "Design plus workshop canvas. The multiplayer model everyone else copied.", url: "https://figma.com" },
    { name: "Mermaid", note: "Diagrams as text, rendered in markdown. Diffable, which whiteboards aren't.", url: "https://mermaid.js.org" },
  ]},
  { cat: "Coordination", items: [
    { name: "Linear", note: "Fast, opinionated issue tracking. Keyboard-first.", url: "https://linear.app" },
    { name: "GitHub Projects", note: "Free, lives beside the code. Good enough for most teams under 30.", url: "https://github.com/features/issues" },
    { name: "Jira", note: "Heavy but configurable. Worth it at org scale, painful below it.", url: "https://www.atlassian.com/software/jira" },
  ]},
];

/* ═══════════════════════════════════════════════════════════════
   4. GLOSSARY
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   5. COLLABS — the site's own argument, demonstrated

   A collab is a piece of work split by CRAFT, with a public record of who
   brought which part. The board asks "who needs help"; this answers "what
   did we build together, and who did which piece".

   Two rules, and they are the whole value of the section:

   1. THE LOG IS EVIDENCE, NOT NARRATIVE. Every entry carries the commit it
      refers to. Anyone can check it against
      the repository. A collab log that cannot be verified is
      marketing, and the first one setting that precedent would poison the
      rest.
   2. CONTRIBUTORS ARE DESCRIBED AS WHAT THEY ARE. One of the two here is an
      AI, labelled as one. Nothing is gained by blurring that, and the split
      is more interesting when it is accurate: it is a real division of
      labour, not a fictional team.

   Static on purpose, like the playbook — the first collab has to survive
   every function being down, because it is the thing that explains the site.
   Live, joinable collabs go through /api/collabs when there are people to
   join them; the section renders both from the same shape.
   ═══════════════════════════════════════════════════════════════ */

export const COMMUNITY = "general";

/* ═══════════════════════════════════════════════════════════════
   HOW THIS WORKS — the operating rules, stated rather than implied.

   Every line here is checkable against the code in this repo. If one of
   them stops being true, change the line or change the code — a stated
   principle that quietly stopped holding is worse than never stating it.
   ═══════════════════════════════════════════════════════════════ */

/* The argument the whole site rests on. Deliberately opinionated: a neutral
   statement of "collaboration is good" would be worth nothing to a reader who
   already knows that. Each claim is answered at length by a PLAYBOOK entry. */

export const THESIS = {
  head: "Most code is now written by a machine. The hard part moved to the seam.",
  body:
    "The typing stopped being the bottleneck. What is scarce now is everything around it — " +
    "deciding what to ask for, reading what came back, knowing which parts you would stake " +
    "your name on, and keeping a team able to change code that nobody in the room has read. " +
    "That is a collaboration problem wearing a new hat, and the old answers only half fit. " +
    "This is what we have found holds up.",
}

export const MO = [
  {
    k: "Chosen by hand, not ranked by a model",
    v: "Thirty feeds, picked deliberately and listed in full on the Sources page. Sorting is newest-first or by how much an item is actually about working together — and that score is a plain keyword list in the source, not a model you can't inspect.",
  },
  {
    k: "The written half never goes down",
    v: "The playbook, toolbox and glossary are about eight thousand words shipped inside the page. If every feed and every function fails, there is still something here worth reading.",
  },
  {
    k: "No accounts, nothing to join",
    v: "There is no sign-up, because nothing here needs to know who you are. Your reading list is saved in your own browser and never reaches a server.",
  },
  {
    k: "Counted, not followed",
    v: "Pageviews are counted server-side against an IP hashed fresh each day, so the count cannot be tied back to a person or joined up across days. Which links get clicked is reported to this site's own dashboard. There is no third-party analytics, no advertising network, and no cookie for either.",
  },
  {
    k: "Third parties stay at arm's length",
    v: "Feed images are fetched through this origin rather than loaded from a dozen publisher CDNs, so reading the feed doesn't announce you to all of them. Where a feed carries no picture, this server — not your browser — reads the article's own preview image once and caches it for everybody. Either way the publisher sees us, never you.",
  },
  {
    k: "Nobody paid to be here",
    v: "No affiliate links, no sponsored placements, no rankings. The toolbox says what each tool is bad at as well as good at, which is the part a vendor would object to.",
  },
  {
    k: "Claims open into the thing itself",
    v: "Every craft listed on a collab links straight into the working result rather than describing it. If something here cannot be opened and used, it should not be claimed.",
  },
];

export const COLLABS = [
  {
    id: "crewup-itself",
    title: "Crewup itself",
    status: "shipped",
    community: "general",
    started: "2026-08-06",
    one: "Six crafts, two days, one site — and every part of it is on this screen right now.",
    why:
      "The argument for splitting work by craft is hard to make in the abstract, so this " +
      "collab makes it concretely: each card below is a specialism, what it produced, and a " +
      "door straight into the working result. Nothing here is a description of something " +
      "that exists elsewhere. It is all live, and you can go and use it.",

    /* Each entry points at a section of this site, so the claim and the proof
       are one click apart. `view` must match an id in VIEWS. */
    brought: [
      {
        craft: "Feed engineering",
        stat: "30",
        unit: "sources, one river",
        what:
          "Thirty publishers, five incompatible ways of advertising an image, and four " +
          "fallbacks for when a feed refuses to answer — flattened into a single stream that " +
          "sorts by how much an item is really about working together.",
        view: "feed",
        cta: "read the feed",
      },
      {
        craft: "Writing",
        stat: "8,000",
        unit: "words that never go down",
        what:
          "Twelve practices, thirty reviewed tools and twenty-two definitions, written to be " +
          "useful on the worst day — they ship inside the page, so they survive every feed " +
          "and every server being unreachable.",
        view: "playbook",
        cta: "open the playbook",
      },
      {
        craft: "Curation",
        stat: "30",
        unit: "tools, no rankings",
        what:
          "Grouped by the problem they solve, each with an honest line on what it is bad at. " +
          "Nobody paid to be here, and the list says so where a vendor would object.",
        view: "toolbox",
        cta: "see the toolbox",
      },
      {
        craft: "Infrastructure",
        stat: "6",
        unit: "functions at the edge",
        what:
          "A feed proxy, an image proxy, two analytics paths and the board — so your browser " +
          "talks to this origin and nothing else while you read.",
        view: "sources",
        cta: "see what it reads",
      },
      {
        craft: "Design",
        stat: "4.5:1",
        unit: "contrast floor, everywhere",
        what:
          "A dark ground lit from a warm side, cursor-aware controls, and every piece of text " +
          "on the site measured against what sits behind it rather than eyeballed.",
        view: "glossary",
        cta: "see it on the type",
      },
      {
        craft: "Community",
        stat: "0",
        unit: "accounts required",
        what:
          "A board where people post what they need help with and what they are free to take " +
          "on — no sign-up, no profile, nothing to maintain.",
        view: "board",
        cta: "open the board",
      },
    ],

    openings: [
      {
        craft: "Writing",
        need:
          "The playbook is twelve practices deep and could be forty. If you have run " +
          "postmortems or onboarded contributors for real, that is the missing voice.",
      },
      {
        craft: "Front-end",
        need:
          "The feed is one long list. Someone who thinks in reading interfaces could make " +
          "three thousand items navigable in a way sorting alone never will.",
      },
      {
        craft: "Server-side",
        need:
          "About a fifth of feed items have no picture because the feed carries none. " +
          "Fetching each article's own preview image server-side would close that gap.",
      },
    ],
  },
];

export const GLOSSARY = [
  { term: "Vibe coding", def: "Describing what you want and accepting the code the model writes without reading it closely. Coined by Andrej Karpathy for throwaway work, and now used for the general practice, including on code that is very much not throwaway." },
  { term: "Agentic coding", def: "Letting a model run its own loop: edit files, run commands, read the output, try again. Differs from autocomplete in that nobody watches each step, so the diff is the first thing a human sees." },
  { term: "Review debt", def: "Code that is merged and running but that no human has read. Unlike technical debt it is invisible in the codebase, because it looks exactly like reviewed code." },
  { term: "Provenance", def: "Which parts of a codebase were written by whom, human or model. It matters less for credit than for knowing where to look hardest when something breaks." },
  { term: "Context window", def: "How much text a model can consider at once. The practical effect on a team is that it cannot hold your codebase in mind, so what you put in front of it is what it knows." },
  { term: "Hallucinated dependency", def: "A confident import of a package that does not exist. Cheap to catch by running the code, and the origin of a supply-chain attack when somebody registers the invented name." },
  { term: "Eval", def: "A repeatable test of a model's output quality, as distinct from a test of your code. Necessary once prompts are part of the product, because a prompt change is a behaviour change with no diff." },
  { term: "ADR", def: "Architecture Decision Record. A short doc capturing one decision, its context, and its consequences. Lives in the repo so the reasoning survives the people." },
  { term: "Async-first", def: "Defaulting to written, non-blocking communication. Meetings become the exception that needs justification, not the norm." },
  { term: "Blameless", def: "A postmortem stance where the question is what made the failure easy, not who caused it. Produces honest timelines; blame produces defensive ones." },
  { term: "Bus factor", def: "How many people would have to disappear before a project stalls. A bus factor of one is the most common serious risk in software teams." },
  { term: "CODEOWNERS", def: "A file mapping paths to reviewers, auto-requesting the right people on a PR. Makes review responsibility explicit rather than social." },
  { term: "Conventional Commits", def: "A commit message convention (feat:, fix:, chore:) that machines can parse for changelogs and version bumps." },
  { term: "DRI", def: "Directly Responsible Individual. The single named person who owns a decision or outcome. Consensus builds buy-in; a DRI closes the loop." },
  { term: "Drive-by contribution", def: "A one-off PR from someone with no ongoing project involvement. Common in OSS; the review experience determines whether they ever come back." },
  { term: "Ensemble programming", def: "The current preferred name for mob programming — the whole team on one problem at one machine, rotating the driver." },
  { term: "Feature flag", def: "A runtime switch that hides unfinished work in production. The mechanism that makes trunk-based development possible." },
  { term: "Good first issue", def: "A deliberately scoped task for newcomers. Only works if the queue is real, current, and points at specific files." },
  { term: "Maintainer burnout", def: "The exhaustion of unpaid OSS maintainers under unbounded demand. The main reason widely-used projects go unmaintained." },
  { term: "Monorepo", def: "One repository holding many projects. Simplifies cross-project changes and shared tooling; demands serious build infrastructure." },
  { term: "Nit", def: "A review comment the author may ignore. Labelling it as such removes the guesswork about whether it blocks the merge." },
  { term: "Pairing rotation", def: "Deliberately cycling who pairs with whom so knowledge spreads across the team rather than pooling in pairs." },
  { term: "RFC", def: "Request For Comments. A proposal circulated for feedback before implementation. Borrowed from IETF, now standard in engineering orgs." },
  { term: "Stacked PRs", def: "A chain of dependent pull requests, each small enough to review. Lets you keep shipping while earlier links are still in review." },
  { term: "Swarming", def: "The whole team dropping current work to converge on one blocker. Useful in short bursts, corrosive as a habit." },
  { term: "Trunk-based development", def: "Everyone integrates to main at least daily, with branches living hours rather than weeks. Requires fast CI and feature flags." },
  { term: "WIP limit", def: "A cap on how many items can be in progress at once. Forces finishing over starting, which is where most team throughput is lost." },
  { term: "Working agreement", def: "A short document the team writes itself covering how it collaborates — hours, response times, decision rights, definition of done." },
  { term: "Yak shaving", def: "The recursive chain of prerequisite tasks between you and the thing you meant to do. Naming it out loud in a pair is how you escape it." },
];

