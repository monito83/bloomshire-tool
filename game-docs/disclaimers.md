> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/disclaimers.md).

# Disclaimers

Please read.

* **In development.** Bloomshire is in a private beta. Numbers change, and anything planned may change or not happen.
* **On chain:** Averyn Shards (AVS), from October 1, 12:00 UTC, its price set by the market. And the [Founding Farmers](/token-and-nfts/founding-farmers.md) on Robinhood Chain, contract `0xC53870Cf1381f2848dFfFD2Fd4FfB585bD1b0e9c`, minting October 15. Land and Farming Points don't exist yet.
* **Not financial advice.** Crypto is risky. You can lose everything you put in.
* **Your wallets.** Signing in only signs a message. The Bloomshire Wallet is yours alone: we never see its password or words, so we can't recover it.
* **We will never ask for your seed phrase, recovery words or private key.** Anyone who does isn't us.
* **Watch for fakes.** The game is `bloomshire.xyz`, the docs are `docs.bloomshire.xyz`. The AVS contract address only comes from our official announcements.
* **Accuracy.** If these docs and the game disagree, the game is right.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/disclaimers.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
