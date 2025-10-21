import type { PipelineStage, PipelineStatusState } from '../lib/types';

interface ProgressPanelProps {
  stage: PipelineStage;
  status: PipelineStatusState;
  progress: number;
  message?: string;
}

const stageText: Record<PipelineStage, string> = {
  INIT: '准备中',
  P1: '生成初稿（P1）',
  P2: '模板注入（P2）',
  P3: '语气调校（P3）',
  P4: '证据融合（P4）',
  DONE: '已完成',
  ERROR: '出错'
};

const statusColor: Record<PipelineStatusState, string> = {
  PENDING: 'bg-slate-200',
  RUNNING: 'bg-blue-500',
  DONE: 'bg-emerald-500',
  ERROR: 'bg-red-500'
};

const ProgressPanel = ({ stage, status, progress, message }: ProgressPanelProps) => {
  const safeProgress = Math.min(100, Math.max(0, progress));

  return (
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">生成进度</h2>
      <p className="mt-2 text-sm text-slate-600">当前阶段：{stageText[stage]}</p>
      <div className="mt-4 h-3 w-full rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${statusColor[status]}`}
          style={{ width: `${safeProgress}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>状态：{status === 'ERROR' ? '发生错误' : status === 'DONE' ? '已完成' : '进行中'}</span>
        <span>{safeProgress.toFixed(0)}%</span>
      </div>
      {message && <p className="mt-3 rounded bg-red-50 p-3 text-xs text-red-600">{message}</p>}
    </section>
  );
};

export default ProgressPanel;
