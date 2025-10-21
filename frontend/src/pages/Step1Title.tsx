import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TitleQuadrant from '../components/TitleQuadrant';
import TitleInputBar from '../components/TitleInputBar';
import { fetchP0Titles } from '../lib/api';
import type { QuadrantTitles } from '../lib/types';
import { isTitleValid, sanitizeTitle } from '../lib/validators';
import { showError, showInfo, showSuccess } from '../lib/notifications';

const emptyQuadrants: QuadrantTitles = {
  behavior: [],
  emotion: [],
  mechanism: [],
  philosophy: []
};

const Step1Title = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTitle = useMemo(() => searchParams.get('title') ?? '', [searchParams]);

  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [quadrants, setQuadrants] = useState<QuadrantTitles>(emptyQuadrants);
  const [selectedTitle, setSelectedTitle] = useState(defaultTitle);

  const handleGenerate = async () => {
    const entries = keywords
      .split(/\n+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    if (entries.length === 0) {
      showInfo('请输入关键词后再生成标题');
      return;
    }
    try {
      setLoading(true);
      const data = await fetchP0Titles({ keywords: entries });
      setQuadrants(data.quadrants ?? emptyQuadrants);
      showSuccess('标题已生成，可点击选择');
    } catch (error) {
      const message = error instanceof Error ? error.message : '生成标题失败';
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const cleanTitle = sanitizeTitle(selectedTitle);
    if (!isTitleValid(cleanTitle)) {
      showError('标题不能为空且需少于 120 字');
      return;
    }
    navigate(`/structure?title=${encodeURIComponent(cleanTitle)}`);
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">步骤一：根据关键词生成标题</h2>
        <p className="mt-2 text-sm text-slate-600">输入你的核心关键词，系统将从四个视角生成候选标题。</p>
        <textarea
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          rows={4}
          className="mt-4 w-full rounded-md border border-slate-200 p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="请输入 1-3 行关键词，可用换行区分要点"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-white shadow hover:bg-secondary"
          >
            {loading ? '生成中...' : '生成标题'}
          </button>
          <span className="text-xs text-slate-500">生成后可点击任意候选填入下方标题框</span>
        </div>
      </section>

      <TitleQuadrant
        quadrants={quadrants}
        selectedTitle={selectedTitle}
        onSelect={setSelectedTitle}
      />

      <TitleInputBar
        title={selectedTitle}
        onChange={setSelectedTitle}
        onNext={handleNext}
        loading={loading}
        disabled={loading}
      />
    </div>
  );
};

export default Step1Title;
