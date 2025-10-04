import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ConfigProvider, Layout, Steps } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAppStore } from './store';
import DataUploadPage from './pages/DataUploadPage';
import GroupingConfigPage from './pages/GroupingConfigPage';
import ResultsPage from './pages/ResultsPage';
import ErrorBoundary from './components/ErrorBoundary';

const { Header, Content, Footer } = Layout;

const stepsConfig = [
  { title: '数据上传', path: '/upload' },
  { title: '分组配置', path: '/config' },
  { title: '结果预览', path: '/results' },
];

const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentStep, setCurrentStep } = useAppStore();

  useEffect(() => {
    const matchedStep = stepsConfig.findIndex((step) => location.pathname.startsWith(step.path));
    if (matchedStep !== -1 && matchedStep !== currentStep) {
      setCurrentStep(matchedStep);
    }
  }, [location.pathname, currentStep, setCurrentStep]);

  const handleStepChange = (nextStep: number) => {
    setCurrentStep(nextStep);
    navigate(stepsConfig[nextStep].path);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 50px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: '100%' }}>
          <img src="/CAlogo32.png" alt="智能学生分组助手" style={{ width: 32, height: 32 }} />
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>智能学生分组助手</h1>
        </div>
      </Header>

      <Content style={{ padding: '24px 50px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Steps
            current={currentStep}
            items={stepsConfig}
            style={{ marginBottom: 32 }}
            onChange={handleStepChange}
          />

          <Routes>
            <Route path="/upload" element={<DataUploadPage />} />
            <Route path="/config" element={<GroupingConfigPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/" element={<Navigate to="/upload" replace />} />
          </Routes>
        </div>
      </Content>

      <Footer style={{ textAlign: 'center' }}>
        <div>智能学生分组助手 ©{new Date().getFullYear()} - 纯前端数据处理，保护您的隐私</div>
        <div>
          作者：江苏科技大学自动化学院张永韡 ·{' '}
          <a href="mailto:ywzhang@just.edu.cn" style={{ marginLeft: 4 }}>
            ywzhang@just.edu.cn
          </a>
        </div>
      </Footer>
    </Layout>
  );
};

const App: React.FC = () => (
  <ConfigProvider locale={zhCN}>
    <ErrorBoundary>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </ErrorBoundary>
  </ConfigProvider>
);

export default App;
