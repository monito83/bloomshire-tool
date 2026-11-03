> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/money-and-trade/wallet.md).

# The Bloomshire Wallet

Your crypto wallet inside the game.

A crypto wallet inside the game, so you don't need other wallet pop-ups. You still sign in with your usual wallet.

Open it with the **Wallet** button, above the Shop.

<figure><img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-bbca2061bb44feb0cabb76b5bcd6828a6a13a077%2Fwallet-swap.png?alt=media" alt="The Bloomshire Wallet"><figcaption><p>The wallet.</p></figcaption></figure>

## Set up

1. Pick a password.
2. Write down your **12 recovery words**.
3. Type two of them back.

Already have one? Choose **I have my 12 words**.

{% hint style="danger" %}
Your 12 words are the only way to recover your wallet. Nobody can reset them, not even us. **Never share them.** Bloomshire will never ask for them.
{% endhint %}

## Use

* **Receive:** your address and QR code. **Robinhood Chain only.**
* **Send:** check the address. Sends can't be undone.
* **Swap:** ETH, USDG and AVS, through Uniswap.
* **Deposit:** AVS into Shards. Opens October 1, 12:00 UTC.

Every send asks for your password. Keep a little ETH for network fees.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/money-and-trade/wallet.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
