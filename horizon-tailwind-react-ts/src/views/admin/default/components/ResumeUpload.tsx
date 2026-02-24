import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MdCloudUpload, MdInsertDriveFile, MdClose } from "react-icons/md";
import Card from "components/card";
import { useInterview } from "contexts/InterviewContext";

const ResumeUpload = () => {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const { setFile, goToInterview } = useInterview();

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const validateFile = (file: File): boolean => {
        if (file.type !== "application/pdf") {
            setError("Only PDF files are accepted. Please upload a .pdf file.");
            return false;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError("File size exceeds 10MB limit.");
            return false;
        }
        setError(null);
        return true;
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && validateFile(file)) {
            setSelectedFile(file);
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && validateFile(file)) {
            setSelectedFile(file);
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleAnalyze = async () => {
        if (!selectedFile) return;
        setIsAnalyzing(true);
        setFile(selectedFile.name);

        // Simulate analysis delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        goToInterview();
        setIsAnalyzing(false);
        navigate("/admin/interview");
    };

    return (
        <div className="mt-8 flex items-center justify-center">
            <Card extra="w-full max-w-2xl p-8">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h2 className="text-2xl font-bold text-navy-700 dark:text-white">
                        Upload Resume
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Upload a candidate's resume to begin the AI-powered interview
                        process
                    </p>
                </div>

                {/* Drop Zone */}
                <div
                    className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300 ${isDragging
                            ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/20"
                            : selectedFile
                                ? "border-green-400 bg-green-50 dark:border-green-500 dark:bg-green-900/10"
                                : "border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50/50 dark:border-gray-600 dark:bg-navy-700 dark:hover:border-brand-400 dark:hover:bg-brand-900/10"
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !selectedFile && fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    {selectedFile ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                <MdInsertDriveFile className="h-8 w-8 text-green-500" />
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-navy-700 dark:text-white">
                                    {selectedFile.name}
                                </p>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {(selectedFile.size / 1024).toFixed(1)} KB • PDF Document
                                </p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveFile();
                                }}
                                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <MdClose className="h-4 w-4" />
                                Remove
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div
                                className={`flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 ${isDragging
                                        ? "scale-110 bg-brand-100 dark:bg-brand-900/30"
                                        : "bg-gray-100 dark:bg-navy-600"
                                    }`}
                            >
                                <MdCloudUpload
                                    className={`h-10 w-10 transition-colors ${isDragging
                                            ? "text-brand-500 dark:text-brand-400"
                                            : "text-gray-400 dark:text-gray-300"
                                        }`}
                                />
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-navy-700 dark:text-white">
                                    Drag & Drop your resume here
                                </p>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    or{" "}
                                    <span className="font-medium text-brand-500 dark:text-brand-400">
                                        browse files
                                    </span>{" "}
                                    from your computer
                                </p>
                            </div>
                            <span className="rounded-full bg-gray-100 px-4 py-1.5 text-xs font-medium text-gray-500 dark:bg-navy-600 dark:text-gray-400">
                                Supported format: PDF (Max 10MB)
                            </span>
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-500 dark:bg-red-900/20 dark:text-red-400">
                        {error}
                    </div>
                )}

                {/* Analyze Button */}
                <button
                    onClick={handleAnalyze}
                    disabled={!selectedFile || isAnalyzing}
                    className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-bold text-white transition-all duration-300 ${selectedFile && !isAnalyzing
                            ? "bg-brand-500 shadow-lg shadow-brand-500/30 hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/40 active:scale-[0.98] dark:bg-brand-400 dark:hover:bg-brand-500"
                            : "cursor-not-allowed bg-gray-300 dark:bg-gray-600"
                        }`}
                >
                    {isAnalyzing ? (
                        <>
                            <svg
                                className="h-5 w-5 animate-spin"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                            </svg>
                            Analyzing Resume...
                        </>
                    ) : (
                        "Analyze Resume"
                    )}
                </button>
            </Card>
        </div>
    );
};

export default ResumeUpload;
