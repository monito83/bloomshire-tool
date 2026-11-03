> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/skills/woodcutting-and-foraging.md).

# Woodcutting & Foraging

Maples and mushrooms.

## Woodcutting

* Only **maples** can be cut. Find them in Maplewood, [Whisperwood](/the-world/whisperwood.md).
* Four axe blows fell a tree (1 energy each). It grows back in about 10 minutes.

|                                                                                                                                                                                                                                         |       | Sells for |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------- |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-c729e4a8276ace7e4ad1d71c11e659c0f96639e0%2Fwood.png?alt=media" alt="" data-size="original">  | Wood  | 29        |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-39c78e8f12be409182b510dcbc532cefaf696aa4%2Fstone.png?alt=media" alt="" data-size="original"> | Stone | 14        |

## Foraging

* Pick wild mushrooms in Whisperwood and Moonmere. 1 energy each.
* They grow back in about 30 minutes.

|                                                                                                                                                                                                                                                      |                 | Sells for |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | --------- |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-2b20e1d35f4b230145d8e7d280d3e30720c4732b%2Fsilvercap-mushroom.png?alt=media" alt="" data-size="original"> | Silvercap       | 160       |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-566948ec47017da745d38e80b147bc265c76513b%2Fglowcap-mushroom.png?alt=media" alt="" data-size="original">   | Glowcap (rarer) | 210       |


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/skills/woodcutting-and-foraging.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
