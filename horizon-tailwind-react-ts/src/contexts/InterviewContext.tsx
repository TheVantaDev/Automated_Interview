import React, { createContext, useContext, useState, useCallback } from "react";

type InterviewStep = "upload" | "interview" | "results";

interface InterviewState {
  fileName: string | null;
  currentStep: InterviewStep;
  answers: Record<number, string>;
}

interface InterviewContextType extends InterviewState {
  setFile: (name: string) => void;
  setAnswer: (questionId: number, answer: string) => void;
  submitInterview: () => void;
  resetInterview: () => void;
  goToInterview: () => void;
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
