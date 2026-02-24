import React from "react";
import { useNavigate } from "react-router-dom";
import { MdSend } from "react-icons/md";
import CandidateCard from "./components/CandidateCard";
import QuestionItem from "./components/QuestionItem";
import { useInterview } from "contexts/InterviewContext";

const questions = [
    {
        id: 1,
        category: "Technical",
        question:
            "Explain the difference between `useMemo` and `useCallback` in React. When would you choose one over the other?",
    },
    {
        id: 2,
        category: "Problem Solving",
        question:
            "Given an API that returns paginated data, how would you implement an infinite scroll feature while maintaining good performance?",
    },
    {
        id: 3,
        category: "System Design",
        question:
            "How would you design a real-time collaborative editing system (like Google Docs)? What technologies and patterns would you use?",
    },
    {
        id: 4,
        category: "Behavioral",
        question:
            "Tell me about a time when you had to refactor a large codebase. What was your approach and what were the outcomes?",
    },
    {
        id: 5,
        category: "Cultural",
        question:
            "How do you handle disagreements with team members about technical decisions? Can you give a specific example?",
    },
];

const InterviewView = () => {
    const navigate = useNavigate();
    const { answers, setAnswer, submitInterview, fileName } = useInterview();

    const handleSubmit = () => {
        submitInterview();
        navigate("/admin/results");
    };

    const answeredCount = Object.values(answers).filter(
        (a) => a.trim().length > 0
    ).length;

    return (
        <div className="mt-3">
            {/* Header Bar */}
            <div className="mb-6 flex items-center justify-between rounded-2xl bg-white p-4 shadow-md dark:bg-navy-800">
                <div>
                    <h2 className="text-xl font-bold text-navy-700 dark:text-white">
                        Interview Mode
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {fileName
                            ? `Analyzing: ${fileName}`
                            : "Answer the following questions based on the candidate's resume"}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="rounded-full bg-brand-50 px-4 py-2 text-sm font-bold text-brand-500 dark:bg-brand-900/20 dark:text-brand-400">
                        {answeredCount}/{questions.length} Answered
                    </span>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                {/* Left: Candidate Card */}
                <div className="xl:col-span-4 2xl:col-span-3">
                    <CandidateCard />
                </div>

                {/* Right: Questions */}
                <div className="xl:col-span-8 2xl:col-span-9">
                    <div className="space-y-5">
                        {questions.map((q) => (
                            <QuestionItem
                                key={q.id}
                                questionNumber={q.id}
                                category={q.category}
                                question={q.question}
                                answer={answers[q.id] || ""}
                                onAnswerChange={(value) => setAnswer(q.id, value)}
                            />
                        ))}
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-4 text-base font-bold text-white shadow-lg shadow-brand-500/30 transition-all duration-300 hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/40 active:scale-[0.98] dark:bg-brand-400 dark:hover:bg-brand-500"
                    >
                        <MdSend className="h-5 w-5" />
                        Submit Interview
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InterviewView;
