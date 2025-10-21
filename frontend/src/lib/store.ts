import { create } from 'zustand';
import type { JobSummary, PipelineStage, PipelineStatusState } from './types';

interface JobStore {
  jobs: JobSummary[];
  addJob: (job: JobSummary) => void;
  updateJob: (jobId: string, payload: Partial<Pick<JobSummary, 'status' | 'stage' | 'progress'>>) => void;
}

export const useJobStore = create<JobStore>((set) => ({
  jobs: [],
  addJob: (job) =>
    set((state) => {
      const exists = state.jobs.find((item) => item.jobId === job.jobId);
      if (exists) {
        return {
          jobs: state.jobs.map((item) => (item.jobId === job.jobId ? { ...item, ...job } : item))
        };
      }
      return { jobs: [job, ...state.jobs].slice(0, 10) };
    }),
  updateJob: (jobId, payload) =>
    set((state) => ({
      jobs: state.jobs.map((item) =>
        item.jobId === jobId ? { ...item, ...payload } : item
      )
    }))
}));

export const updateJobStatus = (
  jobId: string,
  status: PipelineStatusState,
  stage: PipelineStage,
  progress?: number
) => {
  const payload: Partial<Pick<JobSummary, 'status' | 'stage' | 'progress'>> = { status, stage };
  if (typeof progress === 'number') {
    payload.progress = progress;
  }
  useJobStore.getState().updateJob(jobId, payload);
};
