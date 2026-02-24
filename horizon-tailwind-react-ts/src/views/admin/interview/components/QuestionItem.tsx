import React from "react";
import { MdMic } from "react-icons/md";
import Card from "components/card";

interface QuestionItemProps {
    questionNumber: number;
    category: string;
    question: string;
    answer: string;
    onAnswerChange: (answer: string) => void;
}

const categoryColors: Record<string, string> = {
    Technical:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    Behavioral:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    "Problem Solving":
        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    "System Design":
        "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    Cultural:
        "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

const QuestionItem: React.FC<QuestionItemProps> = ({
    questionNumber,
    category,
    question,
    answer,
    onAnswerChange,
}) => {
    return (
        <Card extra="p-6 transition-all duration-200 hover:shadow-lg">
            {/* Question Header */}
            <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white dark:bg-brand-400">
                        {questionNumber}
                    </span>
                    <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${categoryColors[category] || categoryColors["Technical"]
                            }`}
                    >
                        {category}
                    </span>
                </div>
                <button
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-lightPrimary text-gray-500 transition-all hover:bg-brand-50 hover:text-brand-500 dark:bg-navy-700 dark:text-gray-300 dark:hover:bg-brand-900/20 dark:hover:text-brand-400"
                    title="Voice input (coming soon)"
                >
                    <MdMic className="h-5 w-5" />
                </button>
            </div>

            {/* Question Text */}
            <p className="mb-4 text-base font-medium leading-relaxed text-navy-700 dark:text-white">
                {question}
            </p>

            {/* Answer Area */}
            <textarea
                value={answer}
                onChange={(e) => onAnswerChange(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                placeholder="Type your answer here... (paste is disabled)"
                rows={4}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white/0 p-4 text-sm text-navy-700 outline-none transition-all placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
            />
        </Card>
    );
};

export default QuestionItem;
