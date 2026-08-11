import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  p: ({ children }) => <p className="m-0 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  ul: ({ children }) => <ul className="m-0 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="m-0 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="my-0.5">{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
      {children}
    </a>
  ),
  code: ({ children }) => <code className="rounded bg-black/5 px-1 py-0.5 text-xs">{children}</code>,
  table: ({ children }) => (
    <div className="-mx-1 my-1 overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
  th: ({ children }) => <th className="px-2 py-1 text-left font-semibold text-ink">{children}</th>,
  td: ({ children }) => <td className="border-t border-border px-2 py-1">{children}</td>,
};

export function MessageContent({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
