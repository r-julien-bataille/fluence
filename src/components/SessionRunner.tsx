import { ArrowLeft, CheckCircle2, Clock, Sparkles, Trophy } from "lucide-react";
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

  // Remonter en haut de page à chaque changement d'étape
  useEffect(() => {
    switch (currentStep) {
      default:
        window.scrollTo({ behavior: "instant", top: 0 });
    }
  }, [currentStep]);

  // Lancement d'une séance avec un texte sélectionné
  const handleSelectText = (text: ExerciseText) => {
    setSelectedText(text);
    setStep1Attempt(null);
    setStep3Attempt(null);
    setCurrentStep("step1");
  };

  // Fin de l'étape 1 (Première lecture 60s)
  const handleCompleteStep1 = (attempt: FluencyAttempt) => {
    setStep1Attempt(attempt);
    setCurrentStep("step2");
  };

  // Prêt pour l'étape 3 après la remédiation
  const handleReadyForStep3 = () => {
    setCurrentStep("step3");
  };

  // Fin de l'étape 3 (Défi record 60s)
  const handleCompleteStep3 = (attempt: FluencyAttempt) => {
    setStep3Attempt(attempt);
    setCurrentStep("summary");
  };

  // Réinitialiser vers le choix de texte
  const handleResetToSelection = () => {
    setSelectedText(null);
    setStep1Attempt(null);
    setStep3Attempt(null);
    setCurrentStep("selection");
  };

  // Recommencer le même texte
  const handleRestartSameText = () => {
    setStep1Attempt(null);
    setStep3Attempt(null);
    setCurrentStep("step1");
  };

  let step1Class = "text-slate-400";
  if (currentStep === "step1") {
    step1Class = "bg-indigo-600 text-white shadow-xs";
  } else if (step1Attempt) {
    step1Class = "bg-emerald-50 text-emerald-800";
  }

  let step2Class = "text-slate-400";
  if (currentStep === "step2") {
    step2Class = "bg-indigo-600 text-white shadow-xs";
  } else if (currentStep === "step3" || currentStep === "summary") {
    step2Class = "bg-emerald-50 text-emerald-800";
  }

  let step3Class = "text-slate-400";
  if (currentStep === "step3") {
    step3Class = "bg-indigo-600 text-white shadow-xs";
  } else if (step3Attempt) {
    step3Class = "bg-emerald-50 text-emerald-800";
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Barre de navigation d'étape si une séance est en cours */}
      {currentStep !== "selection" && selectedText && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <button
              className="inline-flex items-center gap-1.5 font-semibold text-slate-500 text-xs transition-colors hover:text-slate-800 sm:text-sm"
              onClick={handleResetToSelection}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Changer d’histoire</span>
            </button>

            <div className="font-bold text-slate-500 text-xs">
              Texte :{" "}
              <span className="font-extrabold text-indigo-600">
                {selectedText.title}
              </span>{" "}
              ({selectedText.level})
            </div>
          </div>

          {/* Stepper de progression */}
          <div className="grid grid-cols-4 gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 text-center text-xs shadow-2xs">
            <div
              className={`flex items-center justify-center gap-1.5 rounded-xl p-2 font-bold transition-all ${step1Class}`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">1.</span>{" "}
              <span>Lecture 60s</span>
            </div>

            <div
              className={`flex items-center justify-center gap-1.5 rounded-xl p-2 font-bold transition-all ${step2Class}`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">2.</span>{" "}
              <span>Remédiation</span>
            </div>

            <div
              className={`flex items-center justify-center gap-1.5 rounded-xl p-2 font-bold transition-all ${step3Class}`}
            >
              <Trophy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">3.</span>{" "}
              <span>Défi Record</span>
            </div>

            <div
              className={`flex items-center justify-center gap-1.5 rounded-xl p-2 font-bold transition-all ${
                currentStep === "summary"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">4.</span>{" "}
              <span>Bilan & Victoire</span>
            </div>
          </div>
        </div>
      )}

      {/* Vue 1 : Choix du texte & Génération */}
      {currentStep === "selection" && (
        <StepSelection
          onOpenGenerator={() => setIsGeneratorOpen(true)}
          onSelectText={handleSelectText}
          studentLevel={currentStudent.level}
          studentName={currentStudent.name}
        />
      )}

      <Suspense fallback={null}>
        {/* Vue 2 : Étape 1 - Première lecture chronométrée (60 secondes) */}
        {currentStep === "step1" && selectedText && (
          <Step1Reading
            dyslexicMode={dyslexicMode}
            onCompleteStep1={handleCompleteStep1}
            onOpenSettings={onOpenSettings}
            studentName={currentStudent.name}
            text={selectedText}
          />
        )}

        {/* Vue 3 : Étape 2 - Remédiation & Répétition (Sans chronomètre) */}
        {currentStep === "step2" && selectedText && step1Attempt && (
          <Step2Remediation
            attempt1={step1Attempt}
            dyslexicMode={dyslexicMode}
            onReadyForStep3={handleReadyForStep3}
            text={selectedText}
          />
        )}

        {/* Vue 4 : Étape 3 - Défi Record (60 secondes) */}
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

        {/* Vue 5 : Écran Bilan & Victoire */}
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

        {/* Modal Générateur d'histoires sur mesure */}
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
