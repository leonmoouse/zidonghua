interface ToneSelectProps {
  voices: string[];
  value: string;
  onChange: (voice: string) => void;
  disabled?: boolean;
}

const ToneSelect = ({ voices, value, onChange, disabled }: ToneSelectProps) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">语气/声线</label>
      <select
        className="rounded-md border border-slate-200 p-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || voices.length === 0}
      >
        <option value="">请选择语气</option>
        {voices.map((voice) => (
          <option key={voice} value={voice}>
            {voice}
          </option>
        ))}
      </select>
      {voices.length === 0 && (
        <span className="text-xs text-slate-400">请先选择作者以加载可用语气</span>
      )}
    </div>
  );
};

export default ToneSelect;
