import React from 'react';
import { Button, Card, Col, Row, Select, Slider, Space, Switch, Typography } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import type { FaceFeature, FaceMetricKey } from '../types';
import { useAppStore } from '../store';
import {
  FACE_FEATURE_LABELS,
  FACE_FEATURES,
  FACE_METRIC_OPTIONS,
  FACE_METRIC_LABELS,
} from '../utils/faceConfig';

const { Text } = Typography;

const FaceControls: React.FC = () => {
  const faceSettings = useAppStore((state) => state.faceSettings);
  const setFaceEnabled = useAppStore((state) => state.setFaceEnabled);
  const setFaceBinding = useAppStore((state) => state.setFaceBinding);
  const setFaceExaggeration = useAppStore((state) => state.setFaceExaggeration);

  const [configExpanded, setConfigExpanded] = React.useState(false);

  React.useEffect(() => {
    if (!faceSettings.enabled) {
      setConfigExpanded(false);
    }
  }, [faceSettings.enabled]);

  const handleBindingChange = (feature: FaceFeature, metric: FaceMetricKey) => {
    setFaceBinding(feature, metric);
  };

  return (
    <Card size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Space>
          <Switch checked={faceSettings.enabled} onChange={setFaceEnabled} />
          <Text strong>显示分析脸图</Text>
        </Space>

        <Text type="secondary" style={{ marginLeft: 32 }}>
          开启后可为每个脸部特征指定数据属性，并用强度控制该特征的上下限。
        </Text>

        <Button
          type="text"
          icon={<DownOutlined rotate={configExpanded ? 180 : 0} />}
          onClick={() => setConfigExpanded((prev) => !prev)}
          disabled={!faceSettings.enabled}
          style={{ alignSelf: 'flex-start', paddingLeft: 32 }}
        >
          分析脸图配置
        </Button>

        {configExpanded && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {FACE_FEATURES.map((feature) => {
              const metric = faceSettings.bindings[feature];
              const intensity = faceSettings.exaggerations[feature];
              return (
                <Card key={feature} size="small" style={{ marginLeft: 32 }}>
                  <Row gutter={[16, 12]} align="middle">
                    <Col xs={24} md={4}>
                      <Text strong>{FACE_FEATURE_LABELS[feature]}</Text>
                    </Col>
                    <Col xs={24} md={8}>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Text type="secondary">对应数据属性</Text>
                        <Select
                          value={metric}
                          options={FACE_METRIC_OPTIONS}
                          onChange={(value) => handleBindingChange(feature, value as FaceMetricKey)}
                          aria-label={`${FACE_FEATURE_LABELS[feature]} 对应数据属性`}
                        />
                      </Space>
                    </Col>
                    <Col xs={24} md={12}>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                          <Text type="secondary">特征强度（{FACE_METRIC_LABELS[metric]}）</Text>
                          <Text type="secondary">{Math.round(intensity * 100)}%</Text>
                        </Space>
                        <Slider
                          min={0}
                          max={1}
                          step={0.01}
                          value={intensity}
                          onChange={(value) => {
                            if (typeof value === 'number') {
                              setFaceExaggeration(feature, value);
                            }
                          }}
                          tooltip={{ formatter: (value) => `${Math.round((value ?? 0) * 100)}%` }}
                        />
                      </Space>
                    </Col>
                  </Row>
                </Card>
              );
            })}
          </Space>
        )}
      </Space>
    </Card>
  );
};

export default FaceControls;
