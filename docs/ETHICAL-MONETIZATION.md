# 🌟 Ethical Monetization Roadmap

> **Philosophy in one line:** *We sell expression and support — never power. You pay because you love the place, never because the place forced you to.*

This is the mid/long-term monetization roadmap for **Echo's Space Station** — a vanilla-JS, no-build, pixel-art browser world. It is deliberately practical for a small indie project: every stream below can ship with the tools we already have (`platform.js`, SQLite, Stripe, the ◈ economy, the existing 40+ cosmetic skins, the citizen-science games, and the new **Echo Run** platformer).

It also supersedes the extraction-flavored parts of [`VISION-WHALE-MODEL.md`](./VISION-WHALE-MODEL.md). See [Reconciling the "Whale Model"](#reconciling-the-whale-model) at the end.

---

## The Charter — Agreed Principles

These are requirements, not suggestions. Every feature, price, and UI flow must pass all of them.

### 1. Sell expression and support, never power
- **Cosmetics** (skins, particle auras, trails, emotes, room decor), **convenience-that-isn't-power**, and **supporting the mission**. That's the whole menu.
- **Strictly no pay-to-win.** Real money never buys combat stats, enhancement success, ELO, loot-roll luck, or anything that makes another player's earned progress worth less.
- **Earned achievements stay earned.** Beating Echo Run's Kaizo mode, hitting a saber-ladder tier, completing a citizen-science set, finishing a +20 enhancement — these are *trophies of skill or time*. They are never for sale, never giftable as a shortcut, never "skippable" for cash.
- The line test: *"Does buying this change another player's experience for the worse, or change a leaderboard?"* If yes, it's power. Don't sell it.

### 2. Gambling-safe by design
- **No random paid loot boxes / gacha for real money.** Full stop.
- **Legal reality we respect:** paid randomized rewards are effectively banned or treated as gambling in **Belgium** and **the Netherlands**, face tightening regulation across the EU and UK, and carry extra duty of care **wherever minors can play** (which is everywhere a browser is). We design as if the strictest rule applies to everyone.
- **If a pack-opening or "reveal" mechanic is used at all, it must be one of:**
  - **(a) Earned-currency only** — opened with **◈ that was *earned* in-game** or with **RP**, never with cash. Earned-coin reveals are play rewards, not purchases.
  - **(b) Transparent direct-buy** — **published odds** *and* an always-available **"buy exactly what's shown"** price, so no one is ever *forced* through a chance mechanic to get a specific item. The randomized path may exist as a cheaper fun option, but the deterministic path always exists.
- **Keep the dopamine, drop the gamble.** The thrill of a pack opening comes from *presentation* — the [holographic reveal, the camera shake, the golden aura](./COLLECTIBLES-VISION.md) — not from "did I waste my money." Showmanship is allowed; chance-for-cash is not.

### 3. Transparency & dignity
- **Clear pricing**, shown in real currency (and ◈ where relevant), with no hidden conversion tricks.
- **No dark patterns:** no fake scarcity, no manipulative countdown timers, no "your discount expires in 4:59," no confusing currency bundles designed to leave dangling balances.
- **Reduce friction to NOT spend** as carefully as friction to spend. A visitor must be able to enjoy the whole station, earn cosmetics, and contribute citizen-science data without ever paying.
- **Honor refunds** generously. A real, human refund policy (we suggest 30 days, no interrogation; the [skin vision's](./SKIN-PREMIUM-VISION.md) "try before you buy" exists precisely so refunds are rarely needed). *If someone regrets spending here, we failed.*
- **Minor-aware:** no engineered FOMO, spending velocity nudges, or "you're so close" pressure. Show monthly spend summaries and offer self-set spend limits.

### 4. The mission is the heart, not the bait
The station funds real **Multiple System Atrophy (MSA)** research, and the citizen-science games (Synapse Spotter, Molecule Sculptor) produce real pattern data.
- A **transparent revenue-to-research cut** (minimum **5% of all revenue**, published), with a live tracker: *"MSA Research Funded: $X,XXX."*
- A **"your support funded X hours of research"** feeling — translate dollars into something legible and honest (compute hours, data sets reviewed, etc.) without overclaiming.
- A **supporter wall**, a **tip jar / pay-what-you-want**, and **opt-in recognition** — celebrated, never coerced.
- The mission is **why generosity feels good here** — not a guilt lever to pull. We never imply "if you don't pay, research stops."

---

## Revenue Streams

All streams are cosmetic, convenience-not-power, or mission support. None gate gameplay or sell power.

| Stream | What it is | Why it's ethical / gambling-safe | Built on what we have |
|--------|-----------|----------------------------------|------------------------|
| **Cosmetic skins & expression** | Premium [living skins](./SKIN-PREMIUM-VISION.md) (auras, trails, emotes, entrances), name glow, room decor, Pixel-the-cat cosmetic variants, Echo Run character/board cosmetics. | Pure expression. Zero stat impact. Direct-buy "you get exactly this" — **no randomized skin pulls for cash**. Preview-before-buy + refund window. | Existing 40+ skin system, particle engine, shop UI, Stripe. |
| **"Support the Station" — tip jar & Patron tier** | Pay-what-you-want tip jar; recurring **Supporter / Patron** tier giving cosmetic badge, supporter-wall placement, and a published cut to MSA research. **Capped and generous, not extractive** (see reconciliation below). | Buys recognition + mission impact, never power. Soft cap with a genuine "you've been very generous — sure?" check; hard monthly ceiling. Refundable. | Stripe subscriptions, badge rendering, Station Log. |
| **Orbital Pass (seasonal, non-predatory)** | A generous, slow-paced seasonal cosmetic track. Free track for everyone; paid track adds extra cosmetic rewards + a research contribution. | **No FOMO predation:** no real-money "tier skips," no daily login pressure, progress earned by *playing what you'd play anyway* (Echo Run runs, arcade, citizen-science, exploring). Past-season cosmetics return later or are buyable directly — nothing is permanently dangled. Fully cosmetic. | Daily/weekly mission system already in [`ECONOMICS.md`](./ECONOMICS.md); cosmetic rewards from existing pipeline. |
| **Creator / streamer growth funnel** | Tools that make the station *fun to show*: shareable Echo Run replays/scorecards, room-tour links, "wear my skin" referral cosmetics, creator badges. | A **growth funnel, not a paywall.** Creators bring audiences via expression and content, not by gating features behind their channel. No exclusive *power*, only optional cosmetics + visibility. | World/world.html sharing, room editor, leaderboards. |
| **Optional B2B / room-hosting** | Let an organization or community host a themed room/event space on the station (a branded community deck, a charity stream night), as a flat hosting arrangement. | Sells *space and setup*, not advantage over players. Must not inject ads into others' experience or sell player data. Strictly opt-in for visitors. | Existing room/floor + editor systems; only pursue if it fits the cozy tone. |
| **Mission merch (optional)** | Print-on-demand pixel-art merch with a clear research cut. | Physical expression + support. Clearly priced. | Stripe + POD integration prep. |

### On pack-openings and collectibles specifically
The [Collectibles Vision](./COLLECTIBLES-VISION.md) leans hard on dramatic reveals. Under this charter:
- **Reveal *presentation* stays** (the shimmer, the spotlight, the unboxing fanfare) — it's great game feel.
- **The *acquisition* changes:** collectible reveals are opened with **earned ◈ or RP**, *or* offered as **published-odds packs that always have a direct-buy alternative**. You can choose the cheap surprise OR pay the listed price for the exact item. Never trapped in chance to get what you want with cash.

---

## Red Lines — Things We Will Never Do

- ❌ **Sell power.** No real-money stats, enhancement boosts, luck, ELO, durability, or loot-roll advantages.
- ❌ **Sell earned achievements.** Kaizo clears, ladder ranks, completion trophies, citizen-science milestones are never buyable or skippable for cash.
- ❌ **Paid random loot boxes / gacha for cash.** No "pay $X for a random chance" with no guaranteed-buy alternative — anywhere, ever.
- ❌ **Make RP buyable.** Research Points stay the one currency you can only *earn*. (Per README and the economy bible.)
- ❌ **Dark patterns:** fake timers, manufactured scarcity, confusing currency bundles with stranded balances, "almost there!" spending nudges, default-on auto-renew traps.
- ❌ **Prey on minors or vulnerable spenders.** No spend-velocity exploitation; spend limits and summaries are available.
- ❌ **Pay-gate the mission or the data.** You never have to pay to play citizen-science or to contribute MSA data. Funding research is a *bonus* of supporting, not a ransom.
- ❌ **Sell or exploit player data**, or inject ads into players' experiences via B2B deals.
- ❌ **Refuse honest refunds.**
- ❌ **Pressure giving.** No "research dies without you" guilt mechanics.

---

## Phased Rollout

### Near term (now → ~1 month) — *Prove it ethically*
- Ship the **tip jar / pay-what-you-want** and a **public MSA research tracker** ("Funded: $X — about N hours of analysis"). Lowest-friction, highest-trust first move.
- Convert the cosmetic shop to **direct-buy only** (real money buys the *exact* skin shown), with **preview-before-buy** and a posted **refund policy**.
- Publish a short **"How we make money & where it goes"** page in-station (links to this charter). Transparency is itself marketing here.
- Add a **supporter wall** + opt-in recognition for tip-jar and early supporters.

### Mid term (~1–4 months) — *Sustainable recurring support*
- Launch the **Supporter / Patron tier** via Stripe: cosmetic badge, supporter-wall, published research cut, **soft cap + hard ceiling**, monthly spend summary, self-serve cancel.
- Ship the first **Orbital Pass** season: free track + generous paid track, earned by normal play, fully cosmetic, with returning/buyable past rewards.
- If any **collectible reveal** ships, ship it **earned-◈/RP-opened** *or* **published-odds + direct-buy** — never cash-gacha.
- Add **creator/streamer shareables** (Echo Run scorecards, room-tour links, referral cosmetics).

### Long term (4+ months) — *Ecosystem & mission scale*
- Mature the **creator funnel**: cosmetic referral rewards, creator badges, featured rooms (paid with *earned* ◈ per the economy bible, not cash power).
- Optional **B2B / room-hosting** and **mission merch**, only if they keep the cozy, non-predatory tone.
- **Public transparency dashboard:** revenue breakdown, research-fund total, "hours funded," supporter recognition — the [whale-model's transparency ideas](./VISION-WHALE-MODEL.md), kept; its extraction targeting, dropped.
- Annual **impact report**: *"This year, the station funded X toward MSA research and Y data sets reviewed by players."*

---

## KPIs — Measure Goodwill & Sustainability, Not Extraction

We explicitly do **not** optimize for ARPPU, whale concentration, or session-time-at-all-costs. We track:

**Trust & dignity**
- **Refund request rate** (target: low *because* products are loved, not because refunds are hard to get).
- **Voluntary spend-limit usage** and **soft-cap "are you sure?" stop rate** — proof the safeguards work and people use them.
- **% of revenue that is *recurring support* vs one-off cosmetics** — healthy if support is steady, not spike-driven by FOMO.
- **Spend concentration** watched as a *risk flag*, not a goal: if a tiny share of users funds everything, we lean *harder* into the cap and check on them, not softer.

**Mission**
- **$ to MSA research** and **% of revenue routed to research** (published).
- **Citizen-science participation** — players contributing data (this should rise independently of spend).
- **Research "hours funded"** translated honestly for the tracker.

**Goodwill & sustainability**
- **Net revenue vs operating cost** — are we self-sustaining? (Break-even is modest per [`PROFIT-DAY-ZERO.md`](./PROFIT-DAY-ZERO.md).)
- **Free-player retention & enjoyment** — do people who never pay still come back and have fun?
- **Player sentiment** ("does this game respect me?") via lightweight in-station feedback.
- **% of players who *can* pay but choose tip-jar / Patron because they want to** — the healthiest signal we have.

---

## Reconciling the "Whale Model"

[`VISION-WHALE-MODEL.md`](./VISION-WHALE-MODEL.md) already reached for an ethical "Pay to Give" idea — its **transparency, sponsorship visibility, MSA funding, soft/hard spend caps, and "no real-money loot boxes" rules are good and are kept here.**

But parts of it conflict with this charter and are **superseded:**

| Whale-model concept | Problem | This roadmap instead |
|---------------------|---------|----------------------|
| "High Spender **Targeting** — who are they?" archetypes | Targeting people *to maximize extraction* is exactly the mindset we reject. | We don't profile players to extract. We build great cosmetics + an honest mission and let anyone who *wants* to give more, give more. |
| "Anchor high, deliver low" / "pricing psychology" | Anchoring is a dark pattern. | Clear, honest prices. No psychological anchoring. |
| Framing whales as the funding engine the model optimizes for | Optimizing a product around its biggest spenders bends every decision toward pressure. | We optimize for **free-player joy + broad, capped support**. Big givers are welcome *patrons who chose to*, never a revenue target we steer toward. |
| Tiered "power-adjacent" perks (front-row, fee waivers as a spend ladder) | Risks creeping toward advantage-for-cash. | Patron perks are **cosmetic + recognition + mission impact only**. Never anything that touches gameplay power or earned achievements. |

**The reframed patron:** someone who *chooses* to give more because they love the station and the MSA mission, gets cosmetics and heartfelt recognition for it, is protected by a generous-but-real spending cap, and is **never** there because the game pay-gated, pressured, or out-leveled them. Giving is prestigious here because it's *visible and honest*, not because we engineered a whale.

> *The station stays free because people who love it choose to chip in — and that choice cures diseases instead of buying loot boxes.*

🔮💜
