import axios from 'axios';
import { appConfig } from './config';
import type {
  AddAuthorReq,
  AddAuthorResp,
  AuthorsListResp,
  P0TitlesReq,
  P0TitlesResp,
  PipelineResultResp,
  PipelineStartReq,
  PipelineStartResp,
  PipelineStatusResp,
  VoicesListResp
} from './types';

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: appConfig.requestTimeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const detail = error.response.data?.detail || error.response.data?.message;
      const message = typeof detail === 'string' ? detail : '服务器返回错误';
      return Promise.reject(new Error(message));
    }
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('请求超时，请稍后重试'));
    }
    return Promise.reject(new Error('网络异常，请检查连接'));
  }
);

export const fetchP0Titles = async (payload: P0TitlesReq) => {
  const { data } = await apiClient.post<P0TitlesResp>('/api/p0/titles', payload);
  return data;
};

export const fetchAuthors = async () => {
  const { data } = await apiClient.get<AuthorsListResp>('/api/authors');
  return data;
};

export const addAuthor = async (payload: AddAuthorReq) => {
  const { data } = await apiClient.post<AddAuthorResp>('/api/authors', payload);
  return data;
};

export const fetchVoices = async (author: string) => {
  const { data } = await apiClient.get<VoicesListResp>('/api/voices', {
    params: { author }
  });
  return data;
};

export const startPipeline = async (payload: PipelineStartReq) => {
  const { data } = await apiClient.post<PipelineStartResp>('/api/pipeline/start', payload);
  return data;
};

export const fetchPipelineStatus = async (jobId: string) => {
  const { data } = await apiClient.get<PipelineStatusResp>('/api/pipeline/status', {
    params: { job_id: jobId }
  });
  return data;
};

export const fetchPipelineResult = async (jobId: string) => {
  const { data } = await apiClient.get<PipelineResultResp>('/api/pipeline/result', {
    params: { job_id: jobId }
  });
  return data;
};
