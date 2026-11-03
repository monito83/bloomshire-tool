> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/skills/skills.md).

# Your Skills

Ten skills, levels 1 to 30.

Ten skills, each from level 1 to 30. You level up by doing the work.

<figure><img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-4cd12bc89ddf7b20d7509e8afb3d1b3a7f83c40e%2Fskills-book.png?alt=media" alt="The skills book"><figcaption><p>The skills book.</p></figcaption></figure>

| Skill                                                                 | Levels up from                             |
| --------------------------------------------------------------------- | ------------------------------------------ |
| Farming                                                               | Harvests and crop orders                   |
| Fishing, Mining, Foraging                                             | [General Store orders](/playing/orders.md) |
| Woodcutting, Cooking, Combat, Crafting, Animal Husbandry, Exploration | Coming later                               |

Your Farming level unlocks new seeds at the shops.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/skills/skills.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
