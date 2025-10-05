import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Typography,
  Card,
  Button,
  Form,
  Input,
  InputNumber,
  Radio,
  Slider,
  Space,
  Transfer,
  message,
  Row,
  Col,
  Divider,
} from 'antd';
import type { TransferItem } from 'antd/es/transfer';
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import type { GroupingTask, GroupingTaskDraft, Student } from '../types';
import { optimizeGrouping, balancedRandomGrouping } from '../utils/groupingAlgorithm';
import type { SeedGroup } from '../utils/groupingAlgorithm';

const { Title, Text } = Typography;

interface TaskFormData extends GroupingTaskDraft {
  randomSelectCount?: number;
}

interface StudentTransferItem extends TransferItem {
  name: string;
  studentNumber: string;
  locked: boolean;
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
};

const createTaskDraft = (index: number): TaskFormData => ({
  id: generateId(),
  name: `分组任务 ${index + 1}`,
  studentIds: [],
  groupSize: 6,
  mode: 'learning-style',
  weights: {
    gender: 20,
    major: 20,
    activeScore: 20,
    leader: 20,
    intraStyleDiversity: 10,
    interStyleSimilarity: 10,
  },
  randomSelectCount: undefined,
});

const shuffleArray = <T,>(array: T[]): T[] => {
  const cloned = [...array];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
};

const GroupingConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const { uploadedData, replaceGroupingTasks, setCurrentStep, taskDrafts, setTaskDrafts } =
    useAppStore();

  const [tasks, setTasks] = useState<TaskFormData[]>([]);
  const [activeKey, setActiveKey] = useState<string[]>([]);
  const initialisedDraftsRef = useRef(false);

  useEffect(() => {
    if (!uploadedData || uploadedData.students.length === 0) {
      message.warning('请先上传学生数据');
      navigate('/upload');
    }
  }, [uploadedData, navigate]);

  useEffect(() => {
    if (!uploadedData) {
      setTasks([]);
      setActiveKey([]);
      setTaskDrafts([]);
      return;
    }

    const validStudentIds = new Set(uploadedData.students.map((student) => student.id));
    setTasks((prev) =>
      prev.map((task) => ({
        ...task,
        studentIds: task.studentIds.filter((id) => validStudentIds.has(id)),
      }))
    );
  }, [uploadedData, setTaskDrafts]);

  useEffect(() => {
    if (initialisedDraftsRef.current) return;
    if (taskDrafts.length > 0) {
      setTasks(taskDrafts.map((draft) => ({ ...draft, randomSelectCount: undefined })));
      setActiveKey([taskDrafts[taskDrafts.length - 1].id]);
    }
    initialisedDraftsRef.current = true;
  }, [taskDrafts]);

  useEffect(() => {
    if (!initialisedDraftsRef.current) return;
    setTaskDrafts(
      tasks.map(({ randomSelectCount: _randomSelectCount, ...rest }) => ({
        ...rest,
      }))
    );
  }, [tasks, setTaskDrafts]);

  useEffect(() => {
    setActiveKey((prev) => prev.filter((key) => tasks.some((task) => task.id === key)));
  }, [tasks]);

  useEffect(() => {
    if (tasks.length > 0 && activeKey.length === 0) {
      setActiveKey([tasks[tasks.length - 1].id]);
    }
  }, [tasks, activeKey]);

  const students = useMemo(() => uploadedData?.students ?? [], [uploadedData]);

  const fixedStudents = useMemo(
    () =>
      students.filter((student) => {
        const { groupNumber } = student;
        return (
          typeof groupNumber === 'number' &&
          Number.isFinite(groupNumber) &&
          Number.isInteger(groupNumber) &&
          groupNumber > 0
        );
      }),
    [students]
  );

  const fixedStudentIds = useMemo(
    () => new Set(fixedStudents.map((student) => student.id)),
    [fixedStudents]
  );

  const fixedGroupMap = useMemo(() => {
    const map = new Map<number, Student[]>();
    fixedStudents.forEach((student) => {
      const groupNumber = Number(student.groupNumber);
      if (!Number.isInteger(groupNumber) || groupNumber <= 0) return;
      const existing = map.get(groupNumber);
      if (existing) {
        existing.push(student);
      } else {
        map.set(groupNumber, [student]);
      }
    });
    return map;
  }, [fixedStudents]);

  const highestFixedGroupNumber = useMemo(() => {
    if (fixedStudents.length === 0) return 0;
    return fixedStudents.reduce((max, student) => {
      const value = Number(student.groupNumber ?? 0);
      if (!Number.isFinite(value)) return max;
      return value > max ? value : max;
    }, 0);
  }, [fixedStudents]);

  const unassignedStudents = useMemo(() => students, [students]);

  const studentMap = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students]
  );

  if (!uploadedData) return null;

  const handleAddTask = () => {
    const draft = createTaskDraft(tasks.length);
    setTasks((prev) => [...prev, draft]);
    setActiveKey([draft.id]);
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    setActiveKey((prev) => prev.filter((key) => key !== id));
  };

  const handleUpdateTask = (id: string, updates: Partial<TaskFormData>) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...updates } : task)));
  };

  const handleRandomSelect = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    const count = task.randomSelectCount ?? 0;
    if (!count || count <= 0) {
      message.info('请先填写需要随机选择的人数');
      return;
    }

    const selectedInOtherTasks = new Set<string>();
    tasks
      .filter((item) => item.id !== id)
      .forEach((item) =>
        item.studentIds.forEach((studentId) => selectedInOtherTasks.add(studentId))
      );
    const pool = unassignedStudents.filter(
      (student) =>
        !selectedInOtherTasks.has(student.id) &&
        !task.studentIds.includes(student.id) &&
        !fixedStudentIds.has(student.id)
    );
    if (pool.length === 0) {
      message.warning('没有可供随机选择的学生');
      return;
    }
    if (count > pool.length) {
      message.warning(`仅剩 ${pool.length} 名学生可用，已全部选中`);
    }
    const picked = shuffleArray(pool)
      .slice(0, count)
      .map((student) => student.id);
    const uniqueIds = Array.from(new Set([...task.studentIds, ...picked]));
    handleUpdateTask(id, { studentIds: uniqueIds });
  };

  interface TaskExecutionPlan {
    task: TaskFormData;
    participantIds: string[];
    flexibleStudents: Student[];
    seedGroups: SeedGroup[];
    range: { start: number; end: number };
  }

  const handleStartGrouping = async () => {
    if (tasks.length === 0) {
      message.warning('请至少创建一个分组任务');
      return;
    }

    const taskEntries = tasks.map((task) => {
      const taskStudents = task.studentIds
        .map((id) => studentMap.get(id))
        .filter((student): student is Student => Boolean(student));
      return { task, students: taskStudents };
    });

    const executionPlans: TaskExecutionPlan[] = [];
    const validationErrors: string[] = [];
    const planMap = new Map<string, string[]>();

    let groupCursor = 0;

    taskEntries.forEach(({ task, students }) => {
      const participantSet = new Set<string>();
      students.forEach((student) => participantSet.add(student.id));

      const startGroupNumber = groupCursor + 1;
      let maxGroups =
        participantSet.size > 0 ? Math.max(1, Math.ceil(participantSet.size / task.groupSize)) : 0;
      let endGroupNumber = maxGroups > 0 ? startGroupNumber + maxGroups - 1 : startGroupNumber - 1;

      let adjusted = true;
      while (adjusted) {
        adjusted = false;

        if (maxGroups === 0) {
          const lockedAtStart = fixedGroupMap.get(startGroupNumber);
          if (lockedAtStart && lockedAtStart.length > 0) {
            maxGroups = 1;
            endGroupNumber = startGroupNumber;
            adjusted = true;
          } else {
            break;
          }
        }

        for (let groupNumber = startGroupNumber; groupNumber <= endGroupNumber; groupNumber += 1) {
          const lockedMembers = fixedGroupMap.get(groupNumber);
          if (!lockedMembers || lockedMembers.length === 0) continue;
          lockedMembers.forEach((member) => {
            if (!participantSet.has(member.id)) {
              participantSet.add(member.id);
              adjusted = true;
            }
          });
        }

        if (maxGroups > 0) {
          const requiredGroups = Math.max(1, Math.ceil(participantSet.size / task.groupSize));
          if (requiredGroups > maxGroups) {
            maxGroups = requiredGroups;
            endGroupNumber = startGroupNumber + maxGroups - 1;
            adjusted = true;
          }
        }
      }

      if (maxGroups === 0) {
        return;
      }

      const seedGroups: SeedGroup[] = [];
      const lockedStudentIds = new Set<string>();
      for (let groupNumber = startGroupNumber; groupNumber <= endGroupNumber; groupNumber += 1) {
        const lockedMembers = fixedGroupMap.get(groupNumber) ?? [];
        seedGroups.push({ groupNumber, lockedMembers });
        lockedMembers.forEach((member) => lockedStudentIds.add(member.id));
      }

      const participantStudents = Array.from(participantSet)
        .map((id) => studentMap.get(id))
        .filter((student): student is Student => Boolean(student));

      const participantIds = Array.from(new Set(participantStudents.map((student) => student.id)));

      const flexibleStudents = participantStudents.filter(
        (student) => !lockedStudentIds.has(student.id)
      );

      seedGroups.forEach((seed) => {
        if (seed.lockedMembers.length > task.groupSize) {
          validationErrors.push(
            `分组 ${seed.groupNumber} 的固定学生数量 (${seed.lockedMembers.length}) 已超过设置的小组人数 ${task.groupSize}`
          );
        }
      });

      const totalCapacity = seedGroups.reduce(
        (sum, seed) => sum + Math.max(task.groupSize - seed.lockedMembers.length, 0),
        0
      );
      if (totalCapacity < flexibleStudents.length) {
        validationErrors.push(`任务"${task.name}"中的剩余席位不足，请调整小组人数或固定分组`);
      }

      if (students.length > 0 && students.length < task.groupSize) {
        message.warning(`任务"${task.name}"可用学生不足，请检查分组人数设置`);
      }

      executionPlans.push({
        task,
        participantIds,
        flexibleStudents,
        seedGroups,
        range: { start: startGroupNumber, end: endGroupNumber },
      });
      planMap.set(task.id, participantIds);
      groupCursor = endGroupNumber;
    });

    const assignedLockedIds = new Set<string>();
    executionPlans.forEach((plan) => {
      plan.seedGroups.forEach((seed) => {
        seed.lockedMembers.forEach((member) => assignedLockedIds.add(member.id));
      });
    });

    const missingFixedStudents = fixedStudents.filter(
      (student) => !assignedLockedIds.has(student.id)
    );
    if (missingFixedStudents.length > 0) {
      const preview = missingFixedStudents
        .slice(0, 3)
        .map((student) => student.name)
        .join('、');
      validationErrors.push(
        `部分固定分组学生未被纳入任务：${preview}${
          missingFixedStudents.length > 3 ? ' 等' : ''
        }，请检查分组序号与任务配置`
      );
    }

    if (highestFixedGroupNumber > groupCursor) {
      validationErrors.push(
        `存在固定分组序号 ${highestFixedGroupNumber} 超出当前配置支持的最大分组 ${groupCursor}，请调整任务容量或添加分组任务`
      );
    }

    const actionablePlans = executionPlans.filter((plan) => plan.participantIds.length > 0);

    if (validationErrors.length > 0) {
      message.error({ content: validationErrors.join('；'), key: 'grouping' });
      return;
    }

    if (actionablePlans.length === 0) {
      message.warning('请在至少一个分组任务中选择学生或提供固定分组');
      return;
    }

    if (planMap.size > 0) {
      setTasks((prev) =>
        prev.map((item) => {
          const updatedIds = planMap.get(item.id);
          if (!updatedIds) return item;
          const uniqueIds = Array.from(new Set(updatedIds));
          if (
            uniqueIds.length === item.studentIds.length &&
            uniqueIds.every((id, idx) => id === item.studentIds[idx])
          ) {
            return item;
          }
          return { ...item, studentIds: uniqueIds };
        })
      );
    }

    try {
      message.loading({ content: '正在执行智能分组...', key: 'grouping' });
      const results: GroupingTask[] = [];

      for (const plan of actionablePlans) {
        const { task, flexibleStudents, seedGroups, participantIds } = plan;
        const options = { seedGroups };
        const result =
          task.mode === 'balanced-random'
            ? balancedRandomGrouping(flexibleStudents, task.groupSize, options)
            : optimizeGrouping(flexibleStudents, task.groupSize, task.weights, 10000, options);

        results.push({
          id: `task-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          name: task.name,
          studentIds: participantIds,
          groupSize: task.groupSize,
          mode: task.mode,
          weights: task.weights,
          result,
        });
      }

      if (results.length === 0) {
        message.error({ content: '分组失败：未生成任何结果', key: 'grouping' });
        return;
      }

      replaceGroupingTasks(results);
      message.success({ content: '分组完成！', key: 'grouping' });
      setCurrentStep(2);
      navigate('/results');
    } catch (error) {
      message.error({ content: `分组失败: ${error}`, key: 'grouping' });
    }
  };

  const handlePrevious = () => {
    setCurrentStep(0);
    navigate('/upload');
  };

  const toggleTaskPanel = (id: string) => {
    setActiveKey((prev) => {
      if (prev.includes(id)) {
        return prev.filter((key) => key !== id);
      }
      return [id];
    });
  };

  const renderTaskCard = (task: TaskFormData) => {
    const selectedInOtherTasks = new Set<string>();
    tasks
      .filter((item) => item.id !== task.id)
      .forEach((item) =>
        item.studentIds.forEach((studentId) => selectedInOtherTasks.add(studentId))
      );
    const dataSourceStudents = unassignedStudents.filter((student) => {
      if (task.studentIds.includes(student.id)) {
        return true;
      }
      return !selectedInOtherTasks.has(student.id);
    });

    const missingSelectedStudents = task.studentIds
      .filter((id) => !dataSourceStudents.some((student) => student.id === id))
      .map((id) => studentMap.get(id))
      .filter((student): student is NonNullable<typeof student> => Boolean(student));
    const transferStudents = [...dataSourceStudents, ...missingSelectedStudents];
    const transferData: StudentTransferItem[] = transferStudents.map((student) => {
      const locked = fixedStudentIds.has(student.id);
      const studentNumber = student.studentNumber ?? '';
      const baseTitle = `${student.name} (${studentNumber})${
        student.ilsCompleted ? '' : ' · 未完成 ILS'
      }`;
      const title = locked ? `${baseTitle} · 固定分组` : baseTitle;
      return {
        key: student.id,
        title,
        name: student.name,
        studentNumber,
        locked,
        disabled: locked,
      };
    });

    const filterOption = (inputValue: string, item: StudentTransferItem) => {
      const keyword = inputValue.trim().toLowerCase();
      if (!keyword) return true;
      return (
        item.name.toLowerCase().includes(keyword) ||
        item.studentNumber.toLowerCase().includes(keyword)
      );
    };
    const randomPool = unassignedStudents.filter(
      (student) =>
        !selectedInOtherTasks.has(student.id) &&
        !task.studentIds.includes(student.id) &&
        !fixedStudentIds.has(student.id)
    );
    const isActive = activeKey.includes(task.id);

    return (
      <Card key={task.id} size="small" styles={{ body: { paddingTop: 12 } }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
          }}
          onClick={() => toggleTaskPanel(task.id)}
        >
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<DownOutlined rotate={isActive ? 180 : 0} />}
              onClick={(event) => {
                event.stopPropagation();
                toggleTaskPanel(task.id);
              }}
            />
            <Text strong>{task.name}</Text>
          </Space>
          <Space size="small">
            <Text type="secondary">{isActive ? '点击收起' : '点击展开'}</Text>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteTask(task.id);
              }}
            />
          </Space>
        </div>

        {isActive && (
          <div style={{ marginTop: 16 }}>
            <Form layout="vertical">
              <Form.Item label="任务名称">
                <Input
                  value={task.name}
                  onChange={(event) => handleUpdateTask(task.id, { name: event.target.value })}
                  placeholder="输入任务名称"
                />
              </Form.Item>

              <Form.Item label={`选择学生 (可用: ${randomPool.length})`}>
                <Transfer<StudentTransferItem>
                  dataSource={transferData}
                  targetKeys={Array.from(new Set(task.studentIds))}
                  onChange={(targetKeys) =>
                    handleUpdateTask(task.id, {
                      studentIds: Array.from(new Set(targetKeys as string[])),
                    })
                  }
                  render={(item) => item.title}
                  titles={['可选学生', '已选学生']}
                  listStyle={{ width: 280, height: 320 }}
                  showSearch
                  filterOption={filterOption}
                />
              </Form.Item>

              <Form.Item label="随机选择">
                <Space>
                  <InputNumber
                    min={1}
                    max={randomPool.length || 1}
                    value={task.randomSelectCount}
                    onChange={(value) =>
                      handleUpdateTask(task.id, {
                        randomSelectCount: value ?? undefined,
                      })
                    }
                    style={{ width: 120 }}
                    disabled={randomPool.length === 0}
                  />
                  <Text>人</Text>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => handleRandomSelect(task.id)}
                    disabled={randomPool.length === 0}
                  >
                    随机选择
                  </Button>
                </Space>
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="分组模式">
                    <Radio.Group
                      value={task.mode}
                      onChange={(event) => handleUpdateTask(task.id, { mode: event.target.value })}
                    >
                      <Space direction="vertical">
                        <Radio value="learning-style">学习风格优化分组</Radio>
                        <Radio value="balanced-random">均衡随机分组</Radio>
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="小组人数">
                    <InputNumber
                      min={3}
                      max={10}
                      value={task.groupSize}
                      onChange={(value) => handleUpdateTask(task.id, { groupSize: value || 6 })}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider>权重调节 (总计 100)</Divider>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text>性别均衡度: {task.weights.gender}</Text>
                  <Slider
                    value={task.weights.gender}
                    onChange={(value) =>
                      handleUpdateTask(task.id, {
                        weights: { ...task.weights, gender: value },
                      })
                    }
                    min={0}
                    max={50}
                  />
                </Col>
                <Col span={12}>
                  <Text>学科均衡度: {task.weights.major}</Text>
                  <Slider
                    value={task.weights.major}
                    onChange={(value) =>
                      handleUpdateTask(task.id, {
                        weights: { ...task.weights, major: value },
                      })
                    }
                    min={0}
                    max={50}
                  />
                </Col>
                <Col span={12}>
                  <Text>学习主动性均衡度: {task.weights.activeScore}</Text>
                  <Slider
                    value={task.weights.activeScore}
                    onChange={(value) =>
                      handleUpdateTask(task.id, {
                        weights: { ...task.weights, activeScore: value },
                      })
                    }
                    min={0}
                    max={50}
                  />
                </Col>
                <Col span={12}>
                  <Text>组长候选人分布: {task.weights.leader}</Text>
                  <Slider
                    value={task.weights.leader}
                    onChange={(value) =>
                      handleUpdateTask(task.id, {
                        weights: { ...task.weights, leader: value },
                      })
                    }
                    min={0}
                    max={50}
                  />
                </Col>
                {task.mode === 'learning-style' && (
                  <>
                    <Col span={12}>
                      <Text>组内学习风格异质性: {task.weights.intraStyleDiversity}</Text>
                      <Slider
                        value={task.weights.intraStyleDiversity}
                        onChange={(value) =>
                          handleUpdateTask(task.id, {
                            weights: { ...task.weights, intraStyleDiversity: value },
                          })
                        }
                        min={0}
                        max={50}
                      />
                    </Col>
                    <Col span={12}>
                      <Text>组间风格构成同质性: {task.weights.interStyleSimilarity}</Text>
                      <Slider
                        value={task.weights.interStyleSimilarity}
                        onChange={(value) =>
                          handleUpdateTask(task.id, {
                            weights: { ...task.weights, interStyleSimilarity: value },
                          })
                        }
                        min={0}
                        max={50}
                      />
                    </Col>
                  </>
                )}
              </Row>
            </Form>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div>
      <Title level={2}>第二步：配置您的分组任务</Title>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {tasks.length > 0 ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {tasks.map((task) => renderTaskCard(task))}
          </Space>
        ) : (
          <Card>
            <Text type="secondary">暂无分组任务，点击下方按钮创建任务</Text>
          </Card>
        )}

        <Button type="dashed" block icon={<PlusOutlined />} onClick={handleAddTask}>
          添加分组任务
        </Button>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button size="large" icon={<ArrowLeftOutlined />} onClick={handlePrevious}>
            上一步
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<ArrowRightOutlined />}
            onClick={handleStartGrouping}
            disabled={tasks.length === 0}
          >
            开始智能分组
          </Button>
        </div>
      </Space>
    </div>
  );
};

export default GroupingConfigPage;
