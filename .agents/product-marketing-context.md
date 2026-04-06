# Product Marketing Context

*Last updated: 2026-04-05*

## Product Overview
**One-liner:** AI-powered Commander deck builder built for how your specific pod actually plays.
**What it does:** Decksmith lets Magic: The Gathering Commander players describe their playstyle, power level, and pod, then uses an AI advisor (Merlin) to generate a complete, tuned 99-card deck. Players can proxy, playtest, and upgrade from inside the tool.
**Product category:** MTG deck builder / EDH deck builder (how players search)
**Product type:** SaaS web app
**Business model:** Freemium — 3 free Merlin builds, then $5/month (Decksmith Arcane) for unlimited builds + full feature set. Grandmaster tier coming (includes everything currently built into the app).

## Target Audience
**Target users:** Casual Magic: The Gathering Commander (EDH) players — primarily brackets 1–3, playing in a regular home pod with friends. Not targeting competitive or cEDH players.
**Decision-makers:** Individual players (B2C)
**Primary use case:** Building a Commander deck tailored to your specific pod, playstyle, and power level — without spending hours on Moxfield or EDHREC
**Jobs to be done:**
- Build a functional, themed deck quickly without deep knowledge of every card
- Stay within their pod's power bracket so they don't become the table villain
- Test and tune a deck before spending money on cards
**Use cases:**
- New Commander player building their first real deck
- Experienced player starting a new commander or color identity
- Player who wants a deck that matches their playgroup's specific power level (bracket 2/3)
- Brewer who wants a starting point they can tune from

## Problems & Pain Points
**Core problem:** Building a Commander deck that actually fits your pod takes hours — EDHREC gives card suggestions but no structure, no playstyle context, and no awareness of who you're playing against.
**Why alternatives fall short:**
- EDHREC: Shows popular cards with no context for your pod or playstyle
- Moxfield: Great for organizing decks, not for building from scratch
- ChatGPT: Generates hallucinated cards or doesn't know current legal sets
- Precons: Too generic, rarely match the way you want to play
**What it costs them:** Hours of research, money spent on cards that don't fit the deck, showing up to the table with a deck that feels wrong for the pod.
**Emotional tension:** Fear of being "that guy" — too powerful or too weak for the table. Frustration when a deck doesn't play the way you imagined it.

## Competitive Landscape
**Direct:** EDHREC — falls short because it's a card aggregator with no personalization, no playstyle context, no deck structure
**Direct:** Moxfield deck builder — falls short because it's a manual tool, not an AI builder; assumes you already know what you want
**Secondary:** ChatGPT/Claude — falls short because no MTG card database, hallucinates cards, no Scryfall integration
**Indirect:** Just buying a precon — falls short because no customization, no pod awareness, generic power level

## Differentiation
**Key differentiators:**
- Merlin asks about your specific playstyle, pod, and bracket before building — not a generic "best cards" list
- Playgroup mode: input who you play against and Merlin builds around them
- Bracket enforcement: keeps decks honest to Commander's official power levels
- Full loop in one tool: build → proxy → playtest → upgrade
- Live Scryfall pricing on every card
**How we do it differently:** Pod-aware, playstyle-first AI generation vs. popularity-aggregated suggestions
**Why that's better:** The deck actually fits your table instead of a random meta
**Why customers choose us:** Speed (full deck in minutes) + fit (built for your pod, not the internet's pod)

## Objections
| Objection | Response |
|-----------|----------|
| "I can just use EDHREC for free" | EDHREC shows cards. Decksmith builds a complete, balanced deck tuned for your playstyle in minutes. |
| "Will the cards actually be good?" | Merlin uses live Scryfall data and knows the current card pool. You can also tune any card with the full search panel. |
| "I don't want to pay $5/month for a deck builder" | 3 builds free — no credit card needed. The $5 covers unlimited builds, proxies, playtesting, and versioning. |

**Anti-persona:** Spike/cEDH player optimizing for tournament-level decks — Decksmith is built for casual Commander players, not 100% optimal combo lines or fast-win strategies.

## Switching Dynamics
**Push:** Frustration with EDHREC's lack of structure, hours spent manually building a list that still feels off
**Pull:** Getting a complete, playable deck in minutes that's built for their specific table
**Habit:** "I've always just used EDHREC/Moxfield" — familiar tools even if slow
**Anxiety:** "Will the AI suggestions actually be good cards?" — uncertainty about quality before trying

## Customer Language
**How they describe the problem:**
- "I spent hours on EDHREC and still don't have a deck"
- "I don't want to be the strongest or weakest at the table"
- "I don't know enough cards to build this from scratch"
**How they describe us:**
- "It actually asked me how I want to play before building"
- "Built for my pod, not random meta"
**Words to use:** Commander, EDH, pod, bracket, playstyle, build, tune, Merlin, Arcane
**Words to avoid:** cEDH, optimal, net-deck, tier list
**Glossary:**
| Term | Meaning |
|------|---------|
| Merlin | Decksmith's AI deck advisor |
| Arcane | The $5/month paid tier |
| Grandmaster | Upcoming premium tier (waitlist) |
| Bracket | Commander's 1–4 power level system |
| Pod | The group of players at your table |
| Goldfish | Playtesting against an imaginary opponent |

## Brand Voice
**Tone:** Dark fantasy, arcane, confident — like a wizard's guild, not a tech startup
**Style:** Concise, evocative, slightly mystical. Avoid corporate language. Commands feel like spells.
**Personality:** Wise, skilled, slightly dramatic — Merlin is an advisor, not a chatbot

## Proof Points
**Metrics:** Not yet published
**Customers:** Pre-launch — no users yet
**Testimonials:** None yet — update this section once early users share feedback
**Value themes:**
| Theme | Proof |
|-------|-------|
| Speed | Full deck in minutes vs. hours of manual research |
| Fit | Playgroup-aware builds, bracket enforcement |
| Full loop | Build → proxy → test → upgrade in one tool |
| Affordable | $5/month, 3 builds free |

## Goals
**Business goal:** Convert free users to Arcane ($5/month) subscriptions
**Conversion action:** Use all 3 free Merlin builds → hit upgrade modal → subscribe
**Current metrics:** Early launch phase — baseline not yet established

## SEO & Marketing Next Steps

### Completed
- [x] OG image (1200×630) — live at decksmith.gg/og-image.png
- [x] sitemap.xml — live at decksmith.gg/sitemap.xml
- [x] Google Search Console verification file uploaded (pending verify click)
- [x] robots.txt pointing to sitemap
- [x] Full OG/Twitter meta tags in index.html

### Remaining SEO Items
- [ ] **Verify Google Search Console** — click Verify after Railway deploys the HTML file
- [ ] **Confirm noIndex on /builder** — intentional (builder is app, not content page)
- [ ] **JSON-LD structured data** — add SoftwareApplication schema to index.html

### Marketing Channels to Consider
- Reddit: r/EDH, r/magicTCG — share the tool, not ads
- Twitter/X MTG community — before/after deck builds
- YouTube Commander content creators — potential affiliate or review outreach
- Discord MTG servers — direct community seeding
- SEO long-tail: "edh deck builder for casual pods", "commander deck builder by playstyle"

### Copy / Content Opportunities
- Landing page testimonials section (once early users share feedback)
- "How Merlin builds your deck" explainer (trust-building)
- Blog/content: "How to pick the right bracket for your pod"
