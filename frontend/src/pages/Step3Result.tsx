import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProgressPanel from '../components/ProgressPanel';
import FinalCard from '../components/FinalCard';
import { fetchPipelineResult, fetchPipelineStatus } from '../lib/api';
import { showError, showInfo, showSuccess } from '../lib/notifications';
import { appConfig } from '../lib/config';
import { updateJobStatus, useJobStore } from '../lib/store';
import type {
  PipelineResultResp,
  PipelineStage,
  PipelineStatusResp,
  PipelineStatusState
} from '../lib/types';

const Step3Result = () => {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId: string }>();
  const job = useJobStore((state) => state.jobs.find((item) => item.jobId === jobId));

  const [status, setStatus] = useState<PipelineStatusResp | null>(null);
  const [result, setResult] = useState<PipelineResultResp | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);
  const [polling, setPolling] = useState(true);

  const title = useMemo(() => result?.title ?? job?.title ?? '', [result?.title, job?.title]);

  useEffect(() => {
    if (!jobId) {
      return;
    }
    let timer: number | undefined;
    const poll = async () => {
      try {
        const data = await fetchPipelineStatus(jobId);
        setStatus(data);
        updateJobStatus(jobId, data.status, data.stage, data.progress);
        if (data.status === 'DONE') {
          setPolling(false);
          await loadResult(jobId);
        } else if (data.status === 'ERROR') {
          setPolling(false);
          showError(data.message ?? '生成过程中出现错误');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '状态查询失败';
        showError(message);
      }
    };
    poll();
    if (polling) {
      timer = window.setInterval(poll, appConfig.pollInterval);
    }
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, polling]);

  const loadResult = async (id: string) => {
    try {
      setLoadingResult(true);
      const data = await fetchPipelineResult(id);
      setResult(data);
      showSuccess('已获取最终文案');
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取结果失败';
      showError(message);
    } finally {
      setLoadingResult(false);
    }
  };

  if (!jobId) {
    return (
      <section className="rounded-lg border bg-white p-6 text-sm text-slate-600 shadow-sm">
        <p>未提供 job_id，无法显示结果。</p>
        <button
          type="button"
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
          onClick={() => navigate('/')}
        >
          返回首页
        </button>
      </section>
    );
  }

  const handleRetry = async () => {
    if (!title) {
      showInfo('缺少标题信息，无法重试');
      return;
    }
    navigate(`/structure?title=${encodeURIComponent(title)}`);
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showSuccess('已复制到剪贴板');
    } catch (error) {
      showError('复制失败，请手动复制');
    }
  };

  const handleDownload = (content: string, variant: 'A' | 'B') => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${jobId}_final_${variant}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const stage: PipelineStage = status?.stage ?? job?.stage ?? 'INIT';
  const state: PipelineStatusState = status?.status ?? job?.status ?? 'PENDING';
  const progress = status?.progress ?? job?.progress ?? (state === 'DONE' ? 100 : state === 'RUNNING' ? 60 : 5);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">步骤三：生成进度与结果</h2>
            <p className="text-xs text-slate-500">任务 ID：{jobId}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:border-primary"
              onClick={() => setPolling((prev) => !prev)}
            >
              {polling ? '暂停轮询' : '恢复轮询'}
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:border-primary"
              onClick={() => jobId && loadResult(jobId)}
              disabled={loadingResult}
            >
              {loadingResult ? '刷新中...' : '手动刷新结果'}
            </button>
          </div>
        </div>
        <div className="mt-6">
          <ProgressPanel
            stage={stage}
            status={state}
            progress={progress}
            message={status?.message}
          />
        </div>
        {state === 'ERROR' && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
              onClick={handleRetry}
            >
              重新设置参数
            </button>
          </div>
        )}
      </section>

      {result && state === 'DONE' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <FinalCard
            title={title}
            variant="A"
            content={result.final_a}
            onCopy={handleCopy}
            onDownload={(content) => handleDownload(content, 'A')}
          />
          <FinalCard
            title={title}
            variant="B"
            content={result.final_b}
            onCopy={handleCopy}
            onDownload={(content) => handleDownload(content, 'B')}
          />
        </div>
      ) : (
        <section className="rounded-lg border bg-white p-6 text-sm text-slate-600 shadow-sm">
          <p>结果生成后会自动展示，可手动刷新确认。</p>
        </section>
      )}
    </div>
  );
};

export default Step3Result;
