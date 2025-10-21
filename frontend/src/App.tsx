import AppRoutes from './router';
import JobCenter from './components/JobCenter';
import ToastContainer from './components/ToastContainer';
import { useJobStore } from './lib/store';

declare const __APP_VERSION__: string;

const App = () => {
  const hasJobs = useJobStore((state) => state.jobs.length > 0);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">文案自动化助手</h1>
            <p className="text-xs text-slate-500">版本 {__APP_VERSION__}</p>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-slate-50 py-6">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 lg:grid-cols-[2fr,1fr]">
          <section className="min-h-[60vh] rounded-xl bg-transparent">
            <AppRoutes />
          </section>
          <div className="space-y-4">
            {hasJobs && <JobCenter />}
            <section className="rounded-lg border bg-white p-4 text-sm text-slate-600 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-slate-700">使用小贴士</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>支持同时发起多个任务，可通过任务中心快速跳转。</li>
                <li>若接口报错，可稍后重试，或检查网络连接。</li>
                <li>移动端可滑动页面完成所有操作。</li>
              </ul>
            </section>
          </div>
        </div>
      </main>
      <ToastContainer />
    </div>
  );
};

export default App;
