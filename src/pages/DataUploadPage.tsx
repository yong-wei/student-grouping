import React, { useEffect, useState } from 'react';
import {
  Typography,
  Upload,
  Button,
  Card,
  Row,
  Col,
  Statistic,
  Tabs,
  Table,
  message,
  Space,
} from 'antd';
import { InboxOutlined, ArrowRightOutlined, DownloadOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import {
  parseExcelFile,
  parsePhotoFiles,
  validateStudentData,
  matchStudentsWithPhotos,
  calculateDataStatistics,
} from '../utils/excelParser';
import type { Student } from '../types';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const DataUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { uploadedData, setUploadedData, setCurrentStep } = useAppStore();

  const [excelFile, setExcelFile] = useState<UploadFile | null>(null);
  const [photoFiles, setPhotoFiles] = useState<UploadFile[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof calculateDataStatistics> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uploadedData) return;
    setStudents(uploadedData.students);
    setStats(calculateDataStatistics(uploadedData.students));
    if (uploadedData.sourceFileName) {
      setExcelFile({
        uid: uploadedData.sourceFileName,
        name: uploadedData.sourceFileName,
      } as UploadFile);
    }
  }, [uploadedData]);

  // Excel 上传配置
  const excelUploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.xls',
    beforeUpload: async (file) => {
      setLoading(true);
      try {
        const parsedStudents = await parseExcelFile(file);
        const validation = validateStudentData(parsedStudents);

        if (!validation.isValid) {
          message.error(`数据验证失败: ${validation.errors.join(', ')}`);
          setLoading(false);
          return false;
        }

        setStudents(parsedStudents);
        setExcelFile({ uid: file.uid, name: file.name } as UploadFile);
        message.success('Excel 文件解析成功');

        // 如果已有照片，立即匹配
        if (photoFiles.length > 0) {
          matchPhotosWithStudents(parsedStudents);
        } else {
          updateStatistics(parsedStudents);
        }
      } catch (error) {
        console.error('Excel 解析错误:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        message.error(`解析失败: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
      return false;
    },
    onRemove: () => {
      setExcelFile(null);
      setStudents([]);
      setStats(null);
    },
    fileList: excelFile ? [excelFile] : [],
  };

  // 下载导入模板
  const handleDownloadTemplate = () => {
    const baseHeaders = ['序号', '姓名', '学号', '性别', '专业', '排名', '组长', '分组序号'];
    const ilsHeaders = Array.from({ length: 44 }, (_, idx) => `ILS${idx + 1}`);
    const headers = [...baseHeaders, ...ilsHeaders];

    const baseExample = [1, '张三', '20230001', 1, '大数据', 0.25, 1, ''];
    const ilsExample = Array.from({ length: 44 }, (_, idx) => (idx % 2 === 0 ? 1 : 2));
    const exampleRow = [...baseExample, ...ilsExample];

    const tipsRow = Array(headers.length).fill('');
    tipsRow[0] =
      '填写说明：性别按男=1、女=0；组长填1表示愿意担任；分组序号用于固定自由组队成员，可留空；每道 ILS 题仅填写 1（选项A）或 2（选项B），若未作答请留空';

    const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow, tipsRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '导入模板');
    XLSX.writeFile(workbook, '学生问卷导入模板.xlsx');
  };

  // 照片上传配置
  const photoUploadProps: UploadProps = {
    name: 'photos',
    multiple: true,
    accept: 'image/*',
    showUploadList: false,
    beforeUpload: (file) => {
      setPhotoFiles((prev) => [
        ...prev,
        { uid: file.uid, name: file.name, originFileObj: file } as UploadFile,
      ]);
      return false;
    },
    onRemove: (file) => {
      setPhotoFiles((prev) => prev.filter((f) => f.uid !== file.uid));
    },
    fileList: photoFiles,
  };

  // 匹配照片与学生
  const matchPhotosWithStudents = async (studentList: Student[]) => {
    const files = photoFiles.map((f) => f.originFileObj as File);
    const photoMap = await parsePhotoFiles(files);
    const matchedStudents = matchStudentsWithPhotos(studentList, photoMap);
    setStudents(matchedStudents);
    updateStatistics(matchedStudents);
  };

  // 更新统计信息
  const updateStatistics = (studentList: Student[]) => {
    const statistics = calculateDataStatistics(studentList);
    setStats(statistics);
  };

  // 照片上传完成后匹配
  useEffect(() => {
    if (students.length > 0 && photoFiles.length > 0) {
      matchPhotosWithStudents(students);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoFiles.length]);

  // 下一步
  const handleNext = () => {
    if (students.length === 0) {
      message.warning('请先上传问卷数据');
      return;
    }

    // 保存到 store
    const untested = students
      .filter((student) => !student.ilsCompleted)
      .map((student) => student.name || student.studentNumber);

    setUploadedData({
      students,
      photos: new Map(), // 照片已经在学生对象中
      hasCompleteName: false,
      untestedStudents: untested,
      sourceFileName: excelFile?.name,
    });

    setCurrentStep(1);
    navigate('/config');
  };

  // 表格列定义
  const columns = [
    { title: '序号', dataIndex: 'serialNumber', key: 'serialNumber', width: 60 },
    { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber', width: 100, ellipsis: true },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 90, ellipsis: true },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 60,
      render: (gender: number) => (gender === 1 ? '男' : '女'),
    },
    {
      title: '组长',
      dataIndex: 'isLeader',
      key: 'isLeader',
      width: 60,
      render: (isLeader: boolean) => (isLeader ? '是' : '否'),
    },
    { title: '排名', dataIndex: 'ranking', key: 'ranking', width: 80 },
    { title: '专业', dataIndex: 'major', key: 'major', width: 80 },
    { title: '总分', dataIndex: 'totalScore', key: 'totalScore', width: 80 },
    {
      title: '积极/沉思',
      dataIndex: ['learningStyles', 'activeReflective'],
      key: 'activeReflective',
      width: 100,
    },
    {
      title: '感官/直觉',
      dataIndex: ['learningStyles', 'sensingIntuitive'],
      key: 'sensingIntuitive',
      width: 100,
    },
    {
      title: '视觉/言语',
      dataIndex: ['learningStyles', 'visualVerbal'],
      key: 'visualVerbal',
      width: 100,
    },
    {
      title: '顺序/全局',
      dataIndex: ['learningStyles', 'sequentialGlobal'],
      key: 'sequentialGlobal',
      width: 100,
    },
    {
      title: '照片',
      key: 'photo',
      width: 80,
      render: (_: unknown, record: Student) => (record.photo ? '✓' : '✗'),
    },
  ];

  const tabItems = [
    {
      key: '1',
      label: '数据总览',
      children: stats && (
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={6} lg={6} xl={4} xxl={4}>
            <Card>
              <Statistic title="总人数" value={stats.totalStudents} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6} lg={6} xl={4} xxl={4}>
            <Card>
              <Statistic title="已测试人数" value={stats.testedStudents} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6} lg={6} xl={4} xxl={4}>
            <Card>
              <Statistic title="未完成 ILS" value={stats.untestedStudents} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6} lg={6} xl={4} xxl={4}>
            <Card>
              <Statistic title="已匹配照片" value={stats.studentsWithPhotos} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6} lg={6} xl={4} xxl={4}>
            <Card>
              <Statistic title="已预分组" value={stats.preGroupedStudents} />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: '2',
      label: '学生数据预览',
      children: (
        <Table
          columns={columns}
          dataSource={students}
          rowKey="id"
          pagination={false}
          scroll={{ y: 320, x: 960 }}
          size="small"
          bordered
        />
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>第一步：上传您的数据</Title>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 上传区域 */}
        <Row gutter={16}>
          <Col span={12}>
            <Card title="问卷数据 (Excel)" size="small">
              <Button
                icon={<DownloadOutlined />}
                type="link"
                onClick={handleDownloadTemplate}
                style={{ padding: 0, marginBottom: 8 }}
              >
                下载导入模板
              </Button>
              <Dragger {...excelUploadProps} disabled={loading}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽上传 Excel 文件</p>
                <p className="ant-upload-hint">支持 .xlsx 和 .xls 格式</p>
              </Dragger>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="学生照片 (可选)" size="small">
              <Dragger {...photoUploadProps}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽上传照片</p>
                <p className="ant-upload-hint">支持多张图片，文件名应为学号或姓名</p>
              </Dragger>
              {photoFiles.length > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    maxHeight: 200,
                    overflowY: 'auto',
                    border: '1px solid #f0f0f0',
                    borderRadius: 4,
                    padding: '8px 12px',
                    background: '#fafafa',
                  }}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    {photoFiles.map((file) => (
                      <Text key={file.uid} style={{ wordBreak: 'break-all' }}>
                        {file.name}
                      </Text>
                    ))}
                  </Space>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* 数据预览 */}
        {students.length > 0 && <Tabs items={tabItems} />}

        {/* 操作按钮 */}
        <div style={{ textAlign: 'right' }}>
          <Button
            type="primary"
            size="large"
            icon={<ArrowRightOutlined />}
            onClick={handleNext}
            disabled={students.length === 0}
          >
            下一步：设置分组规则
          </Button>
        </div>
      </Space>
    </div>
  );
};

export default DataUploadPage;
