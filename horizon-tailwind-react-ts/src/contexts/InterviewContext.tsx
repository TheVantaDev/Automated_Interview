import React, { createContext, useContext, useState, useCallback } from "react";

type InterviewStep = "upload" | "interview" | "results";

// shape of each question coming from the backend
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
  scores?: any[]; // Array to hold the scoring results from backend
}

interface InterviewContextType extends InterviewState {
  setFile: (name: string) => void;
  setAnswer: (questionId: number, answer: string) => void;
  submitInterview: () => void;
  resetInterview: () => void;
  goToInterview: () => void;
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
    skillsExtracted: [],
    scores: [],
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

  // store the response that comes back from /api/upload-resume
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

  const submitInterview = useCallback(async () => {
    // We need to fetch scores for all answered questions
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

                // Call the backend
                const response = await fetch("http://localhost:8000/api/score-answer", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ question: q.question, answer: answer }),
                });

                if (!response.ok) {
                    throw new Error("Failed to score answer");
                }

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
            scores: results 
        }));
    } catch (err) {
        console.error("Error submitting interview:", err);
        // Navigate anyway or show error? Let's just move to results for now
        setState((prev) => ({ ...prev, currentStep: "results" }));
    }
  }, [state.questions, state.answers]);

  const resetInterview = useCallback(() => {
    setState({
      fileName: null,
      currentStep: "upload",
      answers: {},
      predictedCategory: null,
      resumeSnippet: null,
      questions: [],
      skillsExtracted: [],
      scores: [],
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
