> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/the-world/bloomshire.md).

# Bloomshire

The town.

The town where you buy, sell and pick up most quests. It's safe: nothing hostile comes in.

<figure><img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-cfc626588ae6270ad6e424d52c9e7a8306429524%2Ftown-square.png?alt=media" alt="The town square"><figcaption><p>The square.</p></figcaption></figure>

| Building            | Who      | For                                                        |
| ------------------- | -------- | ---------------------------------------------------------- |
| Seed & Tool Shop    | Hazel    | Seeds, basic tools                                         |
| General Store       | Odette   | Buys almost anything. Daily [orders](/playing/orders.md)   |
| The Forge           | Bram     | Axes and pickaxes                                          |
| Carpenter           | Pell     | Wood                                                       |
| Fisherman's cottage | Wren     | Rods. Buys fish                                            |
| Bakery              | Tamsin   | Dishes, and a stove                                        |
| Apothecary          | Juniper  | Herb seeds                                                 |
| Market Hall         | Rowan    | [Sell to players](/money-and-trade/market-hall.md), chests |
| Bank                | Farthing | Keep your Gold                                             |
| Exchange            | Quill    | [Swaps and coin trades](/money-and-trade/trading.md)       |
| Storehouse          |          | Your chest in town                                         |

Roads: **west** to Whisperwood, **north** to Moonmere, **east** to Stonepeak. The boat home is at the jetty in the south.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/the-world/bloomshire.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
