import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MdSend } from "react-icons/md";
import CandidateCard from "./components/CandidateCard";
import QuestionItem from "./components/QuestionItem";
import CameraFeed from "./components/CameraFeed";
import { useInterview } from "contexts/InterviewContext";

const InterviewView = () => {
    const navigate = useNavigate();
    const { answers, setAnswer, submitInterview, fileName, questions, isScoring, currentStep } =
        useInterview();

    // Once context marks step as "results" (after scoring finishes), navigate
    useEffect(() => {
        if (currentStep === "results") {
            navigate("/admin/results");
        }
    }, [currentStep, navigate]);

    const answeredCount = Object.values(answers).filter(
        (a) => a.trim().length > 0
    ).length;

    const handleSubmit = async () => {
        await submitInterview();
        // navigation is handled by the useEffect above
    };

    // edge case: user navigated here directly without uploading
    if (questions.length === 0) {
        return (
            <div className="mt-12 text-center">
                <p className="text-lg text-gray-500 dark:text-gray-400">
                    No questions loaded. Please upload a resume first.
                </p>
                <button
                    onClick={() => navigate("/admin/default")}
                    className="mt-4 rounded-xl bg-brand-500 px-6 py-3 font-bold text-white hover:bg-brand-600"
                >
                    Go to Upload
                </button>
            </div>
        );
    }

    return (
        <div className="relative mt-3">
            {/* ── Scoring overlay (shown while evaluating answers) ── */}
            {isScoring && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-navy-900/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-10 shadow-2xl dark:bg-navy-800">
                        {/* Spinning ring */}
                        <svg className="h-16 w-16 animate-spin text-brand-500" viewBox="0 0 50 50" fill="none">
                            <circle cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="4" strokeOpacity="0.2" />
                            <path d="M25 5 A20 20 0 0 1 45 25" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                        <h3 className="text-xl font-bold text-navy-700 dark:text-white">Evaluating Your Answers</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            AI is scoring {questions.length} responses… this may take a minute.
                        </p>
                        <div className="mt-2 flex gap-1">
                            {questions.map((_, i) => (
                                <div
                                    key={i}
                                    className="h-2 w-2 rounded-full bg-brand-300 animate-bounce dark:bg-brand-500"
                                    style={{ animationDelay: `${i * 0.1}s` }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

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
                {/* Left: Candidate Card + Camera */}
                <div className="xl:col-span-4 2xl:col-span-3">
                    <CandidateCard />
                    <CameraFeed />
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
                        disabled={isScoring}
                        className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-bold text-white shadow-lg transition-all duration-300 ${
                            isScoring
                                ? "cursor-not-allowed bg-gray-400 dark:bg-gray-600"
                                : "bg-brand-500 shadow-brand-500/30 hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/40 active:scale-[0.98] dark:bg-brand-400 dark:hover:bg-brand-500"
                        }`}
                    >
                        {isScoring ? (
                            <>
                                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
                                    <path d="M12 2 A10 10 0 0 1 22 12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                </svg>
                                Evaluating…
                            </>
                        ) : (
                            <>
                                <MdSend className="h-5 w-5" />
                                Submit Interview
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InterviewView;
