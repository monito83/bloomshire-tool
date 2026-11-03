> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/readme.md).

# Bloomshire

A farming game you play in your browser, with other people.

A pixel-art farming game in your browser, in a world you share with other players.

<figure><img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-cfc626588ae6270ad6e424d52c9e7a8306429524%2Ftown-square.png?alt=media" alt="The town square in Bloomshire"><figcaption><p>The square in Bloomshire.</p></figcaption></figure>

* Farm your own island
* Fish, mine, forage and cook
* Follow the Founding Farmers story
* Trade with other players

{% hint style="info" %}
The [Founding Farmers](/token-and-nfts/founding-farmers.md) mint is on **October 15** on OpenSea, free for GTD and FCFS. The game opens again with Season 0.
{% endhint %}

New? Start with [Your First Days](/getting-started/your-first-days.md).


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/readme.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
