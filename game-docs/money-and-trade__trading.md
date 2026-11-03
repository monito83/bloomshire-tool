> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/money-and-trade/trading.md).

# Trading with Players

Face to face, and at the Exchange.

## Face to face

* Click or tap a farmer to open their card, then press **Trade**.
* Choose who may ask you in the **Friends** window: **Anyone**, **Friends only** or **Nobody**. A trade needs both of you to allow it.
* Friends can trade from anywhere. Anyone else must be on the same map.
* Both of you add items and coins, then both confirm.
* Any change resets both confirmations, so nobody can switch things at the last second.
* 2.5% fee on coins. Quest items and chests can't be traded.

## The Exchange

Talk to **Quill**.

<figure><img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-49d2f41c36330292863bdc223fe1b49ac9f7ec27%2Fthe-exchange.png?alt=media" alt="The Exchange"><figcaption><p>The Exchange.</p></figcaption></figure>

* **Materials:** fixed swaps, like 4 Wood for 5 Stone.
* **Currencies:** post an offer (for example, Shards for Gold) or take someone else's. Up to 5 offers at once.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/money-and-trade/trading.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
