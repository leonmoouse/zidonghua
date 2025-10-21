interface FinalCardProps {
  title: string;
  variant: 'A' | 'B';
  content: string;
  onCopy: (content: string) => void;
  onDownload: (content: string) => void;
}

const FinalCard = ({ title, variant, content, onCopy, onDownload }: FinalCardProps) => {
  return (
    <article className="flex h-full flex-col rounded-lg border bg-white shadow-sm">
      <header className="flex items-center justify-between border-b px-5 py-3">
        <h3 className="text-base font-semibold text-slate-800">方案 {variant}</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-1 text-xs hover:border-primary hover:text-primary"
            onClick={() => onCopy(content)}
          >
            复制
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-1 text-xs hover:border-primary hover:text-primary"
            onClick={() => onDownload(content)}
          >
            下载 Markdown
          </button>
        </div>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-slate-700">
        <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
        <pre className="whitespace-pre-wrap break-words text-sm">{content}</pre>
      </div>
    </article>
  );
};

export default FinalCard;
