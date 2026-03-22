# DESIGN WEEKLY — March 22, 2026
*ARCADE's Sunday Briefing — Cycle 5*

---

## What Shipped This Week

Three commits across two weeks:

**free.html** — The Free Tier landing page. The trust bridge. This is the single most important conversion asset in the entire funnel and it finally exists. Good.

**outcomes.json syncs (Mar 10, 11)** — Data pipeline keeping itself alive. Not glamorous, but proof the machine is running.

That's it. Two weeks, one real feature, two data ticks.

**Direction check:** free.html is exactly the right thing to have built. It's not flashy but it closes the funnel loop — someone hears about Card Sniper, lands on a page that shows them the free tier works, and has a reason to trust you before handing over money. That's correct sequencing. But two weeks for one landing page and two data syncs is a pace problem.

---

## One Thing Working Better Than Expected

**The trust bridge framing is holding.** Three cycles ago I flagged that you had no proof layer — no place for a skeptic to land and see evidence before committing. free.html fixes that. The fact that it exists as a *standalone page* (not buried in the dashboard) shows good instinct. You're building a funnel, not just a product. That's a different mindset and it's the right one for where you are.

---

## One Thing That Concerns Me

**The vault is now three weeks without a commit.**

Last week I asked: *"If Echo's Vault disappeared tomorrow and only Card Sniper survived, would that be okay?"*

No answer. No vault commit. No signal either way.

I'm not going to keep asking the same question — that's not design, that's nagging. But I want to name what's actually happening: the project has made a de facto choice. Every week that passes without a vault commit, Card Sniper becomes more real and the vault becomes more fictional. That's fine — if it's intentional. Right now it doesn't feel intentional. It feels like drift.

The companion is still sitting in the station. The claw is still undeployed. The NPC society is still invisible infrastructure. Every week those things age, they get harder to restart.

---

## Top 3 Priorities This Week

1. **Verify the free tier pipeline is actually live end-to-end.** free.html exists. Does @CardSniperFree exist? Is it sending delayed alerts? Can a new person subscribe right now and receive something in 24h? If any of those are no — that's the only thing that matters this week. A trust bridge that leads nowhere is worse than no bridge.

2. **Make a declared decision on the vault.** Not a plan, not a vision update — a *decision*. Is Echo's Vault still in active development, or is it a future phase while Card Sniper takes priority? Write it down. One sentence. Put it in NIGHTBUILD.md. Ambiguity is expensive when you're building solo.

3. **Wire the outcome tracker cron.** This has been P1 since Feb 27. wins.html is powered by outcomes.json. If outcomes.json goes stale, your best social proof page goes stale. Five minutes to set the cron, permanent return.

---

## This Week's Design Question

Two weeks ago: *"If Echo's Vault disappeared tomorrow and only Card Sniper survived, would that be okay?"*

You didn't answer. So here's a softer version — and the last time I'll ask it:

> **What would have to be true for you to open index.html and make one commit to the vault this week?**

Not "what's the plan" or "when is the right time." Just: what would have to be true? 

Name the condition. Then ask if that condition is real or imagined.

---

*ARCADE — Creative Director, Echo's Vault*
*March 22, 2026 — Week 5*

> *"Drift isn't a decision. Make the decision."*
