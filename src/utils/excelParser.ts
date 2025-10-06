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
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as Record<string, unknown>[];

        const filteredRows = jsonData.filter((row) => {
          const studentNumber = row['学号'];
          const name = row['姓名'];
          const hasStudentNumber =
            studentNumber !== undefined && String(studentNumber).trim() !== '';
          const hasName = name !== undefined && String(name).trim() !== '';
          return hasStudentNumber || hasName;
        });

        const students: Student[] = filteredRows.map((row, index) => {
          // 安全地获取字段值
          const getStringValue = (value: unknown): string => {
            if (value === null || value === undefined) return '';
            return String(value);
          };

          const getNumberValue = (value: unknown, defaultValue = 0): number => {
            if (value === null || value === undefined) return defaultValue;
            const num = Number(value);
            return isNaN(num) ? defaultValue : num;
          };

          const getOptionalNumber = (value: unknown): number | undefined => {
            if (value === null || value === undefined || value === '') {
              return undefined;
            }
            const num = Number(value);
            return Number.isNaN(num) ? undefined : num;
          };

          const parseGender = (value: unknown): number => {
            const stringValue = getStringValue(value).trim();
            if (!stringValue) return 0;
            if (stringValue === '男') return 1;
            if (stringValue === '女') return 0;
            const numeric = Number(stringValue);
            if (numeric === 1) return 1;
            if (numeric === 0) return 0;
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

          const parseIlsAnswers = (): (number | null)[] => {
            return Array.from({ length: ILS_QUESTION_COUNT }, (_, questionIndex) => {
              const key = `${ILS_COLUMN_PREFIX}${questionIndex + 1}`;
              const rawValue = row[key];
              if (rawValue === undefined || rawValue === null || rawValue === '') {
                return null;
              }

              const numeric = Number(rawValue);
              if (numeric === 1 || numeric === 2) {
                return numeric;
              }

              return null;
            });
          };

          const ilsAnswers = parseIlsAnswers();
          const ilsCompleted = ilsAnswers.every((answer) => answer === 1 || answer === 2);
          const learningStyles = ilsCompleted
            ? calculateLearningStyleFromILS(ilsAnswers)
            : createEmptyLearningStyle();

          const totalStyleIntensity = ilsCompleted
            ? Math.abs(learningStyles.activeReflective) +
              Math.abs(learningStyles.sensingIntuitive) +
              Math.abs(learningStyles.visualVerbal) +
              Math.abs(learningStyles.sequentialGlobal)
            : 0;

          // 提取基本字段
          const studentNumber = getStringValue(row['学号']);
          const name = getStringValue(row['姓名']);

          // 构建学生对象
          const student: Student = {
            id: studentNumber || `student-${index}`,
            serialNumber: getNumberValue(row['序号'], index + 1),
            studentNumber,
            name,
            gender: parseGender(row['性别']),
            isLeader: parseLeader(row['组长']),
            ranking: getNumberValue(row['排名']),
            major: getStringValue(row['专业']),
            totalScore: totalStyleIntensity,
            learningStyles,
            groupNumber: getOptionalNumber(row['分组序号']),
            ilsCompleted,
            ilsAnswers,
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

    const registerPair = (serialValue: string | number | undefined | null, nameValue: string | undefined | null) => {
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
