> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/getting-started/what-is-bloomshire.md).

# What is Bloomshire?

The short version.

A cozy farming game with a shared world. Nothing to install, and you sign in with your crypto wallet.

<figure><img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-d9dd251b85bb19ed92aac1d69d6055d59db1091a%2Ftown-hud.png?alt=media" alt="Playing in the town of Bloomshire"><figcaption><p>An afternoon in town.</p></figcaption></figure>

* **Farm:** 36 crops, from 2-minute carrots to 5-hour Star Fruit.
* **Fish:** rivers, ponds and a big lake. One fish only bites at night.
* **Mine:** twelve cave levels, from copper to diamonds.
* **Cook:** meals are how you get energy back.
* **Quests:** the townsfolk's jobs, and the Founding Farmers story.
* **Trade:** sell to players at the Market Hall, or trade face to face.

|           |                                                                                          |
| --------- | ---------------------------------------------------------------------------------------- |
| Plays in  | Your browser, on a computer or a phone held sideways                                     |
| Sign in   | An EVM wallet: MetaMask, Trust Wallet, Robinhood Wallet, OKX, Bitget, Rainbow and others |
| Languages | English, Tiếng Việt, Bahasa Indonesia, 中文                                                |
| Status    | Private beta                                                                             |


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/getting-started/what-is-bloomshire.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
