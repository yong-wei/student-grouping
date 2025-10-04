import React from 'react';
import { Card, Checkbox, Button, Slider, Space, Switch, Typography } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';
import type { FaceFeature } from '../types';
import { useAppStore } from '../store';

const { Text } = Typography;

const featureOptions: { label: string; value: FaceFeature }[] = [
  { label: '脸型大小（排名）', value: 'faceSize' },
  { label: '嘴型（积极/沉思）', value: 'mouth' },
  { label: '鼻子（感官/直觉）', value: 'nose' },
  { label: '眼睛大小（视觉/言语）', value: 'eyes' },
  { label: '眼距（顺序/全局）', value: 'eyeSpacing' },
  { label: '眉形（积极/沉思）', value: 'eyebrows' },
];

const FaceControls: React.FC = () => {
  const faceSettings = useAppStore((state) => state.faceSettings);
  const setFaceEnabled = useAppStore((state) => state.setFaceEnabled);
  const setFaceFeatures = useAppStore((state) => state.setFaceFeatures);
  const setFaceExaggeration = useAppStore((state) => state.setFaceExaggeration);

  const [localEnabled, setLocalEnabled] = React.useState(faceSettings.enabled);
  const [localFeatures, setLocalFeatures] = React.useState<Record<FaceFeature, boolean>>(
    faceSettings.features
  );
  const [rangesExpanded, setRangesExpanded] = React.useState(false);

  React.useEffect(() => {
    setLocalEnabled(faceSettings.enabled);
    setLocalFeatures(faceSettings.features);
    if (!faceSettings.enabled) {
      setRangesExpanded(false);
    }
  }, [faceSettings.enabled, faceSettings.features]);

  const selectedFeatures = Object.entries(localFeatures)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key as FaceFeature);

  const handleFeatureChange = (values: CheckboxValueType[]) => {
    const updated: Record<FaceFeature, boolean> = {
      faceSize: false,
      mouth: false,
      nose: false,
      eyes: false,
      eyeSpacing: false,
      eyebrows: false,
    };
    values.forEach((value) => {
      updated[value as FaceFeature] = true;
    });
    setLocalFeatures(updated);
    const hasChange = (Object.keys(updated) as FaceFeature[]).some(
      (key) => faceSettings.features[key] !== updated[key]
    );
    if (hasChange) {
      setFaceFeatures(updated);
    }
  };

  const handleIntensityChange = (feature: FaceFeature, value: number) => {
    setFaceExaggeration(feature, value);
  };

  const handleToggle = (checked: boolean) => {
    setLocalEnabled(checked);
    if (checked !== faceSettings.enabled) {
      setFaceEnabled(checked);
    }
  };

  return (
    <Card size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Space>
          <Switch checked={localEnabled} onChange={handleToggle} />
          <Text strong>显示学习风格脸图</Text>
        </Space>
        <Text type="secondary" style={{ marginLeft: 32 }}>
          学生头像将替换为基于学习风格特征的脸图，可选择参与映射的维度。
        </Text>
        <Checkbox.Group
          style={{
            paddingLeft: 32,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))',
            gap: 8,
          }}
          options={featureOptions}
          value={selectedFeatures}
          disabled={!localEnabled}
          onChange={handleFeatureChange}
        />
        {localEnabled && (
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Space style={{ justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Button
                type="text"
                size="small"
                icon={<DownOutlined rotate={rangesExpanded ? 180 : 0} />}
                onClick={() => setRangesExpanded((prev) => !prev)}
              >
                调整特征强度
              </Button>
              <Text type="secondary" style={{ fontSize: 12 }}>
                滑块控制特征强度：0 表示完全中性，1 表示达到系统上限。
              </Text>
            </Space>
            {rangesExpanded && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))',
                  gap: 16,
                }}
              >
                {featureOptions.map(({ label, value }) => {
                  const intensity = faceSettings.exaggerations[value];
                  const disabled = !localFeatures[value];
                  return (
                    <div key={value} style={{ opacity: disabled ? 0.5 : 1 }}>
                      <Space direction="vertical" style={{ width: '100%' }} size={4}>
                        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                          <Text strong>{label}</Text>
                          <Text type="secondary">
                            特征强度：{Math.round((intensity ?? 0) * 100)}%
                          </Text>
                        </Space>
                        <Slider
                          min={0}
                          max={1}
                          step={0.01}
                          value={intensity}
                          disabled={disabled}
                          onChange={(val) => {
                            if (typeof val === 'number') {
                              handleIntensityChange(value, val);
                            }
                          }}
                          tooltip={{ formatter: (val) => `${Math.round((val ?? 0) * 100)}%` }}
                        />
                        <div />
                      </Space>
                    </div>
                  );
                })}
              </div>
            )}
          </Space>
        )}
      </Space>
    </Card>
  );
};

export default FaceControls;
