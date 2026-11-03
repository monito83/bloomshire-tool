> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/skills/combat.md).

# Combat

The creatures of Whisperwood and the caves.

The town and your island are always safe. Creatures live in [Whisperwood](/the-world/whisperwood.md) and in [the caves](/the-world/the-caves.md).

<figure><img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-5ff099eecca44c38b3df8b4c20e2ee755b5f73b8%2Fforest-slimes.png?alt=media" alt="A slime by the Forgotten Shrine"><figcaption><p>A slime near the Forgotten Shrine.</p></figcaption></figure>

* **Weapons:** a sword from Marlow, better ones from the story. They never wear out. Rarer weapons hit harder (an Epic one twice as hard).
* **One blow, one creature:** a sword hits the nearest creature in front of you.
* **Energy:** you need a little energy to swing. Every 3 hits that land cost 1 energy. Misses are free.
* **Slimes** attack on sight. **Myconids** and **Sprout Slimes** only fight back. The **Golden Slime** at the Fairy Ring is a real fight.
* **Watch for the flash.** A creature stops and flashes before it strikes. Step away and it misses. Hit it first and the blow never comes.
* **They stick together.** Fight one and others nearby join in.
* **The Golden Slime** sometimes leaps onto where you stand. Keep moving.
* **Every kill drops a little Gold.** The Golden Slime drops a lot.
* Low on health? Eat cooked food. If it runs out, you wake up at home. Your bed heals you fully.

## In the caves

<figure><img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-23efac197439c7de91335be9af2d4d21994028d2%2Fcave-spiders.png?alt=media" alt="Venom spiders in the Green Vein"><figcaption><p>Venom spiders in the Green Vein. One waits in the dark.</p></figcaption></figure>

* Every cave has its own **spiders**, and some have **slimes**. The deeper the cave, the harder they bite.
* **Poison** (green): some spiders poison you. You lose a little health every second for a few seconds.
* **Burning** (orange): ember and cinder spiders and the lava slimes set you alight. The same, a little faster.
* Another bite keeps it going. Step back, eat, or finish the fight.
* **Watch the dark.** Your lantern lights only a little. A spider out in the dark shows only its eyes.
* **Two bosses:** the **Bone Spider** at the bottom of the Gloom and the **Vault Queen** in the Sunken Vault. Both poison, both pay well.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/skills/combat.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
