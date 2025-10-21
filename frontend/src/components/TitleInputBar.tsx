interface TitleInputBarProps {
  title: string;
  onChange: (value: string) => void;
  onNext: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const TitleInputBar = ({ title, onChange, onNext, loading, disabled }: TitleInputBarProps) => {
  return (
    <div className="sticky bottom-0 left-0 right-0 mt-6 border-t bg-white/95 p-4 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 md:flex-row md:items-end">
        <label className="flex-1 text-sm text-slate-600">
          <span className="mb-2 block font-medium text-slate-800">最终标题</span>
          <textarea
            value={title}
            onChange={(e) => onChange(e.target.value)}
            className="h-24 w-full rounded-md border border-slate-200 p-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30"
            placeholder="从上方选择或自行编辑标题，最多 120 字"
            maxLength={120}
          />
        </label>
        <button
          type="button"
          onClick={onNext}
          disabled={disabled || !title.trim() || loading}
          className="h-12 rounded-md bg-primary px-6 text-sm font-semibold text-white shadow hover:bg-secondary disabled:bg-slate-300"
        >
          {loading ? '处理中...' : '下一步'}
        </button>
      </div>
    </div>
  );
};

export default TitleInputBar;
