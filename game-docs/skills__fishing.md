> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/skills/fishing.md).

# Fishing

Cast, wait, strike.

<figure><img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-19b9e372ba3728b3de25c76434ee0872863fb766%2Ffishing.png?alt=media" alt="A fish on the line"><figcaption><p>A bite. Strike when the needle is in the green.</p></figcaption></figure>

1. Face the water with a rod in hand.
2. **Hold** `Space` to wind up, **let go** to cast.
3. When a fish bites, press `Space` while the needle is in the **green band**.

* Better rods make the green band wider. See [Tools](/playing/tools.md).
* The green band is always the rod you **cast** with.
* While your line is out, leave your hotbar alone. Pick another slot or move anything on it, and the line comes in.
* Each cast costs 1 energy.
* Wren buys fish.

|                                                                                                                                                                                                                                                 | Fish          | Where                   | Sells for |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------- | --------- |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-e2528b1f5f2ae826fc8ed6f666e90d0e00407b2f%2Fcarp.png?alt=media" alt="" data-size="original">          | Carp          | Anywhere                | 53        |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-bed02a52890dea73cdb20924f83e0f7c68b064b6%2Fchub.png?alt=media" alt="" data-size="original">          | Chub          | Anywhere                | 59        |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-4121c76d3c80df813239494315f5ac126ec8c895%2Fsunfish.png?alt=media" alt="" data-size="original">       | Sunfish       | Anywhere                | 66        |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-1747b26eefa1a42c2e53fa156af2078e9e44fed7%2Fperch.png?alt=media" alt="" data-size="original">         | Perch         | Anywhere                | 81        |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-c5c0e0c576e41061775ed684f5078867f1bf16c2%2Fpike-fish.png?alt=media" alt="" data-size="original">     | Pike Fish     | Anywhere                | 150       |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-0e670c1194904b27229a09d200093fd72d330a66%2Ftiger-trout.png?alt=media" alt="" data-size="original">   | Tiger Trout   | Anywhere                | 210       |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-2c00ad54387ff0a7028c9ef06a97ff11b0c53ae4%2Fghost-catfish.png?alt=media" alt="" data-size="original"> | Ghost Catfish | Moonmere, at night      | 515       |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-7210d8ea9a1519a965258f98b5d1973d18613d89%2Fgolden-fish.png?alt=media" alt="" data-size="original">   | Golden Fish   | The river by town. Rare | 905       |


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/skills/fishing.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
