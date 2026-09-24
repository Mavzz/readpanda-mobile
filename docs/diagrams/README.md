# Comments — end-to-end sequence diagrams

The in-book comment layer spans four boundaries: the native reader, the React
Native bridge, the Zustand store, and the API. These diagrams trace each flow
across all four.

| Diagram | Flow |
| --- | --- |
| [comments-01-load.mmd](comments-01-load.mmd) | Entering the reader — fetch the conversation and draw it on the page |
| [comments-02-open-thread.mmd](comments-02-open-thread.mmd) | Opening a thread from a gutter dot, a prop, or the header icon, and the read receipt |
| [comments-03-post.mmd](comments-03-post.mmd) | Posting a comment or reply, with both the 201 and failure branches |
| [comments-04-retry-like.mmd](comments-04-retry-like.mmd) | Retrying a failed comment, and liking one |

## Participants

| Alias | File |
| --- | --- |
| `SH` | `ios/CommentSheetView.swift` |
| `NV` | `ios/RNPdfViewer.swift` — `RNPdfView` |
| `JS` | `src/components/PdfViewer.js` |
| `MS` | `src/screens/ManuscriptScreen.js` |
| `ST` | `src/stores/commentsStore.js` |
| `API` | `src/services/commentsService.js` |

Props and events between `NV` and `JS` all pass through the
`RCT_EXPORT_VIEW_PROPERTY` declarations in `ios/RNPdfViewer.m`.

## What the diagrams make visible

**There is no inbound path.** Every arrow into `commentsStore` starts from a
reader action or the mount effect. Nothing pushes — no socket, no poll — so
comments written by other readers only appear when `loadComments` runs again on
re-entering the screen.

**Optimistic state is the render contract.** The native side never tracks
in-flight writes. `pending`, `failed` and `read` all arrive inside the `threads`
prop, so the sheet renders the entire lifecycle from data it was handed.

**A draft is tracked by page and passage, not by key.** The store mints a local
`pending:<clientId>` anchor key and swaps in the server's key when the write
lands. `SheetTarget.draft` matches on page plus anchor text instead — the same
rule `addComment` uses to place a comment — so the sheet survives the key swap
mid-post. This appears in diagram 3 as the step right after the optimistic
insert, and again at the 201 branch.

## Rendering

These are plain Mermaid (`.mmd`) sources, renderable without the surrounding
markdown:

```sh
# one-off PNG or SVG
npx -y @mermaid-js/mermaid-cli -i comments-03-post.mmd -o comments-03-post.svg
```

They also render inline on GitHub when embedded in a fenced `mermaid` block, and
in VS Code via the Markdown Preview Mermaid Support extension. For a quick look,
paste the file contents into <https://mermaid.live>.
