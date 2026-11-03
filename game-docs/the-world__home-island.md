> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/the-world/home-island.md).

# Home Island

Your cottage, your field, your boat.

Where you start, and your home.

<figure><img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-5b635d6256bdbf2971255beb21df7391e15d9468%2Fhome-island.png?alt=media" alt="The home island"><figcaption><p>The cottage, the field and the jetty.</p></figcaption></figure>

* **Bed:** rest to refill energy and heal.
* **Stove:** cook here.
* **Chests:** store what you can't carry.
* **Field:** west of the cottage.
* **Boat:** at the jetty, to Bloomshire and back.

Nothing hostile ever comes here.

## Coming back

* Leave from your cottage and you come back inside it, by the door.
* Leave from the island and you come back on the island.
* Leave while resting in bed and you are still in bed.
* Leave from anywhere else and you come back in Bloomshire, by the fountain.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/the-world/home-island.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
