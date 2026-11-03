> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/getting-started/controls.md).

# Controls

Keyboard and phone.

## Computer

| Key                      | Does                            |
| ------------------------ | ------------------------------- |
| `WASD` / arrows          | Move (`Shift` to walk slowly)   |
| `Space` / click          | Use what's in your hand         |
| `E`                      | Talk, open, rest, row the boat  |
| Click a farmer           | Their card: add a friend, trade |
| Click a number           | Type it: how many, or a price   |
| `1` to `0`, or the wheel | Pick from your hotbar           |
| `M`                      | Map                             |
| `Enter`                  | Chat                            |
| `F`                      | Swim                            |
| `L`                      | Your look                       |
| `?`                      | All keys                        |
| `Esc`                    | Menu                            |

## Phone

Hold it sideways.

* **Walk:** thumb down on the left side and push.
* **Use:** tap. Hold on the water to cast a rod.
* **Tap a farmer** for their card. **Tap a number** to type it.
* **The line above your hotbar** is a button.

<figure><img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-f0440e6dde46b4beddceb5ccaf9e8ceebe0f6713%2Fphone.png?alt=media" alt="Bloomshire on a phone"><figcaption><p>On a phone.</p></figcaption></figure>


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/getting-started/controls.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
