
export enum LoadingState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface ProblemInput {
  text: string;
  images: File[];
  audio: Blob | null;
}

export interface SolverResponse {
  rawText: string;
  sections: {
    identification: string;
    rootCause: string;
    solution: string[];
    highlightedArea?: string;
    confidence?: {
      score: number;
      label: string;
    };
    notes: string;
    followUpQuestions: string;
    quickActions: {
      tools: string;
      tests: string;
      severity: {
        level: string;
        explanation: string;
      };
    };
  };
}

export interface QAItem {
  question: string;
  answer: string;
}
