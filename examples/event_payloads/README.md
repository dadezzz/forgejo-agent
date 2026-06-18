# Event payloads

Saved on Forgejo version 15.0.3 to use as reference when constructing action
workflows.

```yaml
jobs:
  test:
    runs-on: srv-generic
    steps:
      - run: echo '${{ toJson(forge.event) }}'

on:
  issues:
    types:
      - opened
  pull_request:
    types:
      - opened
      - review_requested
  issue_comment:
    types:
      - created
```
