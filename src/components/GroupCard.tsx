import React from 'react';
import { Card, Avatar, Tag, Descriptions, Space, Typography, Divider } from 'antd';
import { UserOutlined, CrownOutlined } from '@ant-design/icons';
import type { FaceFeature, Group, VisibleGroupStatistic } from '../types';
import LearningStyleRadar from './LearningStyleRadar';
import StudentFace from './StudentFace';
import { useAppStore } from '../store';
import { getVisibleGroupStatisticItems } from '../utils/groupStatisticDisplay';

const { Text } = Typography;

interface GroupCardProps {
  group: Group;
  draggable?: boolean;
  rankingRange: { min: number; max: number } | null;
  faceFeatures: Record<FaceFeature, boolean>;
  displayGroupNumber: number;
  visibleStatistics: VisibleGroupStatistic[];
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  rankingRange,
  faceFeatures,
  displayGroupNumber,
  visibleStatistics,
  draggable = false,
}) => {
  const faceEnabled = useAppStore((state) => state.faceSettings.enabled);
  const faceRanges = useAppStore((state) => state.faceSettings.ranges);
  const { members, statistics } = group;
  const statisticItems = getVisibleGroupStatisticItems(
    statistics,
    members.length,
    visibleStatistics,
    'card'
  );

  return (
    <Card
      title={
        <Space>
          <Text strong>第 {displayGroupNumber} 组</Text>
          <Tag color="blue">{members.length} 人</Tag>
        </Space>
      }
      size="small"
      style={{ marginBottom: 16 }}
      hoverable={draggable}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {statisticItems.length > 0 ? (
          <Descriptions size="small" column={2}>
            {statisticItems.map((item) => (
              <Descriptions.Item key={item.key} label={item.label}>
                {item.value}
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : (
          <Text type="secondary">当前未显示分组统计信息</Text>
        )}

        <LearningStyleRadar students={members} showTitle={false} height={220} />

        <Divider style={{ margin: '8px 0' }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px' }}>
          {members.map((member) => (
            <Space key={member.id} direction="vertical" size={4} style={{ alignItems: 'center' }}>
              {faceEnabled ? (
                <StudentFace
                  student={member}
                  rankingRange={rankingRange}
                  features={faceFeatures}
                  ranges={faceRanges}
                  size={70}
                />
              ) : (
                <Avatar
                  size={48}
                  src={member.photo}
                  icon={<UserOutlined />}
                  style={{
                    border: member.isLeader ? '2px solid #faad14' : '1px solid #d9d9d9',
                  }}
                />
              )}
              <Space size={2}>
                <Text
                  style={{ fontSize: '12px', maxWidth: 72 }}
                  ellipsis={{ tooltip: member.name }}
                >
                  {member.name}
                </Text>
                {member.isLeader && (
                  <CrownOutlined style={{ color: '#faad14', fontSize: '12px' }} />
                )}
              </Space>
            </Space>
          ))}
        </div>
      </Space>
    </Card>
  );
};

export default GroupCard;
