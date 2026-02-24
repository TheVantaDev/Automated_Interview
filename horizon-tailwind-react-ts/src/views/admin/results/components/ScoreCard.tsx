import React from "react";
import Card from "components/card";
import Progress from "components/progress";

interface ScoreCardProps {
    category: string;
    score: number;
    maxScore: number;
    feedback: string;
    color?:
    | "red"
    | "blue"
    | "green"
    | "yellow"
    | "orange"
    | "teal"
    | "navy"
    | "lime"
    | "cyan"
    | "pink"
    | "purple"
    | "amber"
    | "indigo"
    | "gray";
    icon: JSX.Element;
}

const ScoreCard: React.FC<ScoreCardProps> = ({
    category,
    score,
    maxScore,
    feedback,
    color,
    icon,
}) => {
    const percentage = (score / maxScore) * 100;
    const scoreColor =
        percentage >= 80 ? "text-green-500" : percentage >= 60 ? "text-yellow-500" : "text-red-500";

    return (
        <Card extra="p-6 transition-all duration-200 hover:shadow-lg">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lightPrimary dark:bg-navy-700">
                        <span className="text-brand-500 dark:text-brand-400">{icon}</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {category}
                        </p>
                        <p className={`text-2xl font-bold ${scoreColor}`}>
                            {score}
                            <span className="text-sm font-medium text-gray-400">
                                /{maxScore}
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            <Progress value={percentage} color={color} />

            <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {feedback}
            </p>
        </Card>
    );
};

export default ScoreCard;
