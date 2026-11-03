> For the complete documentation index, see [llms.txt](https://docs.bloomshire.xyz/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.bloomshire.xyz/playing/energy-and-health.md).

# Energy & Health

The green bar and the red bar.

## Energy (green)

* You have **100**.
* Sowing, picking, chopping, mining, fishing and foraging cost **1**. Mining ore costs **2**.
* In a fight, every **3** hits that land cost **1**.
* Digging, watering, walking, talking and cooking are free.
* It doesn't refill on its own.

**To refill:**

* **Rest in your bed at home:** fills the bar over 1 hour. Once every 12 hours.
* **Eat cooked food:** up to 60 energy per 12 hours. Moonlight Stew has no limit.

{% hint style="info" %}
From Season 0, [Founding Farmer](/token-and-nfts/founding-farmers.md) holders get **150** energy, and it refills **twice as fast**.
{% endhint %}

## Health (red)

* You have **100**. Creatures lower it.
* Cooked food heals: twice the energy it gives, even when your energy is full.
* Run out and you wake up at home.
* Your bed heals you fully, any time.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation by asking a question.

Perform an HTTP GET request on the following URL with the `ask` and `goal` query parameters:

```
GET https://docs.bloomshire.xyz/playing/energy-and-health.md?ask=<question>&goal=<user_goal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is what the user is ultimately trying to achieve, the reason they need the answer. Sharing it helps GitBook give you a better, more relevant answer. A goal is most helpful when it describes the outcome the user wants rather than restating the question. For example, with `ask=how do I create an API token`, a goal like `automate deployments from our CI pipeline` lets GitBook tailor the answer to that use case.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
