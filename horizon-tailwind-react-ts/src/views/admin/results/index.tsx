import React from "react";
import { useNavigate } from "react-router-dom";
import {
    MdCode,
    MdPsychology,
    MdArchitecture,
    MdGroups,
    MdFavorite,
    MdRefresh,
    MdEmojiEvents,
} from "react-icons/md";
import Widget from "components/widget/Widget";
import ScoreCard from "./components/ScoreCard";
import { useInterview } from "contexts/InterviewContext";

const scores = [
    {
        category: "Technical Skills",
        score: 8,
        maxScore: 10,
        color: "blue" as const,
        icon: <MdCode className="h-6 w-6" />,
        feedback:
            "Strong understanding of React hooks and component architecture. Could improve on explaining performance optimization strategies.",
    },
    {
        category: "Problem Solving",
        score: 7,
        maxScore: 10,
        color: "orange" as const,
        icon: <MdPsychology className="h-6 w-6" />,
        feedback:
            "Good analytical approach with clear problem breakdown. Consider exploring edge cases more thoroughly in responses.",
    },
    {
        category: "System Design",
        score: 6,
        maxScore: 10,
        color: "teal" as const,
        icon: <MdArchitecture className="h-6 w-6" />,
        feedback:
            "Adequate high-level thinking. Would benefit from deeper discussion of scalability patterns and trade-offs.",
    },
    {
        category: "Communication",
        score: 9,
        maxScore: 10,
        color: "green" as const,
        icon: <MdGroups className="h-6 w-6" />,
        feedback:
            "Excellent articulation of ideas. Responses are clear, well-structured, and demonstrate strong interpersonal awareness.",
    },
    {
        category: "Cultural Fit",
        score: 8,
        maxScore: 10,
        color: "purple" as const,
        icon: <MdFavorite className="h-6 w-6" />,
        feedback:
            "Values align well with collaborative team environments. Shows growth mindset and openness to feedback.",
    },
];

const ResultsView = () => {
    const navigate = useNavigate();
    const { resetInterview, fileName } = useInterview();

    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    const maxTotal = scores.reduce((sum, s) => sum + s.maxScore, 0);
    const overallPercentage = Math.round((totalScore / maxTotal) * 100);

    const handleNewInterview = () => {
        resetInterview();
        navigate("/admin/default");
    };

    return (
        <div className="mt-3">
            {/* Overall Score Header */}
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-brand-400 to-brand-600 p-8 shadow-xl shadow-brand-500/25 dark:from-brand-500 dark:to-brand-700">
                <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                    <div className="text-center md:text-left">
                        <p className="text-sm font-medium text-white/80">
                            Interview Complete
                        </p>
                        <h2 className="mt-1 text-3xl font-bold text-white">
                            Overall Assessment
                        </h2>
                        {fileName && (
                            <p className="mt-2 text-sm text-white/70">
                                Resume: {fileName}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/30 bg-white/10 backdrop-blur-sm">
                                <span className="text-3xl font-bold text-white">
                                    {overallPercentage}%
                                </span>
                            </div>
                            <p className="mt-2 text-sm font-medium text-white/80">
                                {totalScore}/{maxTotal} Points
                            </p>
                        </div>
                        <div className="hidden h-16 w-px bg-white/20 md:block" />
                        <div className="hidden flex-col items-center md:flex">
                            <MdEmojiEvents className="h-10 w-10 text-yellow-300" />
                            <p className="mt-1 text-sm font-bold text-white">
                                {overallPercentage >= 80
                                    ? "Strong Hire"
                                    : overallPercentage >= 60
                                        ? "Potential Hire"
                                        : "Needs Review"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Widgets */}
            <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {scores.map((s) => (
                    <Widget
                        key={s.category}
                        icon={s.icon}
                        title={s.category}
                        subtitle={`${s.score}/${s.maxScore}`}
                    />
                ))}
            </div>

            {/* Detailed Score Cards */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {scores.map((s) => (
                    <ScoreCard
                        key={s.category}
                        category={s.category}
                        score={s.score}
                        maxScore={s.maxScore}
                        feedback={s.feedback}
                        color={s.color}
                        icon={s.icon}
                    />
                ))}
            </div>

            {/* New Interview Button */}
            <button
                onClick={handleNewInterview}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-4 text-base font-bold text-white shadow-lg shadow-brand-500/30 transition-all duration-300 hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/40 active:scale-[0.98] dark:bg-brand-400 dark:hover:bg-brand-500"
            >
                <MdRefresh className="h-5 w-5" />
                Start New Interview
            </button>
        </div>
    );
};

export default ResultsView;
