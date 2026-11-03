> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/the-world/the-caves.md).

# The Caves

Eight caves, twelve levels.

Very dark, full of ore and spiders, and part of the story.

<figure><img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-7de078f576a75da0b3a702dc65dbb239b869f162%2Fold-working.png?alt=media" alt="Inside the Old Working"><figcaption><p>The Old Working.</p></figcaption></figure>

| Cave                     | Region      | Levels | Way in         | Creatures                                                        |
| ------------------------ | ----------- | ------ | -------------- | ---------------------------------------------------------------- |
| Glimmer Hollow           | Whisperwood | 1      | Open           | Glimmer spiders, crystal slimes                                  |
| Grotto under Mirror Pond | Whisperwood | 1      | Story          | Pale spiders                                                     |
| The Old Cave             | Moonmere    | 1      | Bronze pickaxe | Drowned spiders (poison)                                         |
| The Old Working          | Stonepeak   | 2      | Open           | Pit and tunnel spiders, cave slimes                              |
| Topaz Drift              | Stonepeak   | 1      | Open           | Topaz spiders, crystal slimes                                    |
| The Green Vein           | Stonepeak   | 1      | Story          | Venom spiders (poison)                                           |
| The Gloom                | Stonepeak   | 3      | Story          | Ember and cinder spiders, lava slimes (burning); the Bone Spider |
| The Sunken Vault         | Stonepeak   | 2      | Story          | Gilded spiders (poison); the Vault Queen                         |

* **Ore:** your pickaxe decides what breaks. See [Mining](/skills/mining.md).
* **Creatures:** see [Combat](/skills/combat.md#in-the-caves).
* **Old chests:** usually a better tool inside. Yours once.
* Broken rock and ore **grow back**.

<figure><img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-8fb8742c9a1e0614caa9d26be2e2b507b1e4c467%2Fthe-gloom.png?alt=media" alt="The Bone Spider at the bottom of the Gloom"><figcaption><p>The bottom of the Gloom, and the Bone Spider.</p></figcaption></figure>


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/the-world/the-caves.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
