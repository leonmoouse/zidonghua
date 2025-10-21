import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthorSelect from '../components/AuthorSelect';
import ToneSelect from '../components/ToneSelect';
import IntentPicker from '../components/IntentPicker';
import {
  addAuthor,
  fetchAuthors,
  fetchVoices,
  startPipeline
} from '../lib/api';
import { showError, showInfo, showSuccess } from '../lib/notifications';
import { useJobStore } from '../lib/store';
import { isTitleValid, sanitizeTitle } from '../lib/validators';
import type { Author, WritingIntentKey } from '../lib/types';

const Step2Structure = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const title = useMemo(() => sanitizeTitle(searchParams.get('title') ?? ''), [searchParams]);

  const [authors, setAuthors] = useState<Author[]>([]);
  const [voices, setVoices] = useState<string[]>([]);
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [primaryIntent, setPrimaryIntent] = useState<WritingIntentKey | undefined>();
  const [secondaryIntents, setSecondaryIntents] = useState<WritingIntentKey[]>([]);
  const [loadingAuthors, setLoadingAuthors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const addJob = useJobStore((state) => state.addJob);

  useEffect(() => {
    const loadAuthors = async () => {
      try {
        setLoadingAuthors(true);
        const data = await fetchAuthors();
        setAuthors(data.authors ?? []);
      } catch (error) {
        const message = error instanceof Error ? error.message : '加载作者失败';
        showError(message);
      } finally {
        setLoadingAuthors(false);
      }
    };
    loadAuthors();
  }, []);

  useEffect(() => {
    const loadVoices = async () => {
      if (!selectedAuthor) {
        setVoices([]);
        setSelectedVoice('');
        return;
      }
      try {
        const data = await fetchVoices(selectedAuthor);
        const available = data.voices ?? [];
        setVoices(available);
        setSelectedVoice(available[0] ?? '');
      } catch (error) {
        const message = error instanceof Error ? error.message : '获取语气失败';
        showError(message);
      }
    };
    loadVoices();
  }, [selectedAuthor]);

  if (!isTitleValid(title)) {
    return (
      <section className="rounded-lg border bg-white p-6 text-sm text-slate-600 shadow-sm">
        <p>未检测到有效标题，请先完成步骤一。</p>
        <button
          type="button"
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
          onClick={() => navigate('/')}
        >
          返回标题生成
        </button>
      </section>
    );
  }

  const handleAddAuthor = async (name: string) => {
    try {
      const { authors: updated } = await addAuthor({ name });
      showSuccess('已添加新作者');
      setAuthors(updated);
      setSelectedAuthor(name);
    } catch (error) {
      const message = error instanceof Error ? error.message : '新增作者失败';
      showError(message);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAuthor) {
      showInfo('请选择作者');
      return;
    }
    if (!selectedVoice) {
      showInfo('请选择语气');
      return;
    }
    if (!primaryIntent) {
      showInfo('请选择主写作目的');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title,
        author: selectedAuthor,
        voice: selectedVoice,
        primary_intent: primaryIntent,
        secondary_intents: secondaryIntents.filter(
          (intent, index, arr) => intent !== primaryIntent && arr.indexOf(intent) === index
        )
      };
      const { job_id } = await startPipeline(payload);
      addJob({
        jobId: job_id,
        title,
        createdAt: Date.now(),
        status: 'PENDING',
        stage: 'INIT',
        progress: 5
      });
      showSuccess('任务已启动，跳转至结果页');
      navigate(`/result/${job_id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '任务启动失败';
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">步骤二：配置结构与参数</h2>
        <p className="mt-2 text-sm text-slate-600">标题：{title}</p>
        <div className="mt-6 space-y-6">
          <AuthorSelect
            authors={authors}
            value={selectedAuthor}
            onChange={setSelectedAuthor}
            onAddAuthor={handleAddAuthor}
            disabled={loadingAuthors || submitting}
          />
          <ToneSelect
            voices={voices}
            value={selectedVoice}
            onChange={setSelectedVoice}
            disabled={submitting}
          />
          <IntentPicker
            primary={primaryIntent}
            secondary={secondaryIntents}
            onPrimaryChange={(intent) => setPrimaryIntent(intent)}
            onSecondaryChange={setSecondaryIntents}
          />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-white shadow hover:bg-secondary"
          >
            {submitting ? '提交中...' : '开始生成文案'}
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:border-primary"
            onClick={() => navigate(`/?title=${encodeURIComponent(title)}`)}
          >
            返回上一步
          </button>
        </div>
      </section>
    </div>
  );
};

export default Step2Structure;
