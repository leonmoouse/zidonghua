import { useNavigate } from 'react-router-dom';
import { useJobStore } from '../lib/store';

const statusText: Record<string, string> = {
  PENDING: '排队中',
  RUNNING: '进行中',
  DONE: '已完成',
  ERROR: '失败'
};

const JobCenter = () => {
  const navigate = useNavigate();
  const jobs = useJobStore((state) => state.jobs);

  if (jobs.length === 0) {
    return null;
  }

  return (
    <aside className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700">任务中心</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {jobs.map((job) => (
          <li key={job.jobId}>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-left hover:border-primary"
              onClick={() => navigate(`/result/${job.jobId}`)}
            >
              <span className="truncate text-slate-700">{job.title || job.jobId}</span>
              <span className="text-xs text-slate-500">{statusText[job.status]}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default JobCenter;
