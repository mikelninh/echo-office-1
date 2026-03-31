# DESIGN WEEKLY — March 8, 2026
*ARCADE's Sunday Briefing — Cycle 4*

---

## What Shipped This Week

Slim week on features — mostly monitor sync noise. One real ship:

**wins.html** — A full alert history page with live outcome data from outcomes.json, a filterable stats bar (total alerts, avg steal score, avg profit, legendary count), and a free tier FAQ explaining the 48h delay trust bridge. Also: nav link from card-sniper.html pointing to it.

The monitor itself is quietly scaling: 2,929 cards tracked, 2,742 scanned as of Tuesday. Infrastructure is holding.

**Direction check:** wins.html is the right move — social proof is the second sale. But looking at the broader week, it was essentially one feature and a lot of cron noise. That's a signal.

---

## One Thing Working Better Than Expected

**The Hunt Monitor is becoming infrastructure.** 2,900+ cards tracked, running daily, catching real alerts (Luffy OP01 at 51% below market on Monday). That's not a side project anymore — that's a data pipeline. The fact that it runs without babysitting means your engineering hours can go elsewhere. This is compounding value. You built a machine; the machine is running.

---

## One Thing That Concerns Me

**Last week I asked who your user is: the collector or the player.** A week later, I still don't have an answer from the product. The wins.html and card-sniper.html are pulling hard toward "TCG price intelligence SaaS." Echo's Vault — companion, claw, NPC society, spectator mode — hasn't had a commit in over two weeks.

I'm not saying SaaS is wrong. I'm saying the drift is getting harder to reverse. If the next 30 days are all card-sniper features and zero vault commits, you'll wake up and realize the vault is a mood board, not a product.

---

## Top 3 Priorities This Week

1. **Ship the Free Telegram Tier** — This has been P0 since Feb 27. It's still not live. The free-alert-queue.json and 48h delay logic are described; wins.html even has an FAQ about it. But is @CardSniperFree actually sending delayed alerts? If not, fix that before anything else. Your funnel has a broken top.

2. **Answer the user question with a commit** — One vault commit this week. Anything. Companion greeting screen, affiliate link on a claw prize, a Station News feed item. Not for completeness — for clarity. Force yourself to ship something in the vault so you know whether you're still building it or just hoping you are.

3. **Outcome tracker cron** — Still P1 from NIGHTBUILD. wins.html reads from outcomes.json but the tracker isn't running automatically. Without daily outcome syncs, your social proof page goes stale. Wire the 2 PM Berlin cron.

---

## This Week's Design Question

Last week: *"Who is your user — the collector or the player?"*

No answer yet. So I'm sharpening it:

> **If Echo's Vault disappeared tomorrow and only Card Sniper survived, would that be okay?**

Not a trick question. If the answer is yes — build Card Sniper. Hard. Fast. The vault is set dressing.

If the answer is no — then what, specifically, is in the vault that Card Sniper can't replace? Name it. Then ship it this week.

One of those two things has to happen. The middle path is where products go to die slowly.

---

*ARCADE — Creative Director, Echo's Vault*
*March 8, 2026 — Week 4*

> *"A week with one real ship and no vault commits isn't a slow week. It's a choice. Make sure it's the choice you meant to make."*
