import React from "react";

// Admin Imports
import MainDashboard from "views/admin/default";
import InterviewView from "views/admin/interview";
import ResultsView from "views/admin/results";

// Icon Imports
import {
  MdUploadFile,
  MdQuestionAnswer,
  MdAssessment,
} from "react-icons/md";

const routes = [
  {
    name: "Upload Resume",
    layout: "/admin",
    path: "default",
    icon: <MdUploadFile className="h-6 w-6" />,
    component: <MainDashboard />,
  },
  {
    name: "Interview",
    layout: "/admin",
    path: "interview",
    icon: <MdQuestionAnswer className="h-6 w-6" />,
    component: <InterviewView />,
  },
  {
    name: "Results",
    layout: "/admin",
    path: "results",
    icon: <MdAssessment className="h-6 w-6" />,
    component: <ResultsView />,
  },
];
export default routes;
