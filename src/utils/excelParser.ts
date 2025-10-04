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

  const addEntry = (key: string | undefined | null, value: string) => {
    if (!key) return;
    const trimmed = key.trim();
    if (!trimmed) return;
    photoMap.set(trimmed, value);
    const compact = trimmed.replace(/\s+/g, '');
    if (compact && compact !== trimmed) {
      photoMap.set(compact, value);
    }
  };

  for (const file of files) {
    const fileName = file.name;
    const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    const objectUrl = URL.createObjectURL(file);

    // 原始文件名（去除扩展名）
    addEntry(baseName, objectUrl);

    const segments = baseName
      .split(/[_-]/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    const serialSegmentIndex = segments.findIndex((segment) => /^序[号號]?\d+$/u.test(segment));

    if (serialSegmentIndex !== -1) {
      const serialSegment = segments[serialSegmentIndex];
      const serialMatch = serialSegment.match(/\d+/u);
      if (serialMatch) {
        const serial = String(Number(serialMatch[0]));
        addEntry(serial, objectUrl);
        addEntry(`序号${serial}`, objectUrl);
      }

      const possibleName = segments[serialSegmentIndex + 1];
      if (possibleName) {
        addEntry(possibleName, objectUrl);
      }
    } else {
      // 尝试从包含“序号X”模式的整段中提取
      const serialPattern = baseName.match(/序[号號]?(\d+)/u);
      if (serialPattern) {
        const serial = String(Number(serialPattern[1]));
        addEntry(serial, objectUrl);
        addEntry(`序号${serial}`, objectUrl);
      }
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
    // 尝试用学号匹配
    let photo = photoMap.get(student.studentNumber);

    // 如果学号没匹配上，尝试用姓名匹配
    if (!photo) {
      photo = photoMap.get(student.name);
    }

    if (!photo) {
      photo = photoMap.get(student.name?.replace(/\s+/g, ''));
    }

    if (!photo) {
      photo = photoMap.get(String(student.serialNumber));
    }

    if (!photo) {
      photo = photoMap.get(`序号${student.serialNumber}`);
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
