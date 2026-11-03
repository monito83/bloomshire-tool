> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/the-world/whisperwood.md).

# Whisperwood

The wood west of town.

A big wood at the end of the west road. Friendly near town, stranger the deeper you go.

<figure><img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-b2220d99e5624cb450dcffe544c1fb8f22de1b5c%2Fwhisperwood.png?alt=media" alt="Deer Glade in Whisperwood"><figcaption><p>Deer Glade.</p></figcaption></figure>

* **Maples** to chop, in Maplewood.
* **Mushrooms:** Silvercaps and Glowcaps.
* **Fishing** in the ponds.
* **Slimes and Myconids** in the far corners. See [Combat](/skills/combat.md).
* **Two caves:** Glimmer Hollow, and a grotto under Mirror Pond.

<figure><img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-a5ee1f7aa6ee0798e87df931c3f7b9af6259763f%2Fforest-myconids.png?alt=media" alt="Mushroom Hollow"><figcaption><p>Mushroom Hollow.</p></figcaption></figure>


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/the-world/whisperwood.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
