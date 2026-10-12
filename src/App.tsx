import { useState, useEffect, lazy, Suspense } from 'react';
import { seedDatabaseIfEmpty } from './db/seeds';
import { Header } from './components/Header';
import { SessionRunner } from './components/SessionRunner';
import { StudentProfile } from './components/StudentSelector';
import { hasStoredApiKey } from './lib/gemini/client';
import { Key, X } from 'lucide-react';

const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);
const HistoryDrawer = lazy(() =>
  import('./components/HistoryDrawer').then((m) => ({ default: m.HistoryDrawer }))
);

const DEFAULT_STUDENTS: StudentProfile[] = [
  { name: 'Hugo', level: 'CM2' },
  { name: 'Léa', level: 'CE2' },
  { name: 'Thomas', level: 'CM1' },
  { name: 'Manon', level: 'CE1' },
];

export function App() {
  const [students, setStudents] = useState<StudentProfile[]>(() => {
    const saved = localStorage.getItem('FLUENCE_STUDENTS');
    return saved ? JSON.parse(saved) : DEFAULT_STUDENTS;
  });

  const [currentStudent, setCurrentStudent] = useState<StudentProfile>(() => {
    const saved = localStorage.getItem('FLUENCE_CURRENT_STUDENT');
    return saved ? JSON.parse(saved) : DEFAULT_STUDENTS[0];
  });

  const [dyslexicMode, setDyslexicMode] = useState<boolean>(() => {
    return localStorage.getItem('FLUENCE_DYS_MODE') === 'true';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [hasKey, setHasKey] = useState(hasStoredApiKey());
  const [dismissBanner, setDismissBanner] = useState(false);

  // Initialisation de la base Dexie avec les seeds ELFE
  useEffect(() => {
    seedDatabaseIfEmpty().catch(console.error);
  }, []);

  // Sauvegarde des profils
  useEffect(() => {
    localStorage.setItem('FLUENCE_STUDENTS', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('FLUENCE_CURRENT_STUDENT', JSON.stringify(currentStudent));
  }, [currentStudent]);

  useEffect(() => {
    localStorage.setItem('FLUENCE_DYS_MODE', String(dyslexicMode));
    if (dyslexicMode) {
      document.body.classList.add('dys-mode');
    } else {
      document.body.classList.remove('dys-mode');
    }
  }, [dyslexicMode]);

  const handleAddStudent = (newStudent: StudentProfile) => {
    setStudents((prev) => [...prev, newStudent]);
  };

  const handleKeySaved = () => {
    setHasKey(hasStoredApiKey());
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header global */}
      <Header
        currentStudent={currentStudent}
        students={students}
        onSelectStudent={setCurrentStudent}
        onAddStudent={handleAddStudent}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        dyslexicMode={dyslexicMode}
        onToggleDyslexicMode={() => setDyslexicMode(!dyslexicMode)}
      />

      {/* Alerte discrète si pas de clé configurée */}
      {!hasKey && !dismissBanner && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs">
          <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-950 shrink-0" />
              <span>
                <strong>Modèle BYOK :</strong> Ajoutez votre clé Google AI Studio pour activer la transcription <code>gemini-3.5-transcribe</code> et le générateur d'histoires.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="bg-slate-950 text-white px-3 py-1 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Renseigner ma clé
              </button>
              <button
                onClick={() => setDismissBanner(true)}
                className="text-slate-900 hover:text-black p-1"
                title="Fermer ce message"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenu principal / Machine à états */}
      <main className="flex-1 pb-16">
        <SessionRunner
          currentStudent={currentStudent}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          dyslexicMode={dyslexicMode}
        />
      </main>

      {/* Modal Réglages Clé API */}
      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onKeySaved={handleKeySaved}
          />
        </Suspense>
      )}

      {/* Tiroir Historique des séances */}
      {isHistoryOpen && (
        <Suspense fallback={null}>
          <HistoryDrawer
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            selectedStudent={currentStudent.name}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
