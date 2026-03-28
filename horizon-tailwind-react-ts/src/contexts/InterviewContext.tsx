import React, { createContext, useContext, useState, useCallback } from "react";

type InterviewStep = "upload" | "interview" | "results";

interface Question {
  id: number;
  category: string;
  question: string;
}

export interface ScoringResult {
  category: string;
  score: number;
  maxScore: number;
  feedback: string;
}

interface InterviewState {
  fileName: string | null;
  currentStep: InterviewStep;
  answers: Record<number, string>;
  predictedCategory: string | null;
  resumeSnippet: string | null;
  questions: Question[];
  skillsExtracted: string[];
  // Results from scoring
  results: ScoringResult[];
  isScoring: boolean;
  // Camera proctoring
  cameraAlerts: string[];
}

interface InterviewContextType extends InterviewState {
  setFile: (name: string) => void;
  setAnswer: (questionId: number, answer: string) => void;
  submitInterview: () => Promise<void>;
  resetInterview: () => void;
  goToInterview: () => void;
  addCameraAlert: (msg: string) => void;
  setIsScoring: (val: boolean) => void;
  setResults: (results: ScoringResult[]) => void;
  setBackendData: (data: {
    predicted_category: string;
    resume_snippet: string;
    questions: Question[];
    skills_extracted?: string[];
  }) => void;
}

const InterviewContext = createContext<InterviewContextType | undefined>(
  undefined
);

const INITIAL_STATE: InterviewState = {
  fileName: null,
  currentStep: "upload",
  answers: {},
  predictedCategory: null,
  resumeSnippet: null,
  questions: [],
  skillsExtracted: [],
  results: [],
  isScoring: false,
  cameraAlerts: [],
};

export const InterviewProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<InterviewState>(INITIAL_STATE);

  const setFile = useCallback((name: string) => {
    setState((prev) => ({ ...prev, fileName: name }));
  }, []);

  const setAnswer = useCallback((questionId: number, answer: string) => {
    setState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answer },
    }));
  }, []);

  const addCameraAlert = useCallback((msg: string) => {
    setState((prev) => ({
      ...prev,
      cameraAlerts: [...prev.cameraAlerts, msg],
    }));
  }, []);

  const setIsScoring = useCallback((val: boolean) => {
    setState((prev) => ({ ...prev, isScoring: val }));
  }, []);

  const setResults = useCallback((results: ScoringResult[]) => {
    setState((prev) => ({ ...prev, results }));
  }, []);

  // Store the response that comes back from /api/upload-resume
  const setBackendData = useCallback(
    (data: {
      predicted_category: string;
      resume_snippet: string;
      questions: Question[];
      skills_extracted?: string[];
    }) => {
      setState((prev) => ({
        ...prev,
        predictedCategory: data.predicted_category,
        resumeSnippet: data.resume_snippet,
        questions: data.questions,
        skillsExtracted: data.skills_extracted || [],
      }));
    },
    []
  );

  const goToInterview = useCallback(() => {
    setState((prev) => ({ ...prev, currentStep: "interview" }));
  }, []);

  // submitInterview transitions to results; the results page fetches scores itself
  const submitInterview = useCallback(async () => {
    setState((prev) => ({ ...prev, currentStep: "results", results: [], isScoring: false }));
  }, []);

  const resetInterview = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return (
    <InterviewContext.Provider
      value={{
        ...state,
        setFile,
        setAnswer,
        submitInterview,
        resetInterview,
        goToInterview,
        addCameraAlert,
        setIsScoring,
        setResults,
        setBackendData,
      }}
    >
      {children}
    </InterviewContext.Provider>
  );
};

export const useInterview = (): InterviewContextType => {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error("useInterview must be used within an InterviewProvider");
  }
  return context;
};
