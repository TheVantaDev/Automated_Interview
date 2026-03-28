import React, { createContext, useContext, useState, useCallback } from "react";

type InterviewStep = "upload" | "interview" | "results";

interface Question {
  id: number;
  category: string;
  question: string;
}

interface InterviewState {
  fileName: string | null;
  currentStep: InterviewStep;
  answers: Record<number, string>;
  predictedCategory: string | null;
  resumeSnippet: string | null;
  questions: Question[];
  skillsExtracted: string[];
  scores: any[];
  isSubmitting: boolean;
  cameraAlerts: string[];
}

interface InterviewContextType extends InterviewState {
  setFile: (name: string) => void;
  setAnswer: (questionId: number, answer: string) => void;
  submitInterview: () => Promise<void>;
  resetInterview: () => void;
  goToInterview: () => void;
  addCameraAlert: (msg: string) => void;
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
  scores: [],
  isSubmitting: false,
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

  // ─── FIX: submitInterview is truly async – navigate ONLY after scores arrive ──
  const submitInterview = useCallback(async () => {
    setState((prev) => ({ ...prev, isSubmitting: true }));
    try {
      const results = await Promise.all(
        state.questions.map(async (q) => {
          const answer = state.answers[q.id] || "";
          if (!answer.trim()) {
            return {
              category: q.category,
              score: 0,
              maxScore: 10,
              feedback: "No answer provided.",
            };
          }
          const response = await fetch("http://localhost:8000/api/score-answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: q.question, answer }),
          });
          if (!response.ok) throw new Error("Failed to score answer");
          const data = await response.json();
          return {
            category: q.category,
            score: data.score,
            maxScore: 10,
            feedback: data.feedback,
          };
        })
      );
      setState((prev) => ({
        ...prev,
        currentStep: "results",
        scores: results,
        isSubmitting: false,
      }));
    } catch (err) {
      console.error("Error submitting interview:", err);
      // Still move to results so the user isn't stuck
      setState((prev) => ({ ...prev, currentStep: "results", isSubmitting: false }));
    }
  }, [state.questions, state.answers]);

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
