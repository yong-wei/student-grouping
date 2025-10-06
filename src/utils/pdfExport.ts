import jsPDF from 'jspdf';
import type { FaceFeature, FaceFeatureRanges, GroupingTask, Student } from '../types';
import {
  LEARNING_DIMENSIONS,
  type LearningDimensionDescriptor,
} from '../constants/learningDimensions';
import { getLearningStyleVector } from './learningStyleUtils';
import {
  renderIndividualLearningStyleRadar,
  renderLearningStyleDistributionChart,
  renderLearningStyleRadarToDataURL,
  renderStudentRadar,
} from './chartExport';
import { addIndentedParagraph } from './pdfText';
import { NOTO_SANS_SC_BOLD, NOTO_SANS_SC_REGULAR } from './fonts/notoSansSC';
import { computeFaceMetrics, deriveFaceParameters, getGenderColor } from './faceUtils';
import { computeGlobalGroupMaps, collectUniqueStudentsFromTasks } from './groupingExportUtils';
import { DEFAULT_FACE_RANGES } from './faceConfig';

const FONT_FAMILY = 'NotoSansSC';
const FONT_SIZE_TITLE = 18;
const FONT_SIZE_SUBTITLE = 14;
const FONT_SIZE_TEXT = 11;
const LINE_HEIGHT = 6;
const PAGE_MARGIN = 20;

function ensureFonts(pdf: jsPDF) {
  pdf.addFileToVFS('NotoSansSC-Regular.ttf', NOTO_SANS_SC_REGULAR);
  pdf.addFont('NotoSansSC-Regular.ttf', FONT_FAMILY, 'normal');
  pdf.addFileToVFS('NotoSansSC-Bold.ttf', NOTO_SANS_SC_BOLD);
  pdf.addFont('NotoSansSC-Bold.ttf', FONT_FAMILY, 'bold');
  pdf.setFont(FONT_FAMILY, 'normal');
}

const DIMENSION_DESCRIPTORS: LearningDimensionDescriptor[] = LEARNING_DIMENSIONS;

const ORIENTATION_SUGGESTIONS: Record<string, string> = {
  积极: '通过讨论、实践和交流能够更快吸收知识，宜安排小组讨论和动手项目。',
  沉思: '倾向独立思考，宜给予思考时间并提供书面材料帮助梳理观点。',
  感官: '擅长记忆事实和落地执行，适合搭配案例分析和与实际结合的练习。',
  直觉: '善于抽象概括和联系，宜安排探索性任务并鼓励创新表达。',
  视觉: '图表、思维导图及视频等可视化材料能显著提升理解效率。',
  言语: '偏好文字与口头阐释，宜提供结构化笔记、讲义和讨论机会。',
  顺序: '按部就班推进效果最佳，宜给出步骤清晰的学习计划与阶段目标。',
  全局: '先建立整体框架再深入细节，宜提供纲要总结与跨主题连接。',
};

function addParagraph(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = LINE_HEIGHT,
  fontSize = FONT_SIZE_TEXT,
  fontStyle: 'normal' | 'bold' = 'normal',
  indent = 0
): number {
  const fontVariant = fontStyle === 'bold' ? 'bold' : 'normal';
  pdf.setFont(FONT_FAMILY, fontVariant);
  pdf.setFontSize(fontSize);
  if (fontStyle === 'bold' || indent === 0) {
    const lines = pdf.splitTextToSize(text, maxWidth) as string[];
    const pageHeight = pdf.internal.pageSize.getHeight();
    lines.forEach((line: string) => {
      if (y + lineHeight > pageHeight - PAGE_MARGIN) {
        pdf.addPage();
        y = PAGE_MARGIN;
      }
      pdf.text(line, x, y);
      y += lineHeight;
    });
    return y;
  }
  return addIndentedParagraph(pdf, text, x, y, maxWidth, lineHeight, indent);
}

function ensureSpace(pdf: jsPDF, currentY: number, requiredHeight: number): number {
  const pageHeight = pdf.internal.pageSize.getHeight();
  if (currentY + requiredHeight <= pageHeight - PAGE_MARGIN) {
    return currentY;
  }
  pdf.addPage();
  return PAGE_MARGIN;
}

async function loadImageAsDataURL(src?: string): Promise<string | null> {
  if (!src) return null;
  try {
    const response = await fetch(src);
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('无法加载图片用于报告导出', error);
    return null;
  }
}

function formatOrientationDescriptor(
  value: number,
  descriptor: LearningDimensionDescriptor
): {
  label: string;
  summary: string;
} {
  const intensity = Math.abs(value);
  const intensityLabel = intensity >= 9 ? '（强）' : intensity <= 3 ? '（弱）' : '（中）';
  const orientation = value < 0 ? descriptor.leftLabel : descriptor.rightLabel;
  const summary = `${descriptor.category}：${intensityLabel}${orientation}型`;
  return { label: orientation, summary };
}

interface FaceRenderOptions {
  includeFaces: boolean;
  features: Record<FaceFeature, boolean>;
  ranges: FaceFeatureRanges;
  rankingRange: { min: number; max: number } | null;
}

async function addGroupSection(
  pdf: jsPDF,
  group: NonNullable<GroupingTask['result']>['groups'][number],
  startY: number,
  faceOptions: FaceRenderOptions,
  displayNumber: number,
  taskName: string
): Promise<number> {
  const contentWidth = pdf.internal.pageSize.getWidth() - PAGE_MARGIN * 2;
  const chartWidth = 90;
  const chartHeight = 60;

  const maleCount = Math.round(group.statistics.genderBalance * group.members.length);
  const femaleCount = group.members.length - maleCount;
  const summaryLines = [
    `人数：${group.members.length} 人 | 学习风格多样性：${group.statistics.learningStyleDiversity.toFixed(2)}`,
    `男女比例：${maleCount}:${femaleCount} | 组长候选：${group.statistics.leaderCount} 人`,
    `平均学习风格强度：${group.statistics.averageScore.toFixed(2)} | 专业数：${group.statistics.majorDiversity}`,
    `来源分组任务：${taskName}`,
  ];
  const memberLines = group.members.map((member: Student) => {
    const leaderTag = member.isLeader ? ' · 组长候选' : '';
    return `• ${member.name}（${member.studentNumber}）${leaderTag}`;
  });

  const textLines = [...summaryLines, '', '成员列表：', ...memberLines];
  const textWidth = contentWidth - chartWidth - 10;
  const wrappedLines = textLines.flatMap((line) => pdf.splitTextToSize(line, textWidth));
  const textHeight = wrappedLines.length * LINE_HEIGHT;
  const headerHeight = 8;
  const memberCount = group.members.length;
  const usableWidth = pdf.internal.pageSize.getWidth() - PAGE_MARGIN * 2;
  const radarGap = memberCount > 1 ? 4 : 0;
  const maxRowWidth = usableWidth - PAGE_MARGIN * 0;
  const rawRadarSize =
    memberCount > 0 ? (maxRowWidth - radarGap * (memberCount - 1)) / Math.max(memberCount, 1) : 0;
  const radarSize = memberCount > 0 ? Math.max(18, Math.min(28, rawRadarSize)) : 0;
  const faceSize = faceOptions.includeFaces ? Math.max(12, radarSize * 0.6) : 0;
  let membersBlockHeight = 0;

  if (memberCount > 0) {
    membersBlockHeight += radarSize;
    membersBlockHeight += faceOptions.includeFaces ? faceSize + 2 : 0;
    membersBlockHeight += 10;
  }

  const requiredHeight =
    headerHeight +
    Math.max(chartHeight, textHeight) +
    8 +
    (memberCount > 0 ? membersBlockHeight : 0);

  let y = ensureSpace(pdf, startY, requiredHeight);
  pdf.setFont(FONT_FAMILY, 'bold');
  pdf.setFontSize(FONT_SIZE_SUBTITLE);
  pdf.text(`第 ${displayNumber} 组`, PAGE_MARGIN, y);
  y += headerHeight;

  const chartUrl = await renderLearningStyleRadarToDataURL(group.members, '', 480, 320, {
    title: '',
    showAxisName: true,
  });

  pdf.setFont(FONT_FAMILY, 'normal');
  pdf.setFontSize(FONT_SIZE_TEXT);

  const chartY = y;
  pdf.addImage(chartUrl, 'PNG', PAGE_MARGIN, chartY, chartWidth, chartHeight);

  let textY = chartY;
  wrappedLines.forEach((line: string) => {
    pdf.text(line, PAGE_MARGIN + chartWidth + 10, textY);
    textY += LINE_HEIGHT;
  });

  y = chartY + Math.max(chartHeight, textHeight) + 6;

  if (memberCount > 0) {
    const radarImages = await Promise.all(
      group.members.map((member: Student) => {
        const color = member.gender === 1 ? '#1890ff' : member.gender === 0 ? '#fa8c16' : '#8c8c8c';
        const pixelSize = Math.max(110, Math.round(radarSize * 3.5));
        return renderStudentRadar(member, {
          color,
          width: pixelSize,
          height: pixelSize,
          title: '',
          showAxisName: false,
        });
      })
    );

    let gridY = y;

    const drawFace = (member: Student, centerX: number, centerY: number) => {
      const ratios = computeFaceMetrics(member, faceOptions.rankingRange);
      const params = deriveFaceParameters(
        faceSize,
        ratios,
        faceOptions.features,
        faceOptions.ranges
      );
      const faceColor = getGenderColor(member.gender);

      pdf.setDrawColor(faceColor);
      pdf.setFillColor(255, 247, 230);
      pdf.setLineWidth(0.6);
      pdf.circle(centerX, centerY, params.faceRadius * 0.95, 'FD');

      const leftEyeX = centerX - params.eyeSpacing;
      const rightEyeX = centerX + params.eyeSpacing;
      const eyeY = centerY - params.faceRadius * 0.25;
      const browY = eyeY - params.eyeRadius * 1.5;

      pdf.setFillColor(89, 89, 89);
      pdf.ellipse(leftEyeX, eyeY, params.eyeRadius, params.eyeRadius * 0.85, 'F');
      pdf.ellipse(rightEyeX, eyeY, params.eyeRadius, params.eyeRadius * 0.85, 'F');

      pdf.setDrawColor(faceColor);
      pdf.setLineWidth(0.4);
      pdf.line(
        leftEyeX - params.eyeRadius,
        browY - params.browTilt,
        leftEyeX + params.eyeRadius,
        browY + params.browTilt
      );
      pdf.line(
        rightEyeX - params.eyeRadius,
        browY + params.browTilt,
        rightEyeX + params.eyeRadius,
        browY - params.browTilt
      );

      pdf.setDrawColor(89, 89, 89);
      pdf.setLineWidth(0.35);
      const noseTopY = centerY - params.faceRadius * 0.05;
      const noseBottomY = noseTopY + params.noseLength;
      pdf.line(centerX, noseTopY, centerX, noseBottomY);

      pdf.setDrawColor(faceColor);
      pdf.setLineWidth(0.6);
      const mouthY = centerY + params.faceRadius * 0.38;
      const mouthLeftX = centerX - params.mouthWidth;
      const mouthRightX = centerX + params.mouthWidth;
      const mouthControlY = mouthY + params.mouthCurve;

      let previousX = mouthLeftX;
      let previousY = mouthY;
      const segments = 8;
      for (let step = 1; step <= segments; step += 1) {
        const t = step / segments;
        const x = mouthLeftX + (mouthRightX - mouthLeftX) * t;
        const yVal = (1 - t) * (1 - t) * mouthY + 2 * (1 - t) * t * mouthControlY + t * t * mouthY;
        pdf.line(previousX, previousY, x, yVal);
        previousX = x;
        previousY = yVal;
      }
    };

    const totalRowWidth =
      memberCount * radarSize + (memberCount > 1 ? (memberCount - 1) * radarGap : 0);
    const rowStartX = PAGE_MARGIN + (usableWidth - totalRowWidth) / 2;

    radarImages.forEach((image: string, idx: number) => {
      const x = rowStartX + idx * (radarSize + radarGap);
      pdf.addImage(image, 'PNG', x, gridY, radarSize, radarSize, undefined, 'FAST');
    });

    gridY += radarSize + 0.8;

    if (faceOptions.includeFaces && faceSize > 0) {
      const faceCenterY = gridY + faceSize / 2;
      group.members.forEach((member: Student, idx: number) => {
        const centerX = rowStartX + idx * (radarSize + radarGap) + radarSize / 2;
        drawFace(member, centerX, faceCenterY);
      });
      gridY = faceCenterY + faceSize / 2 + 1.8;
    }

    const nameY = gridY + 1.8;
    pdf.setFont(FONT_FAMILY, 'normal');
    pdf.setFontSize(9);
    group.members.forEach((member: Student, idx: number) => {
      const centerX = rowStartX + idx * (radarSize + radarGap) + radarSize / 2;
      pdf.text(member.name, centerX, nameY, { align: 'center' });
    });
    gridY = nameY + 1.5;

    y = gridY + 1.5;
  }

  return y;
}

async function drawClassDistributionCharts(
  pdf: jsPDF,
  students: Student[],
  startY: number
): Promise<number> {
  if (students.length === 0) {
    return startY;
  }

  let y = startY;
  const contentWidth = pdf.internal.pageSize.getWidth() - PAGE_MARGIN * 2;
  const chartsPerRow = 2;
  const gap = 6;
  const slotWidth = (contentWidth - gap) / chartsPerRow;

  const chartInfos = await Promise.all(
    DIMENSION_DESCRIPTORS.map(async (descriptor) => {
      const renderResult = await renderLearningStyleDistributionChart(students, descriptor, {
        showTitle: false,
        edgeSerialsOnly: true,
        barWidth: 1.8,
        categoryGap: '0%',
        width: 440,
      });
      return { descriptor, renderResult };
    })
  );

  for (let i = 0; i < chartInfos.length; i += chartsPerRow) {
    const rowCharts = chartInfos.slice(i, i + chartsPerRow);
    const scaledHeights = rowCharts.map(({ renderResult }) => {
      const { width, height } = renderResult;
      return (slotWidth / width) * height;
    });
    const rowHeight = Math.max(...scaledHeights);
    const requiredHeight = rowHeight + 8;
    y = ensureSpace(pdf, y, requiredHeight);

    rowCharts.forEach(({ descriptor, renderResult }, idx) => {
      const x = PAGE_MARGIN + idx * (slotWidth + gap);
      const scaledHeight = (slotWidth / renderResult.width) * renderResult.height;

      pdf.setFont(FONT_FAMILY, 'bold');
      pdf.setFontSize(FONT_SIZE_TEXT);
      pdf.text(
        `${descriptor.category}（${descriptor.leftLabel} ←→ ${descriptor.rightLabel}）`,
        x + slotWidth / 2,
        y,
        { align: 'center' }
      );

      pdf.addImage(renderResult.dataUrl, 'PNG', x, y + 4, slotWidth, scaledHeight);
    });

    y += rowHeight + 8;
  }

  return y;
}

export async function generateClassAnalysisReport(
  tasks: GroupingTask[],
  options?: {
    includeFaces?: boolean;
    faceFeatures?: Record<FaceFeature, boolean>;
    faceRanges?: FaceFeatureRanges;
    rankingRange?: { min: number; max: number } | null;
  }
): Promise<void> {
  const tasksWithResult = tasks.filter(
    (task): task is GroupingTask & { result: NonNullable<GroupingTask['result']> } =>
      Boolean(task.result && task.result.groups.length > 0)
  );
  if (tasksWithResult.length === 0) {
    throw new Error('没有分组结果');
  }

  const globalMaps = computeGlobalGroupMaps(tasksWithResult);
  const allStudents = collectUniqueStudentsFromTasks(tasksWithResult);
  const faceRanges: FaceFeatureRanges = { ...DEFAULT_FACE_RANGES };
  if (options?.faceRanges) {
    (Object.keys(faceRanges) as FaceFeature[]).forEach((feature) => {
      const range = options.faceRanges![feature];
      if (range) {
        faceRanges[feature] = { ...range };
      }
    });
  }

  const defaultFaceFeatures: Record<FaceFeature, boolean> = {
    faceSize: true,
    mouth: true,
    nose: true,
    eyes: true,
    eyeSpacing: true,
    eyebrows: true,
  };
  const faceFeatures = options?.faceFeatures ?? defaultFaceFeatures;

  const faceOptions: FaceRenderOptions = {
    includeFaces: Boolean(options?.includeFaces),
    features: faceFeatures,
    ranges: faceRanges,
    rankingRange: options?.rankingRange ?? computeRankingRange(allStudents),
  };

  const pdf = new jsPDF('p', 'mm', 'a4');
  ensureFonts(pdf);
  pdf.setFont(FONT_FAMILY, 'bold');
  pdf.setFontSize(FONT_SIZE_TITLE);

  let y = PAGE_MARGIN;
  pdf.text('班级分组分析报告', PAGE_MARGIN, y);
  y += 10;
  pdf.setFont(FONT_FAMILY, 'bold');
  pdf.setFontSize(FONT_SIZE_SUBTITLE);
  y = addParagraph(
    pdf,
    '覆盖所有分组任务的汇总',
    PAGE_MARGIN,
    y,
    170,
    LINE_HEIGHT,
    FONT_SIZE_SUBTITLE,
    'bold'
  );
  y += 4;

  const totalTasks = tasksWithResult.length;
  const totalGroups = globalMaps.orderedGroups.length;

  pdf.text('一、总体概览', PAGE_MARGIN, y);
  y += 8;
  pdf.setFont(FONT_FAMILY, 'normal');
  pdf.setFontSize(FONT_SIZE_TEXT);
  const overviewLines = [
    `• 分组任务数：${totalTasks} 项`,
    `• 覆盖学生数：${allStudents.length} 人`,
    `• 总小组数：${totalGroups} 个`,
  ];

  tasksWithResult.forEach((task) => {
    const { statistics, qualityScore } = task.result;
    overviewLines.push(
      `• ${task.name}：${statistics.totalGroups} 组，平均每组 ${statistics.averageGroupSize.toFixed(
        1
      )} 人，质量分 ${qualityScore.toFixed(2)}`
    );
  });

  overviewLines.forEach((line) => {
    y = addParagraph(pdf, line, PAGE_MARGIN, y, 170, LINE_HEIGHT, FONT_SIZE_TEXT, 'normal', 2);
  });
  y += 2;

  pdf.setFont(FONT_FAMILY, 'bold');
  pdf.setFontSize(FONT_SIZE_SUBTITLE);
  pdf.text('二、质量分说明', PAGE_MARGIN, y);
  y += 8;
  pdf.setFont(FONT_FAMILY, 'normal');
  pdf.setFontSize(FONT_SIZE_TEXT);
  const statsDescription =
    '质量分由六个维度加权求和：性别均衡、专业多样性、学习主动性均衡、组长分布、组内学习风格异质性、组间学习风格同质性。权重取自配置页面设置，可用于对比不同分组任务的平衡性。';
  y = addParagraph(
    pdf,
    statsDescription,
    PAGE_MARGIN,
    y,
    170,
    LINE_HEIGHT,
    FONT_SIZE_TEXT,
    'normal',
    2
  );
  y += 4;

  pdf.setFont(FONT_FAMILY, 'bold');
  pdf.setFontSize(FONT_SIZE_SUBTITLE);
  pdf.text('三、班级学习风格概览', PAGE_MARGIN, y);
  y += 8;
  pdf.setFont(FONT_FAMILY, 'normal');
  pdf.setFontSize(FONT_SIZE_TEXT);
  y = addParagraph(
    pdf,
    '以下图表展示每位学生在四个维度上的倾向值（-11 至 11），左侧代表前者特质，右侧代表后者特质，可用于对比个人差异与班级整体偏好。',
    PAGE_MARGIN,
    y,
    170,
    LINE_HEIGHT,
    FONT_SIZE_TEXT,
    'normal',
    2
  );
  y += 2;
  y = await drawClassDistributionCharts(pdf, allStudents, y);
  y = addParagraph(
    pdf,
    '若需关注某一维度的突出学生，可结合颜色方向快速定位；颜色越靠右表示越偏向右侧特质。',
    PAGE_MARGIN,
    y,
    170,
    LINE_HEIGHT,
    FONT_SIZE_TEXT,
    'normal',
    2
  );
  y += 4;

  pdf.setFont(FONT_FAMILY, 'bold');
  pdf.setFontSize(FONT_SIZE_SUBTITLE);
  pdf.text('四、各小组概览', PAGE_MARGIN, y);
  y += 6;
  pdf.setFont(FONT_FAMILY, 'normal');
  pdf.setFontSize(FONT_SIZE_TEXT);
  y = addParagraph(
    pdf,
    '以下内容按照班级统一小组编号展示，括号内标注来源分组任务。',
    PAGE_MARGIN,
    y,
    170,
    LINE_HEIGHT,
    FONT_SIZE_TEXT,
    'normal',
    2
  );
  y += 2;

  for (const item of globalMaps.orderedGroups) {
    const task = item.task;
    const result = task.result;
    if (!result) continue;
    const group = result.groups.find((g) => g.id === item.groupId);
    if (!group) continue;

    y = await addGroupSection(pdf, group, y, faceOptions, item.globalGroupNumber, task.name);
  }

  const fileName = `班级分组分析报告_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}

function buildOrientationAdvice(student: Student): string[] {
  return DIMENSION_DESCRIPTORS.map((descriptor) => {
    const value = student.learningStyles[descriptor.diffKey];
    const { label, summary } = formatOrientationDescriptor(value, descriptor);
    const advice = ORIENTATION_SUGGESTIONS[label];
    return `${summary}：${advice}`;
  });
}

function calculateLearningVector(student: Student): number[] {
  return getLearningStyleVector(student.learningStyles);
}

const getIntensityLabel = (value: number) => {
  const absValue = Math.abs(value);
  if (absValue >= 9) return '（强）';
  if (absValue <= 3) return '（弱）';
  return '（中）';
};

const buildOrientationLine = (value: number, descriptor: LearningDimensionDescriptor) => {
  const label = value < 0 ? descriptor.leftLabel : descriptor.rightLabel;
  return `• ${descriptor.category}：${getIntensityLabel(value)}${label}`;
};
interface DimensionSummary {
  descriptor: LearningDimensionDescriptor;
  leftValue: number;
  rightValue: number;
  diff: number;
}

const buildDimensionDataForStudent = (student: Student): DimensionSummary[] =>
  DIMENSION_DESCRIPTORS.map((descriptor) => ({
    descriptor,
    leftValue: student.learningStyles[descriptor.leftValueKey],
    rightValue: student.learningStyles[descriptor.rightValueKey],
    diff: student.learningStyles[descriptor.diffKey],
  }));

const computeRankingRange = (students: Student[]): { min: number; max: number } | null => {
  const rankings = students
    .map((student) => student.ranking)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (rankings.length === 0) {
    return null;
  }
  const min = Math.min(...rankings);
  const max = Math.max(...rankings);
  if (Math.abs(max - min) < Number.EPSILON) {
    return null;
  }
  return { min, max };
};

const drawLearningStyleChart = (
  pdf: jsPDF,
  y: number,
  data: DimensionSummary[],
  options?: { label?: string }
): number => {
  const startX = PAGE_MARGIN;
  const width = pdf.internal.pageSize.getWidth() - PAGE_MARGIN * 2;
  const centerX = startX + width / 2;
  const barHeight = 6;
  const gap = 10;
  const max = 11;
  const formatValue = (num: number) =>
    Math.abs(num - Math.round(num)) < 0.05 ? String(Math.round(num)) : num.toFixed(1);

  const requiredHeight = data.length * (barHeight + gap) + 18;
  let currentY = ensureSpace(pdf, y, requiredHeight);

  pdf.setFont(FONT_FAMILY, 'normal');
  pdf.setFontSize(FONT_SIZE_TEXT);
  pdf.text(options?.label ?? '倾向性（左侧为前者，右侧为后者）', startX, currentY);
  currentY += 6;

  data.forEach(({ descriptor, leftValue, rightValue }, index) => {
    const top = currentY + index * (barHeight + gap);
    const leftRatio = Math.min(leftValue / max, 1);
    const rightRatio = Math.min(rightValue / max, 1);

    pdf.setDrawColor(200);
    pdf.setLineWidth(0.2);
    pdf.line(startX, top + barHeight + 2, startX + width, top + barHeight + 2);

    pdf.setDrawColor(51, 102, 153);
    pdf.setFillColor(128, 174, 231);
    pdf.rect(centerX - (width / 2) * leftRatio, top, (width / 2) * leftRatio, barHeight, 'FD');

    pdf.setDrawColor(204, 85, 85);
    pdf.setFillColor(240, 153, 153);
    pdf.rect(centerX, top, (width / 2) * rightRatio, barHeight, 'FD');

    pdf.setFont(FONT_FAMILY, 'normal');
    pdf.setFontSize(11);
    pdf.text(descriptor.leftLabel, startX, top - 1);
    pdf.text(descriptor.rightLabel, startX + width, top - 1, { align: 'right' });

    pdf.setFontSize(10);
    pdf.text(
      formatValue(leftValue),
      centerX - (width / 2) * leftRatio - 2,
      top + barHeight / 2 + 1,
      {
        align: 'right',
      }
    );
    pdf.text(
      formatValue(rightValue),
      centerX + (width / 2) * rightRatio + 2,
      top + barHeight / 2 + 1
    );
  });

  return currentY + data.length * (barHeight + gap) + 2;
};

export async function generateIndividualReport(
  student: Student,
  groupNumber: number
): Promise<Blob> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  ensureFonts(pdf);
  let y = PAGE_MARGIN;

  pdf.setFont(FONT_FAMILY, 'bold');
  pdf.setFontSize(FONT_SIZE_TITLE);
  pdf.text('个人学习风格报告', PAGE_MARGIN, y);
  y += 10;

  pdf.setFont(FONT_FAMILY, 'normal');
  pdf.setFontSize(FONT_SIZE_TEXT);

  const contentWidth = pdf.internal.pageSize.getWidth() - PAGE_MARGIN * 2;
  const columnGap = 12;
  const minPhotoColumnWidth = 60;
  let infoColumnWidth = Math.min(110, contentWidth * 0.55);
  let photoColumnWidth = contentWidth - infoColumnWidth - columnGap;
  if (photoColumnWidth < minPhotoColumnWidth) {
    photoColumnWidth = minPhotoColumnWidth;
    infoColumnWidth = Math.max(contentWidth - columnGap - photoColumnWidth, 60);
  }
  const groupLabel = groupNumber > 0 ? `第 ${groupNumber} 组` : '未分组';
  const baseInfoLines = [
    `姓名：${student.name}`,
    `学号：${student.studentNumber}`,
    `所属小组：${groupLabel}`,
  ];
  const infoWrapped = baseInfoLines.flatMap((line) => pdf.splitTextToSize(line, infoColumnWidth));
  const infoHeight = infoWrapped.length * LINE_HEIGHT;

  const introLines = [
    '本报告基于 Index of Learning Styles（Felder-Silverman 模型）问卷生成，旨在帮助您认识自己的学习偏好，制定与之匹配的策略。',
    '模型涵盖四个维度：信息加工（积极 vs 沉思）、信息感知（感官 vs 直觉）、信息输入（视觉 vs 言语）、内容理解（顺序 vs 全局）。',
  ];
  const introWrapped = introLines.flatMap((line) => pdf.splitTextToSize(line, infoColumnWidth));
  const introHeight = introWrapped.length * LINE_HEIGHT;

  const photoDataUrl = await loadImageAsDataURL(student.photo);
  let photoHeight = 0;
  let photoWidth = 0;
  let photoFormat: 'PNG' | 'JPEG' = 'PNG';
  if (photoDataUrl) {
    const props = pdf.getImageProperties(photoDataUrl);
    const ratio = props.width && props.height ? props.width / props.height : 1;
    const maxPhotoHeight = 50;
    const maxPhotoWidth = photoColumnWidth;
    const heightByWidth = maxPhotoWidth / ratio;
    photoHeight = Math.min(maxPhotoHeight, heightByWidth);
    photoWidth = photoHeight * ratio;
    photoFormat = photoDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
  }

  const blockHeight = Math.max(infoHeight + introHeight, photoHeight) + 6;
  y = ensureSpace(pdf, y, blockHeight);

  let infoY = y;
  infoWrapped.forEach((line) => {
    pdf.text(line, PAGE_MARGIN, infoY);
    infoY += LINE_HEIGHT;
  });
  infoY += 2;
  introWrapped.forEach((line: string, index) => {
    const indent = index === 0 ? pdf.getTextWidth('  ') : 0;
    if (infoY + LINE_HEIGHT > y + blockHeight - 2) {
      return;
    }
    pdf.text(line, PAGE_MARGIN + indent, infoY, {
      align: 'justify',
      maxWidth: infoColumnWidth - indent,
    });
    infoY += LINE_HEIGHT;
  });

  if (photoDataUrl && photoHeight > 0) {
    const photoX = PAGE_MARGIN + infoColumnWidth + columnGap + (photoColumnWidth - photoWidth) / 2;
    const photoY = y + (blockHeight - 6 - photoHeight) / 2;
    pdf.addImage(photoDataUrl, photoFormat, photoX, photoY, photoWidth, photoHeight);
  }

  y += blockHeight;

  const learningVector = calculateLearningVector(student);
  const individualRadarUrl = await renderIndividualLearningStyleRadar(
    learningVector,
    '学习风格雷达图'
  );
  const radarWidth = 120;
  const radarHeight = 86;
  y = ensureSpace(pdf, y, radarHeight + 6);
  const radarX = PAGE_MARGIN + (contentWidth - radarWidth) / 2;
  pdf.addImage(individualRadarUrl, 'PNG', radarX, y, radarWidth, radarHeight);
  y += radarHeight + 12;

  pdf.setFont(FONT_FAMILY, 'bold');
  pdf.setFontSize(FONT_SIZE_SUBTITLE);
  y = ensureSpace(pdf, y, 12);
  pdf.text('1 总览', PAGE_MARGIN, y);
  y += 8;

  pdf.setFont(FONT_FAMILY, 'normal');
  pdf.setFontSize(FONT_SIZE_TEXT);
  DIMENSION_DESCRIPTORS.forEach((descriptor) => {
    y = addParagraph(
      pdf,
      buildOrientationLine(student.learningStyles[descriptor.diffKey], descriptor),
      PAGE_MARGIN,
      y,
      170,
      LINE_HEIGHT,
      FONT_SIZE_TEXT,
      'normal',
      2
    );
  });
  y = addParagraph(
    pdf,
    '（强弱程度仅表示倾向性，不代表学习能力的高低。保持开放心态，可在不同情境中尝试调节策略。）',
    PAGE_MARGIN,
    y,
    170,
    LINE_HEIGHT,
    FONT_SIZE_TEXT,
    'normal',
    2
  );
  y += 4;

  pdf.setFont(FONT_FAMILY, 'bold');
  pdf.setFontSize(FONT_SIZE_SUBTITLE);
  y = ensureSpace(pdf, y, 12);
  pdf.text('2 学习风格维度', PAGE_MARGIN, y);
  y += 8;

  pdf.setFont(FONT_FAMILY, 'normal');
  pdf.setFontSize(FONT_SIZE_TEXT);
  y = addParagraph(
    pdf,
    '数字标识您在每个维度下的倾向程度：差值越靠近 ±11，说明越偏向某一侧；在 1~3 之间则表示两端较平衡，适应性更强。',
    PAGE_MARGIN,
    y,
    170,
    LINE_HEIGHT,
    FONT_SIZE_TEXT,
    'normal',
    2
  );
  y = drawLearningStyleChart(pdf, y + 4, buildDimensionDataForStudent(student));
  y += 2;
  y = addParagraph(
    pdf,
    '• 倾向差值 1~3：左右特质保持平衡，可灵活适应多样教学与任务。',
    PAGE_MARGIN,
    y,
    170,
    LINE_HEIGHT,
    FONT_SIZE_TEXT,
    'normal',
    2
  );
  y = addParagraph(
    pdf,
    '• 倾向差值 5 或 7：在相应特质上具备中等优势，宜发挥所长，同时尝试补充另一侧能力。',
    PAGE_MARGIN,
    y,
    170,
    LINE_HEIGHT,
    FONT_SIZE_TEXT,
    'normal',
    2
  );
  y = addParagraph(
    pdf,
    '• 倾向差值 9 或 11：对某端十分敏感，若环境不支持需主动调整策略并寻求外部帮助。',
    PAGE_MARGIN,
    y,
    170,
    LINE_HEIGHT,
    FONT_SIZE_TEXT,
    'normal',
    2
  );
  y += 4;

  pdf.setFont(FONT_FAMILY, 'bold');
  pdf.setFontSize(FONT_SIZE_SUBTITLE);
  y = ensureSpace(pdf, y, 12);
  pdf.text('3 学习建议', PAGE_MARGIN, y);
  y += 8;

  const adviceLines = buildOrientationAdvice(student);
  pdf.setFont(FONT_FAMILY, 'normal');
  pdf.setFontSize(FONT_SIZE_TEXT);
  adviceLines.forEach((line) => {
    y = addParagraph(
      pdf,
      `• ${line}`,
      PAGE_MARGIN,
      y,
      170,
      LINE_HEIGHT,
      FONT_SIZE_TEXT,
      'normal',
      2
    );
  });
  y += 4;

  pdf.setFont(FONT_FAMILY, 'bold');
  pdf.setFontSize(FONT_SIZE_SUBTITLE);
  y = ensureSpace(pdf, y, 12);
  pdf.text('4 学习提示', PAGE_MARGIN, y);
  y += 8;
  const tips = [
    '· 定期复盘 ILS 结果，关注自身偏好是否随课程进展发生变化。',
    '· 小组协作时主动说明个人优势，同时尝试承担与当前倾向相反的任务以拓展能力。',
    '· 制定学习计划时结合报告建议选择资源（文本/图像、实践/讨论等），强化针对性策略。',
  ];
  pdf.setFont(FONT_FAMILY, 'normal');
  tips.forEach((tip) => {
    y = addParagraph(pdf, tip, PAGE_MARGIN, y, 170, LINE_HEIGHT, FONT_SIZE_TEXT, 'normal', 2);
  });

  return pdf.output('blob');
}
