export type QuadrantKey = 'behavior' | 'emotion' | 'mechanism' | 'philosophy';

export interface P0TitlesReq {
  keywords: string[];
}

export type QuadrantTitles = Record<QuadrantKey, string[]>;

export interface P0TitlesResp {
  quadrants: QuadrantTitles;
}

export interface AuthorsListResp {
  authors: Author[];
}

export interface AddAuthorReq {
  name: string;
  description?: string;
  voices?: string[];
}

export interface AddAuthorResp {
  authors: Author[];
}

export interface VoicesListResp {
  author: string;
  voices: string[];
}

export type WritingIntentKey =
  | 'troubleshooting'
  | 'mythbusting'
  | 'mechanism'
  | 'howto'
  | 'conversion'
  | 'decision'
  | 'editorial'
  | 'mobilization';

export interface PipelineStartReq {
  title: string;
  author: string;
  voice: string;
  primary_intent: WritingIntentKey;
  secondary_intents?: WritingIntentKey[];
}

export interface PipelineStartResp {
  job_id: string;
}

export type PipelineStage = 'INIT' | 'P1' | 'P2' | 'P3' | 'P4' | 'DONE' | 'ERROR';

export type PipelineStatusState = 'PENDING' | 'RUNNING' | 'DONE' | 'ERROR';

export interface PipelineStatusResp {
  job_id: string;
  stage: PipelineStage;
  status: PipelineStatusState;
  progress: number; // 0-100
  message?: string;
}

export interface PipelineResultResp {
  job_id: string;
  title: string;
  final_a: string;
  final_b: string;
  variants?: Record<string, unknown>;
}

export interface JobSummary {
  jobId: string;
  title: string;
  createdAt: number;
  status: PipelineStatusState;
  stage: PipelineStage;
  progress?: number;
}

export interface Author {
  name: string;
  description?: string;
  voices: string[];
}
