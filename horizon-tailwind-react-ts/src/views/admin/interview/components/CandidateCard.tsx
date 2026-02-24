import Card from "components/card";
import { MdPerson, MdWork, MdStar, MdCode, MdSchool } from "react-icons/md";

const CandidateCard = () => {
    const skills = ["React", "TypeScript", "Node.js", "Python", "AWS"];

    return (
        <Card extra="p-6 h-fit sticky top-24">
            {/* Avatar & Name */}
            <div className="flex flex-col items-center border-b border-gray-200 pb-6 dark:border-white/10">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg shadow-brand-500/25">
                    <MdPerson className="h-10 w-10 text-white" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-navy-700 dark:text-white">
                    Candidate Profile
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    AI-Generated Summary
                </p>
            </div>

            {/* Details */}
            <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lightPrimary dark:bg-navy-700">
                        <MdWork className="h-5 w-5 text-brand-500 dark:text-brand-400" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Target Role
                        </p>
                        <p className="text-sm font-bold text-navy-700 dark:text-white">
                            Frontend Developer
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lightPrimary dark:bg-navy-700">
                        <MdSchool className="h-5 w-5 text-brand-500 dark:text-brand-400" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Experience Level
                        </p>
                        <p className="text-sm font-bold text-navy-700 dark:text-white">
                            Mid-Senior (3-5 yrs)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lightPrimary dark:bg-navy-700">
                        <MdStar className="h-5 w-5 text-brand-500 dark:text-brand-400" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Confidence
                        </p>
                        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            ● High Match
                        </span>
                    </div>
                </div>
            </div>

            {/* Skills */}
            <div className="mt-6 border-t border-gray-200 pt-6 dark:border-white/10">
                <div className="mb-3 flex items-center gap-2">
                    <MdCode className="h-5 w-5 text-brand-500 dark:text-brand-400" />
                    <p className="text-sm font-bold text-navy-700 dark:text-white">
                        Key Skills
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                        <span
                            key={skill}
                            className="rounded-full bg-lightPrimary px-3 py-1.5 text-xs font-semibold text-brand-500 dark:bg-navy-700 dark:text-brand-400"
                        >
                            {skill}
                        </span>
                    ))}
                </div>
            </div>
        </Card>
    );
};

export default CandidateCard;
