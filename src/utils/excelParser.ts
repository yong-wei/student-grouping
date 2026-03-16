import * as XLSX from 'xlsx';
import type { Student, LearningStyle } from '../types';
import { calculateLearningStyleFromILS } from './learningStyleUtils';

const createEmptyLearningStyle = (): LearningStyle => ({
  activeReflective: 0,
  sensingIntuitive: 0,
  visualVerbal: 0,
  sequentialGlobal: 0,
  active: 0,
  reflective: 0,
  sensing: 0,
  intuitive: 0,
  visual: 0,
  verbal: 0,
  sequential: 0,
  global: 0,
});

const ILS_COLUMN_PREFIX = 'ILS';
const ILS_QUESTION_COUNT = 44;
const PHOTO_KEY_SEPARATOR = '::';
const ILS_RAW_FIRST_QUESTION = '1.在我（    ）之后，我对某事物有了更好的理解。';

const FIELD_ALIASES = {
  serialNumber: ['序号'],
  studentNumber: ['学号', '2.你的学号', '3.你的学号'],
  name: ['姓名', '1.你的姓名'],
  gender: ['性别', '2.你的性别'],
  major: ['专业', '4.你的专业'],
  leader: ['组长', '5.你是否愿意承担本课程中小组长的角色', '7.你是否愿意承担本课程中小组长的角色'],
  rankingPercent: ['排名', 'gpa排名百分比', '成绩排名百分比'],
  initiativeScore: ['学习主动性总分'],
  extroversionScore: ['外向程度', '外向程度总分'],
  extroQuestionOne: ['在小组合作讨论中你通常是哪种状态'],
  extroQuestionTwo: ['在一次持续60分钟的小组合作任务结束后你通常感觉'],
  groupNumber: ['分组序号', '分组情况'],
  activeReflective: ['积极沉思'],
  sensingIntuitive: ['感官直觉'],
  visualVerbal: ['视觉言语'],
  sequentialGlobal: ['顺序全局'],
  active: ['积极'],
  reflective: ['沉思'],
  sensing: ['感官'],
  intuitive: ['直觉'],
  visual: ['视觉'],
  verbal: ['言语'],
  sequential: ['顺序'],
  global: ['全局'],
} as const;

type RowRecord = Record<string, unknown>;

const normalizeHeader = (value: string): string =>
  value
    .replace(/[\s\u3000]+/gu, '')
    .replace(/[（）()：:？?，,。.!！、'"“”‘’\-—_/%％]/gu, '')
    .toLowerCase();

const findColumnKey = (
  headers: string[],
  aliases: readonly string[],
  options?: { exact?: boolean }
): string | undefined => {
  const normalizedAliases = aliases.map((alias) => normalizeHeader(alias));

  return headers.find((header) => {
    const normalizedHeader = normalizeHeader(header);
    return normalizedAliases.some((alias) =>
      options?.exact ? normalizedHeader === alias : normalizedHeader.includes(alias)
    );
  });
};

const getValueByAliases = (
  row: RowRecord,
  headers: string[],
  aliases: readonly string[],
  options?: { exact?: boolean }
): unknown => {
  const key = findColumnKey(headers, aliases, options);
  return key ? row[key] : undefined;
};

const parseNumericValue = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const stringValue = String(value).trim();
  if (!stringValue || stringValue.toLowerCase() === '#n/a') {
    return undefined;
  }

  const numeric = Number(stringValue);
  return Number.isNaN(numeric) ? undefined : numeric;
};

const deriveLearningStylePair = (
  dimensionValue: number
): { positive: number; negative: number } => {
  const positive = Math.round((11 - dimensionValue) / 2);
  return {
    positive: Math.max(0, Math.min(11, positive)),
    negative: Math.max(0, Math.min(11, 11 - positive)),
  };
};

const parseComputedLearningStyle = (row: RowRecord, headers: string[]): LearningStyle | null => {
  const activeReflective = parseNumericValue(
    getValueByAliases(row, headers, FIELD_ALIASES.activeReflective, { exact: true })
  );
  const sensingIntuitive = parseNumericValue(
    getValueByAliases(row, headers, FIELD_ALIASES.sensingIntuitive, { exact: true })
  );
  const visualVerbal = parseNumericValue(
    getValueByAliases(row, headers, FIELD_ALIASES.visualVerbal, { exact: true })
  );
  const sequentialGlobal = parseNumericValue(
    getValueByAliases(row, headers, FIELD_ALIASES.sequentialGlobal, { exact: true })
  );

  if (
    activeReflective === undefined ||
    sensingIntuitive === undefined ||
    visualVerbal === undefined ||
    sequentialGlobal === undefined
  ) {
    return null;
  }

  const activeReflectivePair = deriveLearningStylePair(activeReflective);
  const sensingIntuitivePair = deriveLearningStylePair(sensingIntuitive);
  const visualVerbalPair = deriveLearningStylePair(visualVerbal);
  const sequentialGlobalPair = deriveLearningStylePair(sequentialGlobal);

  return {
    activeReflective,
    sensingIntuitive,
    visualVerbal,
    sequentialGlobal,
    active:
      parseNumericValue(getValueByAliases(row, headers, FIELD_ALIASES.active, { exact: true })) ??
      activeReflectivePair.positive,
    reflective:
      parseNumericValue(
        getValueByAliases(row, headers, FIELD_ALIASES.reflective, { exact: true })
      ) ?? activeReflectivePair.negative,
    sensing:
      parseNumericValue(getValueByAliases(row, headers, FIELD_ALIASES.sensing, { exact: true })) ??
      sensingIntuitivePair.positive,
    intuitive:
      parseNumericValue(
        getValueByAliases(row, headers, FIELD_ALIASES.intuitive, { exact: true })
      ) ?? sensingIntuitivePair.negative,
    visual:
      parseNumericValue(getValueByAliases(row, headers, FIELD_ALIASES.visual, { exact: true })) ??
      visualVerbalPair.positive,
    verbal:
      parseNumericValue(getValueByAliases(row, headers, FIELD_ALIASES.verbal, { exact: true })) ??
      visualVerbalPair.negative,
    sequential:
      parseNumericValue(
        getValueByAliases(row, headers, FIELD_ALIASES.sequential, { exact: true })
      ) ?? sequentialGlobalPair.positive,
    global:
      parseNumericValue(getValueByAliases(row, headers, FIELD_ALIASES.global, { exact: true })) ??
      sequentialGlobalPair.negative,
  };
};

const parseIlsAnswers = (row: RowRecord, headers: string[]): (number | null)[] | undefined => {
  const directKeys = Array.from({ length: ILS_QUESTION_COUNT }, (_, index) =>
    headers.find(
      (header) => normalizeHeader(header) === normalizeHeader(`${ILS_COLUMN_PREFIX}${index + 1}`)
    )
  );
  const hasDirectIlsColumns = directKeys.some(Boolean);

  if (hasDirectIlsColumns) {
    return directKeys.map((key) => {
      if (!key) return null;
      const numeric = parseNumericValue(row[key]);
      return numeric === 1 || numeric === 2 ? numeric : null;
    });
  }

  const rawStartIndex = headers.findIndex(
    (header) => normalizeHeader(header) === normalizeHeader(ILS_RAW_FIRST_QUESTION)
  );
  if (rawStartIndex === -1) {
    return undefined;
  }

  const rawHeaders = headers.slice(rawStartIndex, rawStartIndex + ILS_QUESTION_COUNT);
  if (rawHeaders.length < ILS_QUESTION_COUNT) {
    return undefined;
  }

  return rawHeaders.map((header) => {
    const numeric = parseNumericValue(row[header]);
    return numeric === 1 || numeric === 2 ? numeric : null;
  });
};

const normalizeSerialKey = (input: string | number | undefined | null): string | undefined => {
  if (input === null || input === undefined) {
    return undefined;
  }

  if (typeof input === 'number' && Number.isFinite(input)) {
    return String(Math.trunc(input));
  }

  const trimmed = String(input).trim();
  if (!trimmed) {
    return undefined;
  }

  const serialMatch = trimmed.match(/\d+/u);
  if (!serialMatch) {
    return undefined;
  }

  return String(Number(serialMatch[0]));
};

const normalizeNameKey = (input: string | undefined | null): string | undefined => {
  if (input === null || input === undefined) {
    return undefined;
  }

  const trimmed = String(input).trim();
  if (!trimmed) {
    return undefined;
  }

  const compact = trimmed
    .replace(/[\s\u3000]+/gu, '')
    .replace(/[·•]/gu, '')
    .toLowerCase();

  return compact || undefined;
};

const createPhotoCompositeKey = (serial: string, name: string): string => {
  return `${serial}${PHOTO_KEY_SEPARATOR}${name}`;
};

/**
 * 解析 Excel 文件并提取学生数据
 */
export async function parseExcelFile(file: File): Promise<Student[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as RowRecord[];
        const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

        const filteredRows = jsonData.filter((row) => {
          const studentNumber = getValueByAliases(row, headers, FIELD_ALIASES.studentNumber);
          const name = getValueByAliases(row, headers, FIELD_ALIASES.name);
          const hasStudentNumber =
            studentNumber !== undefined && String(studentNumber).trim() !== '';
          const hasName = name !== undefined && String(name).trim() !== '';
          return hasStudentNumber || hasName;
        });

        const students: Student[] = filteredRows.map((row, index) => {
          // 安全地获取字段值
          const getStringValue = (value: unknown): string => {
            if (value === null || value === undefined) return '';
            return String(value).trim();
          };

          const getNumberValue = (value: unknown, defaultValue = 0): number => {
            const num = parseNumericValue(value);
            return num ?? defaultValue;
          };

          const getOptionalNumber = (value: unknown): number | undefined => {
            return parseNumericValue(value);
          };

          const parseGender = (value: unknown): number => {
            const stringValue = getStringValue(value).trim();
            if (!stringValue) return 0;
            if (stringValue === '男') return 1;
            if (stringValue === '女') return 0;
            const numeric = Number(stringValue);
            if (numeric === 1) return 1;
            if (numeric === 0) return 0;
            if (numeric === 2) return 0;
            return 0;
          };

          const parseLeader = (value: unknown): boolean => {
            const stringValue = getStringValue(value).trim().toLowerCase();
            if (!stringValue) return false;
            if (['1', '是', 'y', 'yes', 'true'].includes(stringValue)) {
              return true;
            }
            if (['0', '否', 'n', 'no', 'false'].includes(stringValue)) {
              return false;
            }
            const numeric = Number(stringValue);
            return numeric === 1;
          };

          const ilsAnswers = parseIlsAnswers(row, headers);
          const parsedComputedLearningStyle = parseComputedLearningStyle(row, headers);
          const ilsCompleted =
            ilsAnswers?.every((answer) => answer === 1 || answer === 2) ??
            Boolean(parsedComputedLearningStyle);
          const learningStyles =
            ilsAnswers && ilsCompleted
              ? calculateLearningStyleFromILS(ilsAnswers)
              : (parsedComputedLearningStyle ?? createEmptyLearningStyle());

          const learningStyleIntensity =
            Math.abs(learningStyles.activeReflective) +
            Math.abs(learningStyles.sensingIntuitive) +
            Math.abs(learningStyles.visualVerbal) +
            Math.abs(learningStyles.sequentialGlobal);

          // 提取基本字段
          const studentNumber = getStringValue(
            getValueByAliases(row, headers, FIELD_ALIASES.studentNumber)
          );
          const name = getStringValue(getValueByAliases(row, headers, FIELD_ALIASES.name));
          const rankingPercent = getOptionalNumber(
            getValueByAliases(row, headers, FIELD_ALIASES.rankingPercent)
          );
          const initiativeScore =
            getNumberValue(getValueByAliases(row, headers, FIELD_ALIASES.initiativeScore)) || 0;
          const directExtroversionScore = getOptionalNumber(
            getValueByAliases(row, headers, FIELD_ALIASES.extroversionScore)
          );
          const extroversionQuestionOne = getOptionalNumber(
            getValueByAliases(row, headers, FIELD_ALIASES.extroQuestionOne)
          );
          const extroversionQuestionTwo = getOptionalNumber(
            getValueByAliases(row, headers, FIELD_ALIASES.extroQuestionTwo)
          );
          const extroversionScore =
            directExtroversionScore ??
            (extroversionQuestionOne !== undefined && extroversionQuestionTwo !== undefined
              ? extroversionQuestionOne + extroversionQuestionTwo
              : 0);

          // 构建学生对象
          const student: Student = {
            id: studentNumber || `student-${index}`,
            serialNumber: getNumberValue(
              getValueByAliases(row, headers, FIELD_ALIASES.serialNumber),
              index + 1
            ),
            studentNumber,
            name,
            gender: parseGender(getValueByAliases(row, headers, FIELD_ALIASES.gender)),
            isLeader: parseLeader(getValueByAliases(row, headers, FIELD_ALIASES.leader)),
            rankingPercent,
            major: getStringValue(getValueByAliases(row, headers, FIELD_ALIASES.major)),
            learningStyleIntensity,
            initiativeScore,
            extroversionScore,
            learningStyles,
            groupNumber: getOptionalNumber(
              getValueByAliases(row, headers, FIELD_ALIASES.groupNumber)
            ),
            ilsCompleted,
            ilsAnswers: ilsAnswers?.some((answer) => answer !== null) ? ilsAnswers : undefined,
          };

          return student;
        });

        resolve(students);
      } catch (error) {
        reject(new Error(`解析 Excel 文件失败: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * 解析照片文件（支持文件夹或 ZIP）
 */
export async function parsePhotoFiles(files: File[]): Promise<Map<string, string>> {
  const photoMap = new Map<string, string>();

  for (const file of files) {
    const fileName = file.name;
    const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;

    const objectUrl =
      typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(file)
        : fileName;

    const serialCandidates = new Set<string>();
    const nameCandidates = new Set<string>();

    const registerSerial = (value: string | number | undefined | null) => {
      const normalized = normalizeSerialKey(value);
      if (normalized) {
        serialCandidates.add(normalized);
      }
    };

    const registerName = (value: string | undefined | null) => {
      const normalized = normalizeNameKey(value);
      if (normalized) {
        nameCandidates.add(normalized);
      }
    };

    const registerPair = (
      serialValue: string | number | undefined | null,
      nameValue: string | undefined | null
    ) => {
      const serial = normalizeSerialKey(serialValue);
      const name = normalizeNameKey(nameValue);
      if (serial && name) {
        serialCandidates.add(serial);
        nameCandidates.add(name);
      }
    };

    // 常见模式：序号紧跟姓名（例如“序号1_张三”或“1-张三”）
    const prefixedPattern = baseName.match(/^序[号號]?(\d+)[-_]*(.+)$/u);
    if (prefixedPattern) {
      registerPair(prefixedPattern[1], prefixedPattern[2]);
    }

    const numericPrefixPattern = baseName.match(/^(\d+)[-_]+(.+)$/u);
    if (numericPrefixPattern) {
      registerPair(numericPrefixPattern[1], numericPrefixPattern[2]);
    }

    const tightPrefixPattern = baseName.match(/^(\d+)([A-Za-z\u4e00-\u9fa5·•\s]+)$/u);
    if (tightPrefixPattern) {
      registerPair(tightPrefixPattern[1], tightPrefixPattern[2]);
    }

    const suffixPattern = baseName.match(/^(.+)[-_]+序[号號]?(\d+)$/u);
    if (suffixPattern) {
      registerPair(suffixPattern[2], suffixPattern[1]);
    }

    const segments = baseName
      .split(/[_-]/)
      .map((segment) => segment.trim())
      .filter(Boolean);

    segments.forEach((segment, index) => {
      const serialOnlyMatch = segment.match(/^序[号號]?(\d+)$/u);
      if (serialOnlyMatch) {
        registerSerial(serialOnlyMatch[1]);
        const next = segments[index + 1];
        if (next) {
          registerName(next);
        }
        return;
      }

      if (/^\d+$/u.test(segment)) {
        registerSerial(segment);
        const next = segments[index + 1];
        if (next) {
          registerName(next);
        }
        return;
      }

      const combinedSerialPrefix = segment.match(/^序[号號]?(\d+)(.+)$/u);
      if (combinedSerialPrefix) {
        registerPair(combinedSerialPrefix[1], combinedSerialPrefix[2]);
        return;
      }

      const combinedNumericPrefix = segment.match(/^(\d+)(.+)$/u);
      if (combinedNumericPrefix) {
        registerPair(combinedNumericPrefix[1], combinedNumericPrefix[2]);
        return;
      }

      registerName(segment);
    });

    if (serialCandidates.size > 0 && nameCandidates.size > 0) {
      serialCandidates.forEach((serial) => {
        nameCandidates.forEach((name) => {
          photoMap.set(createPhotoCompositeKey(serial, name), objectUrl);
        });
      });
    }
  }

  return photoMap;
}

/**
 * 验证数据完整性
 */
export function validateStudentData(students: Student[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  students.forEach((student, index) => {
    if (!student.studentNumber) {
      errors.push(`第 ${index + 1} 行：缺少学号`);
    }
    if (!student.name) {
      errors.push(`第 ${index + 1} 行：缺少姓名`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 匹配学生与照片
 */
export function matchStudentsWithPhotos(
  students: Student[],
  photoMap: Map<string, string>
): Student[] {
  return students.map((student) => {
    let photo: string | undefined;

    const serialKey = normalizeSerialKey(student.serialNumber);
    const nameKey = normalizeNameKey(student.name);

    if (serialKey && nameKey) {
      const compositeKey = createPhotoCompositeKey(serialKey, nameKey);
      photo = photoMap.get(compositeKey);
    }

    return {
      ...student,
      photo,
    };
  });
}

/**
 * 计算数据统计信息
 */
export function calculateDataStatistics(students: Student[]) {
  const totalStudents = students.length;
  const testedStudents = students.filter((s) => s.ilsCompleted).length;
  const studentsWithPhotos = students.filter((s) => s.photo).length;
  const preGroupedStudents = students.filter((s) => s.groupNumber !== undefined).length;

  return {
    totalStudents,
    testedStudents,
    studentsWithPhotos,
    studentsWithoutPhotos: totalStudents - studentsWithPhotos,
    preGroupedStudents,
    ungroupedStudents: totalStudents - preGroupedStudents,
    untestedStudents: totalStudents - testedStudents,
  };
}
