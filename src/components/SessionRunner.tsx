import { ArrowLeft, Check } from "lucide-react";
import type React from "react";
import { lazy, Suspense, useEffect, useState } from "react";

import type { ExerciseText, FluencyAttempt } from "@/db/db";

import { StepSelection } from "./StepSelection";
import type { StudentProfile } from "./StudentSelector";

const Step1Reading = lazy(async () => {
  const m = await import("./Step1Reading");
  return { default: m.Step1Reading };
});
const Step2Remediation = lazy(async () => {
  const m = await import("./Step2Remediation");
  return { default: m.Step2Remediation };
});
const Step3Challenge = lazy(async () => {
  const m = await import("./Step3Challenge");
  return { default: m.Step3Challenge };
});
const StepSummary = lazy(async () => {
  const m = await import("./StepSummary");
  return { default: m.StepSummary };
});
const StoryGeneratorModal = lazy(async () => {
  const m = await import("./StoryGeneratorModal");
  return { default: m.StoryGeneratorModal };
});

export type SessionStep = "selection" | "step1" | "step2" | "step3" | "summary";

interface SessionRunnerProps {
  currentStudent: StudentProfile;
  dyslexicMode: boolean;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

export const SessionRunner: React.FC<SessionRunnerProps> = ({
  currentStudent,
  onOpenSettings,
  onOpenHistory,
  dyslexicMode,
}) => {
  const [currentStep, setCurrentStep] = useState<SessionStep>("selection");
  const [selectedText, setSelectedText] = useState<ExerciseText | null>(null);
  const [step1Attempt, setStep1Attempt] = useState<FluencyAttempt | null>(null);
  const [step3Attempt, setStep3Attempt] = useState<FluencyAttempt | null>(null);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  useEffect(() => {
    switch (currentStep) {
      default:
        window.scrollTo({ behavior: "instant", top: 0 });
    }
  }, [currentStep]);

  const handleSelectText = (text: ExerciseText) => {
    setSelectedText(text);
    setStep1Attempt(null);
    setStep3Attempt(null);
    setCurrentStep("step1");
  };

  const handleCompleteStep1 = (attempt: FluencyAttempt) => {
    setStep1Attempt(attempt);
    setCurrentStep("step2");
  };

  const handleReadyForStep3 = () => {
    setCurrentStep("step3");
  };

  const handleCompleteStep3 = (attempt: FluencyAttempt) => {
    setStep3Attempt(attempt);
    setCurrentStep("summary");
  };

  const handleResetToSelection = () => {
    setSelectedText(null);
    setStep1Attempt(null);
    setStep3Attempt(null);
    setCurrentStep("selection");
  };

  const handleRestartSameText = () => {
    setStep1Attempt(null);
    setStep3Attempt(null);
    setCurrentStep("step1");
  };

  const canGoStep2 = Boolean(step1Attempt);
  const canGoStep3 = Boolean(step1Attempt);
  const canGoSummary = Boolean(step1Attempt && step3Attempt);

  const getStepButtonClass = (
    step: SessionStep,
    isCompleted: boolean,
    isEnabled: boolean
  ) => {
    if (currentStep === step) {
      return "bg-primary-600 text-white shadow-2xs";
    }
    if (isCompleted) {
      return "border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100/80";
    }
    if (isEnabled) {
      return "text-stone-700 hover:bg-stone-100";
    }
    return "cursor-not-allowed text-stone-500 opacity-60";
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
      {currentStep !== "selection" && selectedText && (
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-paper px-3.5 py-2.5">
          <button
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 font-semibold text-stone-700 text-xs transition-colors hover:bg-cream hover:text-stone-900"
            onClick={handleResetToSelection}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Textes</span>
          </button>

          <nav
            aria-label="Étapes de la séance"
            className="flex flex-wrap items-center gap-1 text-xs"
          >
            <button
              aria-current={currentStep === "step1" ? "step" : undefined}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 font-bold transition-colors ${getStepButtonClass(
                "step1",
                Boolean(step1Attempt),
                true
              )}`}
              onClick={() => setCurrentStep("step1")}
              type="button"
            >
              {step1Attempt && currentStep !== "step1" && (
                <Check aria-hidden="true" className="h-3 w-3" />
              )}
              <span>1. Lecture 1</span>
            </button>

            <span aria-hidden="true" className="text-stone-400">
              ›
            </span>

            <button
              aria-current={currentStep === "step2" ? "step" : undefined}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 font-bold transition-colors ${getStepButtonClass(
                "step2",
                currentStep === "step3" || currentStep === "summary",
                canGoStep2
              )}`}
              disabled={!canGoStep2}
              onClick={() => setCurrentStep("step2")}
              type="button"
            >
              {(currentStep === "step3" || currentStep === "summary") && (
                <Check aria-hidden="true" className="h-3 w-3" />
              )}
              <span>2. Entraînement</span>
            </button>

            <span aria-hidden="true" className="text-stone-400">
              ›
            </span>

            <button
              aria-current={currentStep === "step3" ? "step" : undefined}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 font-bold transition-colors ${getStepButtonClass(
                "step3",
                Boolean(step3Attempt),
                canGoStep3
              )}`}
              disabled={!canGoStep3}
              onClick={() => setCurrentStep("step3")}
              type="button"
            >
              {step3Attempt && currentStep !== "step3" && (
                <Check aria-hidden="true" className="h-3 w-3" />
              )}
              <span>3. Défi 60s</span>
            </button>

            <span aria-hidden="true" className="text-stone-400">
              ›
            </span>

            <button
              aria-current={currentStep === "summary" ? "step" : undefined}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 font-bold transition-colors ${getStepButtonClass(
                "summary",
                false,
                canGoSummary
              )}`}
              disabled={!canGoSummary}
              onClick={() => setCurrentStep("summary")}
              type="button"
            >
              <span>4. Bilan</span>
            </button>
          </nav>

          <div className="hidden font-semibold text-stone-600 text-xs md:block">
            {selectedText.title} ({selectedText.level})
          </div>
        </div>
      )}

      {currentStep === "selection" && (
        <StepSelection
          onOpenGenerator={() => setIsGeneratorOpen(true)}
          onSelectText={handleSelectText}
          studentLevel={currentStudent.level}
          studentName={currentStudent.name}
        />
      )}

      <Suspense fallback={null}>
        {currentStep === "step1" && selectedText && (
          <Step1Reading
            dyslexicMode={dyslexicMode}
            onCompleteStep1={handleCompleteStep1}
            onOpenSettings={onOpenSettings}
            studentName={currentStudent.name}
            text={selectedText}
          />
        )}

        {currentStep === "step2" && selectedText && step1Attempt && (
          <Step2Remediation
            attempt1={step1Attempt}
            dyslexicMode={dyslexicMode}
            onReadyForStep3={handleReadyForStep3}
            text={selectedText}
          />
        )}

        {currentStep === "step3" && selectedText && step1Attempt && (
          <Step3Challenge
            attempt1={step1Attempt}
            dyslexicMode={dyslexicMode}
            onCompleteStep3={handleCompleteStep3}
            onOpenSettings={onOpenSettings}
            studentName={currentStudent.name}
            text={selectedText}
          />
        )}

        {currentStep === "summary" &&
          selectedText &&
          step1Attempt &&
          step3Attempt && (
            <StepSummary
              onNewSession={handleResetToSelection}
              onOpenHistory={onOpenHistory}
              onRestartSameText={handleRestartSameText}
              step1={step1Attempt}
              step3={step3Attempt}
              studentName={currentStudent.name}
              text={selectedText}
            />
          )}

        {isGeneratorOpen && (
          <StoryGeneratorModal
            defaultLevel={currentStudent.level}
            isOpen={isGeneratorOpen}
            onClose={() => setIsGeneratorOpen(false)}
            onOpenSettings={onOpenSettings}
            onStoryCreated={handleSelectText}
            studentName={currentStudent.name}
          />
        )}
      </Suspense>
    </div>
  );
};
