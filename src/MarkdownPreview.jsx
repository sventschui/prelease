let markdownIt = null;
let markdownItError = null;
let markdownItLoadingPromise;

function loadMarkdownIt() {
  return import("esm.markdown-it/esm.markdown-it.esm.js")
    .then((mod) => mod.MarkdownIt)
    .then((MarkdownIt) => {
      markdownIt = new MarkdownIt();
    })
    .catch((e) => {
      console.log("error", e);
      markdownItError = new Error("Failed to load markdown it!");
      markdownItError.cause = e;
    });
}

window.addEventListener("load", () => {
  if (!markdownItLoadingPromise) {
    markdownItLoadingPromise = loadMarkdownIt();
  }
});

function linkIt(login, repo, content) {
  return content
    .replace(
      /#([0-9]+)/g,
      (fullMatch, no) =>
        `[${fullMatch}](https://github.com/${login}/${repo}/issues/${no})`
    )
    .replace(
      /@([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38})/gi,
      (fullMatch, user) => `[${fullMatch}](https://github.com/${user})`
    );
}

export default function MarkdownPreview({ class: cls, login, repo, markdown }) {
  if (!markdownItLoadingPromise) {
    markdownItLoadingPromise = loadMarkdownIt();
  }

  if (markdownItError) {
    throw markdownItError;
  }

  if (!markdownIt) {
    throw markdownItLoadingPromise;
  }

  return (
    <div
      class={cls}
      dangerouslySetInnerHTML={{
        __html: markdownIt.render(linkIt(login, repo, markdown)),
      }}
    />
  );
}
