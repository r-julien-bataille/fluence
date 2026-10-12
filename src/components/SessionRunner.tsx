import React, { useState, useEffect } from 'react';
import { ExerciseText, FluencyAttempt } from '@/db/db';
import { StudentProfile } from './StudentSelector';
import { StepSelection } from './StepSelection';
import { Step1Reading } from './Step1Reading';
import { Step2Remediation } from './Step2Remediation';
import { Step3Challenge } from './Step3Challenge';
import { StepSummary } from './StepSummary';
import { StoryGeneratorModal } from './StoryGeneratorModal';
import { AlignmentResult } from '@/lib/alignment';
import { ArrowLeft, Clock, Sparkles, Trophy, CheckCircle2 } from 'lucide-react';

export type SessionStep = 'selection' | 'step1' | 'step2' | 'step3' | 'summary';

interface SessionRunnerProps {
  currentStudent: StudentProfile;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  dyslexicMode: boolean;
}

export const SessionRunner: React.FC<SessionRunnerProps> = ({
  currentStudent,
  onOpenSettings,
  onOpenHistory,
  dyslexicMode,
}) => {
  const [currentStep, setCurrentStep] = useState<SessionStep>('selection');
  const [selectedText, setSelectedText] = useState<ExerciseText | null>(null);
  const [step1Attempt, setStep1Attempt] = useState<FluencyAttempt | null>(null);
  const [step3Attempt, setStep3Attempt] = useState<FluencyAttempt | null>(null);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  // Remonter en haut de page à chaque changement d'étape
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentStep]);

  // Lancement d'une séance avec un texte sélectionné
  const handleSelectText = (text: ExerciseText) => {
    setSelectedText(text);
    setStep1Attempt(null);
    setStep3Attempt(null);
    setCurrentStep('step1');
  };

  // Fin de l'étape 1 (Première lecture 60s)
  const handleCompleteStep1 = (attempt: FluencyAttempt) => {
    setStep1Attempt(attempt);
    setCurrentStep('step2');
  };

  // Prêt pour l'étape 3 après la remédiation
  const handleReadyForStep3 = () => {
    setCurrentStep('step3');
  };

  // Fin de l'étape 3 (Défi record 60s)
  const handleCompleteStep3 = (attempt: FluencyAttempt) => {
    setStep3Attempt(attempt);
    setCurrentStep('summary');
  };

  // Réinitialiser vers le choix de texte
  const handleResetToSelection = () => {
    setSelectedText(null);
    setStep1Attempt(null);
    setStep3Attempt(null);
    setCurrentStep('selection');
  };

  // Recommencer le même texte
  const handleRestartSameText = () => {
    setStep1Attempt(null);
    setStep3Attempt(null);
    setCurrentStep('step1');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Barre de navigation d'étape si une séance est en cours */}
      {currentStep !== 'selection' && selectedText && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleResetToSelection}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Changer d'histoire</span>
            </button>

            <div className="text-xs font-bold text-slate-500">
              Texte : <span className="text-indigo-600 font-extrabold">{selectedText.title}</span> ({selectedText.level})
            </div>
          </div>

          {/* Stepper de progression */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs grid grid-cols-4 gap-2 text-center text-xs">
            <div
              className={`p-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                currentStep === 'step1'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : step1Attempt
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-400'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">1.</span> <span>Lecture 60s</span>
            </div>

            <div
              className={`p-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                currentStep === 'step2'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : currentStep === 'step3' || currentStep === 'summary'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-400'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">2.</span> <span>Remédiation</span>
            </div>

            <div
              className={`p-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                currentStep === 'step3'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : step3Attempt
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-400'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">3.</span> <span>Défi Record</span>
            </div>

            <div
              className={`p-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                currentStep === 'summary'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">4.</span> <span>Bilan & Victoire</span>
            </div>
          </div>
        </div>
      )}

      {/* Vue 1 : Choix du texte & Génération */}
      {currentStep === 'selection' && (
        <StepSelection
          studentName={currentStudent.name}
          studentLevel={currentStudent.level}
          onSelectText={handleSelectText}
          onOpenGenerator={() => setIsGeneratorOpen(true)}
        />
      )}

      {/* Vue 2 : Étape 1 - Première lecture chronométrée (60 secondes) */}
      {currentStep === 'step1' && selectedText && (
        <Step1Reading
          text={selectedText}
          studentName={currentStudent.name}
          onCompleteStep1={handleCompleteStep1}
          onOpenSettings={onOpenSettings}
          dyslexicMode={dyslexicMode}
        />
      )}

      {/* Vue 3 : Étape 2 - Remédiation & Répétition (Sans chronomètre) */}
      {currentStep === 'step2' && selectedText && step1Attempt && (
        <Step2Remediation
          text={selectedText}
          attempt1={step1Attempt}
          onReadyForStep3={handleReadyForStep3}
          dyslexicMode={dyslexicMode}
        />
      )}

      {/* Vue 4 : Étape 3 - Défi Record (60 secondes) */}
      {currentStep === 'step3' && selectedText && step1Attempt && (
        <Step3Challenge
          text={selectedText}
          attempt1={step1Attempt}
          studentName={currentStudent.name}
          onCompleteStep3={handleCompleteStep3}
          onOpenSettings={onOpenSettings}
          dyslexicMode={dyslexicMode}
        />
      )}

      {/* Vue 5 : Écran Bilan & Victoire */}
      {currentStep === 'summary' && selectedText && step1Attempt && step3Attempt && (
        <StepSummary
          text={selectedText}
          studentName={currentStudent.name}
          step1={step1Attempt}
          step3={step3Attempt}
          onNewSession={handleResetToSelection}
          onRestartSameText={handleRestartSameText}
          onOpenHistory={onOpenHistory}
        />
      )}

      {/* Modal Générateur d'histoires sur mesure */}
      <StoryGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onStoryCreated={handleSelectText}
        defaultLevel={currentStudent.level}
        studentName={currentStudent.name}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
};
