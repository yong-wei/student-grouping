import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FaceControls from '../components/FaceControls';
import { useAppStore } from '../store';

const initialState = useAppStore.getState();

describe('FaceControls', () => {
  beforeEach(() => {
    useAppStore.setState({
      ...initialState,
      faceSettings: {
        ...initialState.faceSettings,
        enabled: false,
      },
    });
  });

  it('默认折叠分析脸图配置，并在开启后展开显示每个特征配置行', async () => {
    const user = userEvent.setup();
    render(<FaceControls />);

    expect(screen.queryByText('脸型大小')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /分析脸图配置/ })).toBeInTheDocument();

    await user.click(screen.getByRole('switch'));
    await user.click(screen.getByRole('button', { name: /分析脸图配置/ }));

    expect(screen.getByText('脸型大小')).toBeInTheDocument();
    expect(screen.getByText('嘴型')).toBeInTheDocument();
    expect(screen.getByText('鼻子')).toBeInTheDocument();
    expect(screen.getByText('眼睛大小')).toBeInTheDocument();
    expect(screen.getByText('眼距')).toBeInTheDocument();
    expect(screen.getByText('眉形')).toBeInTheDocument();
  });
});
