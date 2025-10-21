import type { Author } from '../lib/types';

interface AuthorSelectProps {
  authors: Author[];
  value: string;
  onChange: (author: string) => void;
  onAddAuthor: (name: string) => Promise<void>;
  disabled?: boolean;
}

const AuthorSelect = ({ authors, value, onChange, onAddAuthor, disabled }: AuthorSelectProps) => {
  const handleAdd = async () => {
    const name = window.prompt('请输入新的作者名称（将自动保存）：');
    if (name && name.trim()) {
      await onAddAuthor(name.trim());
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">选择作者</label>
      <div className="flex items-center gap-3">
        <select
          className="flex-1 rounded-md border border-slate-200 p-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">请选择作者</option>
          {authors.map((author) => (
            <option key={author.name} value={author.name}>
              {author.description ? `${author.name}｜${author.description}` : author.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-md border border-primary px-4 py-2 text-sm text-primary hover:bg-blue-50"
          disabled={disabled}
        >
          新增作者
        </button>
      </div>
    </div>
  );
};

export default AuthorSelect;
