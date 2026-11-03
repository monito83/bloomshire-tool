> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/playing/friends-and-leaderboards.md).

# Friends & Leaderboards

Friends, and who's ahead.

## Friends

* Click or tap a farmer to open their card: their picture, name and level.
* **Add friend** sends a request. They accept it on your card, or in their **Friends** window.
* The **Friends** button, under your portrait, lists your friends and your requests.
* Friends can trade from anywhere. See [Trading with Players](/money-and-trade/trading.md).

## Leaderboards

The **Leaderboard** button, under your portrait, has three boards.

* **Story:** how far everyone is in the Founders' Story. Those who finished come first, in the order they finished.
* **Gold:** the most Gold in hand. Gold in the Bank doesn't count.
* **Shards:** the most Averyn Shards.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/playing/friends-and-leaderboards.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
