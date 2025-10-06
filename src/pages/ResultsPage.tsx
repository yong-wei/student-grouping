import React, { useState } from 'react';
import {
  Typography,
  Tabs,
  Row,
  Col,
  Card,
  Statistic,
  Space,
  Button,
  message,
  Modal,
  Progress,
  Spin,
} from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileZipOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import GroupCard from '../components/GroupCard';
import LearningStyleDistribution from '../components/LearningStyleDistribution';
import FaceControls from '../components/FaceControls';
import { exportGroupingToExcel } from '../utils/excelExport';
import { generateClassAnalysisReport } from '../utils/pdfExport';
import { generateBatchReports } from '../utils/zipExport';
import { computeGlobalGroupMaps } from '../utils/groupingExportUtils';
import type { Student } from '../types';

const { Title, Text } = Typography;

const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const groupingTasks = useAppStore((state) => state.groupingTasks);
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const faceSettings = useAppStore((state) => state.faceSettings);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [activeTabKey, setActiveTabKey] = useState('0');

  const tasksWithResult = React.useMemo(
    () => groupingTasks.filter((task) => task.result && task.result.groups.length > 0),
    [groupingTasks]
  );

  const globalMaps = React.useMemo(
    () => computeGlobalGroupMaps(tasksWithResult),
    [tasksWithResult]
  );

  const allStudents = React.useMemo(() => {
    const map = new Map<string, Student>();
    groupingTasks.forEach((task) => {
      if (!task.result) return;
      task.result.groups.forEach((group) => {
        group.members.forEach((member) => {
          if (!map.has(member.id)) {
            map.set(member.id, member);
          }
        });
      });
    });
    return Array.from(map.values()).sort((a, b) => a.serialNumber - b.serialNumber);
  }, [groupingTasks]);

  const rankingRange = React.useMemo(() => {
    const valid = allStudents
      .map((student) => student.ranking)
      .filter((value) => typeof value === 'number' && Number.isFinite(value)) as number[];
    if (valid.length === 0) {
      return null;
    }
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    if (Math.abs(max - min) < Number.EPSILON) {
      return null;
    }
    return { min, max };
  }, [allStudents]);

  // 如果没有分组任务，跳转回配置页
  React.useEffect(() => {
    if (groupingTasks.length === 0) {
      message.warning('请先完成分组配置');
      navigate('/config');
    }
  }, [groupingTasks, navigate]);

  React.useEffect(() => {
    if (groupingTasks.length === 0) {
      return;
    }

    const activeIndex = Number(activeTabKey);
    if (Number.isNaN(activeIndex) || activeIndex >= groupingTasks.length) {
      setActiveTabKey('0');
    }
  }, [activeTabKey, groupingTasks.length]);

  if (groupingTasks.length === 0) return null;
  // 上一步
  const handlePrevious = () => {
    setCurrentStep(1);
    navigate('/config');
  };

  // 导出 Excel
  const handleExportCurrentExcel = async () => {
    if (tasksWithResult.length === 0) {
      message.warning('暂无可导出的分组结果');
      return;
    }

    setExportingExcel(true);
    try {
      exportGroupingToExcel(groupingTasks);
      message.success('分组结果（含全部任务）导出成功');
    } catch (error) {
      message.error(`导出失败: ${error}`);
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportAllExcel = () => handleExportCurrentExcel();

  // 导出 PDF
  const handleExportPdf = async () => {
    if (tasksWithResult.length === 0) {
      message.warning('暂无可导出的分组结果');
      return;
    }
    setExportingPdf(true);
    try {
      await generateClassAnalysisReport(groupingTasks, {
        includeFaces: faceSettings.enabled,
        faceFeatures: faceSettings.features,
        faceRanges: faceSettings.ranges,
        rankingRange,
      });
      message.success('班级分析报告导出成功');
    } catch (error) {
      message.error(`导出失败: ${error}`);
    } finally {
      setExportingPdf(false);
    }
  };

  // 导出 ZIP
  const handleExportZip = async () => {
    try {
      if (tasksWithResult.length === 0) {
        message.warning('暂无可导出的分组结果');
        return;
      }

      const uniqueStudents = new Map<string, Student>();
      tasksWithResult.forEach((task) => {
        task.result!.groups.forEach((group) => {
          group.members.forEach((member) => {
            if (!uniqueStudents.has(member.id)) {
              uniqueStudents.set(member.id, member);
            }
          });
        });
      });

      const totalStudents = uniqueStudents.size;
      if (totalStudents === 0) {
        message.info('暂无学生数据用于生成个人报告');
        return;
      }

      setExportingZip(true);
      setExportProgress({ current: 0, total: totalStudents });

      await generateBatchReports(groupingTasks, (current, total) => {
        setExportProgress({ current, total });
      });

      message.success('批量报告导出成功');
    } catch (error) {
      console.error('批量导出失败', error);
      message.error(`导出失败: ${error}`);
    } finally {
      setExportingZip(false);
      setExportProgress(null);
    }
  };

  // 创建标签页内容
  const tabItems = groupingTasks
    .map((task, index) => {
      const result = task.result;
      if (!result) return null;

      const allStudents = result.groups.flatMap((g) => g.members);

      return {
        key: String(index),
        label: task.name,
        children: (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title="分组统计" size="small">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic title="总人数" value={result.statistics.totalStudents} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="小组数" value={result.statistics.totalGroups} />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="平均人数"
                      value={result.statistics.averageGroupSize.toFixed(1)}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="质量分"
                      value={result.qualityScore.toFixed(2)}
                      precision={2}
                    />
                  </Col>
                </Row>
                <Text type="secondary">
                  质量分 = 性别均衡 × 权重 + 专业多样性 × 权重 + 学习主动性均衡 × 权重 + 组长分布 ×
                  权重 + 组内学习风格异质性 × 权重 + 组间学习风格同质性 × 权重（权重取自配置页面）。
                </Text>
              </Space>
            </Card>

            <Card title="班级学习风格分布" size="small">
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <LearningStyleDistribution students={allStudents} />
                <Text type="secondary">
                  {
                    '每张图展示所有学生在对应维度上的倾向值（-11 至 11），左侧偏向前者，右侧偏向后者，可用于对比个体差异与整体趋势。'
                  }
                </Text>
              </Space>
            </Card>

            {faceSettings.enabled && (
              <Card size="small" type="inner">
                <Space direction="vertical" size="small">
                  <Text strong>脸图说明</Text>
                  <Text type="secondary">
                    脸型映射学生的学习风格：脸型大小表示排名，嘴型对应积极/沉思，鼻子对应感官/直觉，
                    眼睛大小对应视觉/言语，眼距对应顺序/全局，眉形补充展示积极倾向。颜色区分性别。
                  </Text>
                </Space>
              </Card>
            )}
            <FaceControls />

            <Card title="分组看板" size="small">
              <Row gutter={[16, 16]}>
                {result.groups.map((group) => {
                  const displayNumber =
                    globalMaps.groupNumberMap.get(`${task.id}__${group.id}`) ?? group.groupNumber;
                  return (
                    <Col span={12} key={group.id}>
                      <GroupCard
                        group={group}
                        rankingRange={rankingRange}
                        faceFeatures={faceSettings.features}
                        displayGroupNumber={displayNumber}
                      />
                    </Col>
                  );
                })}
              </Row>
            </Card>
          </Space>
        ),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div>
      <Title level={2}>第三步：预览、微调并导出结果</Title>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 导出操作区 */}
        <Card size="small">
          <Space size="middle" wrap>
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              onClick={handleExportCurrentExcel}
              loading={exportingExcel}
            >
              导出分组结果 (Excel)
            </Button>
            <Button icon={<FilePdfOutlined />} onClick={handleExportPdf} loading={exportingPdf}>
              导出班级分析报告 (PDF)
            </Button>
            <Button icon={<FileZipOutlined />} onClick={handleExportZip} loading={exportingZip}>
              批量导出个人报告 (ZIP)
            </Button>
          </Space>
        </Card>

        <Modal
          open={exportingPdf}
          title="正在生成班级分析报告"
          footer={null}
          closable={false}
          maskClosable={false}
        >
          <Space direction="vertical" style={{ width: '100%' }} align="center">
            <Spin size="large" />
            <Text type="secondary">请稍候，报告生成完成后将自动下载。</Text>
          </Space>
        </Modal>

        <Modal
          open={Boolean(exportProgress)}
          title="正在生成个人报告"
          footer={null}
          closable={false}
          maskClosable={false}
        >
          {exportProgress && (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Progress
                percent={Math.round((exportProgress.current / exportProgress.total) * 100)}
                status={exportProgress.current === exportProgress.total ? 'success' : 'active'}
              />
              <Text type="secondary">
                已完成 {exportProgress.current}/{exportProgress.total} 份报告
              </Text>
            </Space>
          )}
        </Modal>

        {/* 结果展示区 */}
        <Tabs items={tabItems} activeKey={activeTabKey} onChange={setActiveTabKey} />

        {/* 操作按钮 */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button size="large" icon={<ArrowLeftOutlined />} onClick={handlePrevious}>
            上一步
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<DownloadOutlined />}
            onClick={handleExportAllExcel}
            loading={exportingExcel}
          >
            导出所有结果
          </Button>
        </div>
      </Space>
    </div>
  );
};

export default ResultsPage;
