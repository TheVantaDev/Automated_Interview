import React, { createContext, useContext, useState, useCallback } from "react";

type InterviewStep = "upload" | "interview" | "results";

// shape of each question coming from the backend
interface Question {
  id: number;
  category: string;
  question: string;
}

interface ScoringResult {
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
  results: ScoringResult[];
  isScoring: boolean;
}

interface InterviewContextType extends InterviewState {
  setFile: (name: string) => void;
  setAnswer: (questionId: number, answer: string) => void;
  submitInterview: () => void;
  resetInterview: () => void;
  goToInterview: () => void;
  setIsScoring: (val: boolean) => void;
  setResults: (results: ScoringResult[]) => void;
  setBackendData: (data: {
    predicted_category: string;
    resume_snippet: string;
    questions: Question[];
  }) => void;
}

const InterviewContext = createContext<InterviewContextType | undefined>(
  undefined
);

export const InterviewProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<InterviewState>({
    fileName: null,
    currentStep: "upload",
    answers: {},
    predictedCategory: null,
    resumeSnippet: null,
    questions: [],
    results: [],
    isScoring: false,
  });

  const setFile = useCallback((name: string) => {
    setState((prev) => ({ ...prev, fileName: name }));
  }, []);

  const setAnswer = useCallback((questionId: number, answer: string) => {
    setState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answer },
    }));
  }, []);

  const setIsScoring = useCallback((val: boolean) => {
    setState((prev) => ({ ...prev, isScoring: val }));
  }, []);

  const setResults = useCallback((results: ScoringResult[]) => {
    setState((prev) => ({ ...prev, results }));
  }, []);

  // store the response that comes back from /api/upload-resume
  const setBackendData = useCallback(
    (data: {
      predicted_category: string;
      resume_snippet: string;
      questions: Question[];
    }) => {
      setState((prev) => ({
        ...prev,
        predictedCategory: data.predicted_category,
        resumeSnippet: data.resume_snippet,
        questions: data.questions,
      }));
    },
    []
  );

  const goToInterview = useCallback(() => {
    setState((prev) => ({ ...prev, currentStep: "interview" }));
  }, []);

  const submitInterview = useCallback(() => {
    setState((prev) => ({ ...prev, currentStep: "results" }));
  }, []);

  const resetInterview = useCallback(() => {
    setState({
      fileName: null,
      currentStep: "upload",
      answers: {},
      predictedCategory: null,
      resumeSnippet: null,
      questions: [],
      results: [],
      isScoring: false,
    });
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
        setBackendData,
        setIsScoring,
        setResults,
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
