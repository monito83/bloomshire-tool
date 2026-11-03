> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/playing/your-character.md).

# Your Character

Your look, your name, your settings.

<figure><img src="https://2398763816-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FnpKFpukS6TEdxHuYNYUd%2Fuploads%2Fgit-blob-dcbf5664d9f003039473729af50005a188f9835b%2Fcharacter.png?alt=media" alt="The character screen"><figcaption><p>Press L, or click your face.</p></figcaption></figure>

* **Look:** skin, eyes, hair, clothes and hat. Change it any time, for free.
* **Name:** change it on the same screen.
* **Settings** (gear button): volume, interface size, theme and language.
* **Show other players:** turn it off in Settings and other farmers vanish for you. They still see you, and the chat still shows their words.
* **Signing in:** stay signed in for 2 days, 3 days or a week. Save & quit asks whether to sign out too.
* **Chat:** press `Enter`. Be nice. Admins can mute.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/playing/your-character.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
