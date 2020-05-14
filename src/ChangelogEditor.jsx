import { Suspense } from "preact/compat";
import { useState, useMemo } from "preact/hooks";
import MarkdownPreview from "./MarkdownPreview";
import Logo from "./Logo";

const markdownFallback = (
  <div class="flex-1 text-gray-600 markdown-body p-4 flex justify-center items-center self-center">
    <Logo width={64} height={64} />
  </div>
);

export default function ChangelogEditor({
  login,
  repo,
  content,
  onContentChange,
}) {
  return (
    <div class="flex items-stretch w-full max-w-5xl bg-white rounded-md p-4">
      <textarea
        style={{ minHeight: "24rem" }}
        class="flex-1 bg-transparent p-4 text-gray-900 mr-4 border-r font-mono text-sm leading-relaxed"
        value={content}
        onInput={(e) => onContentChange(e.target.value)}
      />
      <Suspense fallback={markdownFallback}>
        <MarkdownPreview
          class="flex-1 text-gray-600 markdown-body p-4"
          login={login}
          repo={repo}
          markdown={content}
        />
      </Suspense>
    </div>
  );
}
