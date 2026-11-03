> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/skills/cooking.md).

# Cooking

Meals are energy.

Raw food gives no energy. Cook it first.

<figure><img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-b4939b2f4e88eab1bb717d4cfc9c6c010f2dffc0%2Fthe-hearth.png?alt=media" alt="The cooking window"><figcaption><p>The hearth.</p></figcaption></figure>

* Cook at the stove in your **cottage** or at the **Bakery**. It's free.
* Every dish has its own ingredients, by name. Put each one into the pot yourself.
* There's no limit on how much you eat.
* Shops don't buy dishes. Sell them at the [Market Hall](/money-and-trade/market-hall.md).

|                                                                                                                                                                                                                                                   | Dish            | Needs                    | Energy |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------ | ------ |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-c5a54c3845db5fbc2164292c795113a359c9700c%2Fvegetable-plate.png?alt=media" alt="" data-size="original"> | Vegetable Plate | Carrot, Potato           | 2      |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-9f55acb9d33d0bd1be30ff273c05ccb5950e3531%2Fgarden-salad.png?alt=media" alt="" data-size="original">    | Garden Salad    | Cabbage, Tomato          | 3      |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-02472053e9c24c031ea093989c3ee708be8da38b%2Fbread.png?alt=media" alt="" data-size="original">           | Bread           | 2 Wheat                  | 4      |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-ad297a3abe391d7bbed911505f77942cb8fb5f73%2Ffried-fish.png?alt=media" alt="" data-size="original">      | Fried Fish      | Carp                     | 5      |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-85aec5daed661992f748d4a7e1ef02ac416388cd%2Ffruit-jam.png?alt=media" alt="" data-size="original">       | Fruit Jam       | 2 Strawberries           | 6      |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-aec27861d1969233e79c82e1f58921a30cd96e77%2Fhearty-stew.png?alt=media" alt="" data-size="original">     | Hearty Stew     | Pike Fish, Potato, Onion | 22     |
| <img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-47e16d482daf42f6b64ec9b86a0e2390d9bede27%2Fmoonlight-stew.png?alt=media" alt="" data-size="original">  | Moonlight Stew  | A secret, from the story | 25     |


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/skills/cooking.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
