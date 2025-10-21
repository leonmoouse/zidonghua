import { useRoutes } from 'react-router-dom';
import Step1Title from './pages/Step1Title';
import Step2Structure from './pages/Step2Structure';
import Step3Result from './pages/Step3Result';

export default function AppRoutes() {
  return useRoutes([
    { path: '/', element: <Step1Title /> },
    { path: '/structure', element: <Step2Structure /> },
    { path: '/result/:jobId', element: <Step3Result /> }
  ]);
}
