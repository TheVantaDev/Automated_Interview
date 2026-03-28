import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    MdCode,
    MdPsychology,
    MdArchitecture,
    MdGroups,
    MdFavorite,
    MdRefresh,
    MdEmojiEvents,
    MdStarOutline,
    MdVideocam,
    MdWarning,
    MdCheckCircle,
} from "react-icons/md";
import Widget from "components/widget/Widget";
import ScoreCard from "./components/ScoreCard";
import { useInterview } from "contexts/InterviewContext";

const getIconForCategory = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes("tech") || lower.includes("code")) return <MdCode className="h-6 w-6" />;
    if (lower.includes("problem") || lower.includes("logic")) return <MdPsychology className="h-6 w-6" />;
    if (lower.includes("system") || lower.includes("design")) return <MdArchitecture className="h-6 w-6" />;
    if (lower.includes("communication") || lower.includes("team")) return <MdGroups className="h-6 w-6" />;
    if (lower.includes("behavior") || lower.includes("culture")) return <MdFavorite className="h-6 w-6" />;
    return <MdStarOutline className="h-6 w-6" />;
};

const getColorForCategory = (index: number): "blue" | "orange" | "teal" | "green" | "purple" => {
    const colors: ("blue" | "orange" | "teal" | "green" | "purple")[] = ["blue", "orange", "teal", "green", "purple"];
    return colors[index % colors.length];
};

const ResultsView = () => {
    const navigate = useNavigate();
    const { resetInterview, fileName, currentStep, scores: rawScores, cameraAlerts } = useInterview();


    const displayScores = useMemo(() => {
        if (!rawScores || rawScores.length === 0) return [];
        return rawScores.map((s, idx) => ({
            category: s.category || `Question ${idx + 1}`,
            score: s.score || 0,
            maxScore: s.maxScore || 10,
            color: getColorForCategory(idx),
            icon: getIconForCategory(s.category || ""),
            feedback: s.feedback || "No feedback provided."
        }));
    }, [rawScores]);

    const totalScore = displayScores.reduce((sum, s) => sum + s.score, 0);
    const maxTotal = displayScores.reduce((sum, s) => sum + s.maxScore, 0);
    const overallPercentage = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0;

    const handleNewInterview = () => {
        resetInterview();
        navigate("/admin/default");
    };

    // only show results after the interview has been submitted
    if (currentStep !== "results") {
        return (
            <div className="mt-12 text-center">
                <p className="text-lg text-gray-500 dark:text-gray-400">
                    No results available yet. Complete an interview first.
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
                {displayScores.map((s) => (
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
                {displayScores.map((s) => (
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


            {/* ── Proctoring Summary ── */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md dark:border-white/10 dark:bg-navy-800">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/10">
                    <div className="flex items-center gap-2">
                        <MdVideocam className="h-5 w-5 text-brand-500 dark:text-brand-400" />
                        <h3 className="text-base font-bold text-navy-700 dark:text-white">Proctoring Summary</h3>
                    </div>
                    {cameraAlerts && cameraAlerts.length > 0 ? (
                        <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            <MdWarning className="h-4 w-4" />
                            {cameraAlerts.length} Alert{cameraAlerts.length !== 1 ? "s" : ""}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-600 dark:bg-green-900/30 dark:text-green-400">
                            <MdCheckCircle className="h-4 w-4" />
                            Clean Session
                        </span>
                    )}
                </div>
                <div className="px-5 py-4">
                    {!cameraAlerts || cameraAlerts.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            No proctoring alerts were recorded during this interview session. ✓
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {cameraAlerts.map((alert, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-red-500 dark:text-red-400">
                                    <MdWarning className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{alert}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
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
