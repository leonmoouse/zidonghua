import type { QuadrantKey, QuadrantTitles } from '../lib/types';

interface TitleQuadrantProps {
  quadrants: QuadrantTitles;
  selectedTitle?: string;
  onSelect: (title: string) => void;
}

const quadrantLabels: Record<QuadrantKey, string> = {
  behavior: '行为视角',
  emotion: '情绪视角',
  mechanism: '机制视角',
  philosophy: '哲思视角'
};

const TitleQuadrant = ({ quadrants, onSelect, selectedTitle }: TitleQuadrantProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(Object.keys(quadrants) as QuadrantKey[]).map((key) => (
        <section key={key} className="rounded-lg border bg-white p-4 shadow-sm">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">{quadrantLabels[key]}</h3>
            <span className="text-xs text-slate-400">共 {quadrants[key]?.length ?? 0} 条</span>
          </header>
          <ul className="space-y-2">
            {quadrants[key]?.map((title) => {
              const isSelected = title === selectedTitle;
              return (
                <li key={title}>
                  <button
                    type="button"
                    onClick={() => onSelect(title)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition hover:border-primary hover:bg-blue-50 ${
                      isSelected ? 'border-primary bg-blue-100 font-semibold text-primary' : 'border-slate-200 bg-white'
                    }`}
                  >
                    {title}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};

export default TitleQuadrant;
