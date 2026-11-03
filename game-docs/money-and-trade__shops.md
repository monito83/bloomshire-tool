> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/money-and-trade/shops.md).

# Shops

Who sells what, and who buys.

Talk to a shopkeeper and pick **Buy and sell**.

<figure><img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-5e40bac2e0f87bcd2286650e66bea4a3e6d1cc38%2Fseed-shop.png?alt=media" alt="Hazel&#x27;s seed shop"><figcaption><p>Hazel's seeds. More unlock as your Farming level rises.</p></figcaption></figure>

| Shop                   | Sells                                                              | Buys             |
| ---------------------- | ------------------------------------------------------------------ | ---------------- |
| Seed & Tool (Hazel)    | Seeds, hoe, watering can, sickle, the shovel, Iron axe and pickaxe | Seeds, crops     |
| General Store (Odette) | Wood, Stone                                                        | Almost anything  |
| The Forge (Bram)       | Axes, pickaxes                                                     | Wood, Stone, ore |
| Carpenter (Pell)       | Wood                                                               | Wood, Stone      |
| Fisherman (Wren)       | Rods                                                               | Fish             |
| Bakery (Tamsin)        | 4 simple dishes                                                    | Crops            |
| Apothecary (Juniper)   | Herb seeds                                                         | Crops            |

* Every shop pays the **same price** for the same thing.
* Buying or selling by the stack, type how many. Click the number to change it.
* Shops don't buy dishes, tools or quest items.
* **The Bank** (Farthing) keeps your Gold safe.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/money-and-trade/shops.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
