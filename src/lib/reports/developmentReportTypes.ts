export type DevelopmentReportLesson = {
  id: string;
  lessonNo: number;
  lessonDate: string;
  wordsPerMinute: number | null;
  comprehensionScore: number | null;
  focusScore: number | null;
  teacherNote: string;
};

export type DevelopmentReportDailyAverage = {
  dateKey: string;
  lessonCount: number;
  wordsPerMinute: number | null;
  comprehensionScore: number | null;
  focusScore: number | null;
};

export type DevelopmentMetric = {
  first: number | null;
  last: number | null;
  delta: number | null;
  percent: number | null;
};

export type DevelopmentReport = {
  student: {
    id: string;
    name: string;
    educationStartDate: string | null;
    accessEndDate: string | null;
  };
  reportDate: string;
  lessons: DevelopmentReportLesson[];
  dailyAverages: DevelopmentReportDailyAverage[];
  metrics: {
    speed: DevelopmentMetric;
    comprehension: DevelopmentMetric;
    focus: DevelopmentMetric;
  };
};
