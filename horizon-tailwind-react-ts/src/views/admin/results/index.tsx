import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    MdCode,
    MdPsychology,
    MdArchitecture,
    MdGroups,
    MdFavorite,
    MdRefresh,
    MdEmojiEvents,
    MdVideocam,
    MdWarning,
    MdCheckCircle,
} from "react-icons/md";
import Widget from "components/widget/Widget";
import ScoreCard from "./components/ScoreCard";
import { useInterview } from "contexts/InterviewContext";

const API_BASE_URL = "http://localhost:8000";

const categoryIconMap: Record<string, JSX.Element> = {
    "Technical Skills": <MdCode className="h-6 w-6" />,
    "Problem Solving":  <MdPsychology className="h-6 w-6" />,
    "System Design":    <MdArchitecture className="h-6 w-6" />,
    "Communication":    <MdGroups className="h-6 w-6" />,
    "Cultural Fit":     <MdFavorite className="h-6 w-6" />,
};

const categoryColorMap: Record<string, "blue" | "orange" | "teal" | "green" | "purple"> = {
    "Technical Skills": "blue",
    "Problem Solving":  "orange",
    "System Design":    "teal",
    "Communication":    "green",
    "Cultural Fit":     "purple",
};

const ResultsView = () => {
    const navigate = useNavigate();
    const {
        resetInterview,
        fileName,
        currentStep,
        questions,
        answers,
        results,
        setResults,
        isScoring,
        setIsScoring,
        cameraAlerts,
    } = useInterview();

    const [error, setError] = useState<string | null>(null);

    // Fetch overall assessment from backend when we arrive at results page
    useEffect(() => {
        const fetchResults = async () => {
            if (currentStep === "results" && results.length === 0 && !isScoring) {
                setIsScoring(true);
                setError(null);
                try {
                    const interview_data = questions.map((q) => ({
                        question: q.question,
                        answer:   answers[q.id] || "No answer provided.",
                        category: q.category,
                    }));

                    const response = await fetch(`${API_BASE_URL}/api/generate-results`, {
                        method:  "POST",
                        headers: { "Content-Type": "application/json" },
                        body:    JSON.stringify({ interview_data }),
                    });

                    if (!response.ok) throw new Error("Failed to generate assessment. Please try again.");

                    const data = await response.json();
                    setResults(data.results);
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setIsScoring(false);
                }
            }
        };
        fetchResults();
    }, [currentStep, questions, answers, results.length, isScoring, setIsScoring, setResults]);

    const totalScore       = results.reduce((sum, s) => sum + s.score, 0);
    const maxTotal         = results.reduce((sum, s) => sum + s.maxScore, 0);
    const overallPercentage = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0;

    const handleNewInterview = () => {
        resetInterview();
        navigate("/admin/default");
    };

    // ── Guards ────────────────────────────────────────────────────────────────
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

    if (isScoring) {
        return (
            <div className="mt-20 flex flex-col items-center justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-brand-500" />
                <h2 className="mt-6 text-2xl font-bold text-navy-700 dark:text-white">
                    Analyzing Your Interview…
                </h2>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                    Our AI is evaluating your responses across 5 categories.
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-12 text-center">
                <p className="text-lg text-red-500">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 rounded-xl bg-brand-500 px-6 py-3 font-bold text-white hover:bg-brand-600"
                >
                    Retry Assessment
                </button>
            </div>
        );
    }

    // ── Main results view ─────────────────────────────────────────────────────
    return (
        <div className="mt-3">
            {/* Overall Score Header */}
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-brand-400 to-brand-600 p-8 shadow-xl shadow-brand-500/25 dark:from-brand-500 dark:to-brand-700">
                <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                    <div className="text-center md:text-left">
                        <p className="text-sm font-medium text-white/80">Interview Complete</p>
                        <h2 className="mt-1 text-3xl font-bold text-white">Overall Assessment</h2>
                        {fileName && (
                            <p className="mt-2 text-sm text-white/70">Resume: {fileName}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/30 bg-white/10 backdrop-blur-sm">
                                <span className="text-3xl font-bold text-white">{overallPercentage}%</span>
                            </div>
                            <p className="mt-2 text-sm font-medium text-white/80">
                                {totalScore.toFixed(1)}/{maxTotal} Points
                            </p>
                        </div>
                        <div className="hidden h-16 w-px bg-white/20 md:block" />
                        <div className="hidden flex-col items-center md:flex">
                            <MdEmojiEvents className="h-10 w-10 text-yellow-300" />
                            <p className="mt-1 text-sm font-bold text-white">
                                {overallPercentage >= 80 ? "Strong Hire" : overallPercentage >= 60 ? "Potential Hire" : "Needs Review"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Widgets */}
            <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {results.map((s) => (
                    <Widget
                        key={s.category}
                        icon={categoryIconMap[s.category] || <MdCode className="h-6 w-6" />}
                        title={s.category}
                        subtitle={`${s.score}/${s.maxScore}`}
                    />
                ))}
            </div>

            {/* Detailed Score Cards */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {results.map((s) => (
                    <ScoreCard
                        key={s.category}
                        category={s.category}
                        score={s.score}
                        maxScore={s.maxScore}
                        feedback={s.feedback}
                        color={categoryColorMap[s.category] || "blue"}
                        icon={categoryIconMap[s.category] || <MdCode className="h-6 w-6" />}
                    />
                ))}
            </div>

            {/* Proctoring Summary */}
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
                            {cameraAlerts.map((alert: string, i: number) => (
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
