import { intentOptions } from '../lib/config';
import type { WritingIntentKey } from '../lib/types';

interface IntentPickerProps {
  primary?: WritingIntentKey;
  secondary: WritingIntentKey[];
  onPrimaryChange: (intent: WritingIntentKey) => void;
  onSecondaryChange: (intents: WritingIntentKey[]) => void;
}

const IntentPicker = ({ primary, secondary, onPrimaryChange, onSecondaryChange }: IntentPickerProps) => {
  const toggleSecondary = (intent: WritingIntentKey) => {
    if (secondary.includes(intent)) {
      onSecondaryChange(secondary.filter((item) => item !== intent));
    } else {
      onSecondaryChange([...secondary, intent]);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-700">主写作目的（必选）</h4>
        <div className="space-y-2">
          {intentOptions.map((intent) => (
            <label
              key={intent.key}
              className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm transition hover:border-primary ${
                primary === intent.key ? 'border-primary bg-blue-50' : 'border-slate-200'
              }`}
            >
              <input
                type="radio"
                className="mt-1"
                checked={primary === intent.key}
                onChange={() => onPrimaryChange(intent.key)}
                name="intent-primary"
                value={intent.key}
              />
              <span>{intent.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-700">次要目的（可多选）</h4>
        <div className="space-y-2">
          {intentOptions.map((intent) => (
            <label
              key={intent.key}
              className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm transition hover:border-primary ${
                secondary.includes(intent.key) ? 'border-primary bg-emerald-50' : 'border-slate-200'
              }`}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={secondary.includes(intent.key)}
                onChange={() => toggleSecondary(intent.key)}
                value={intent.key}
              />
              <span>{intent.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IntentPicker;
