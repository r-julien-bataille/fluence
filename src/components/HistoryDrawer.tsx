import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, FluencySession } from '@/db/db';
import { X, Calendar, BookOpen, Trash2 } from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudent: string;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  selectedStudent,
}) => {
  const sessions = useLiveQuery(async () => {
    return await db.sessions
      .orderBy('date')
      .reverse()
      .toArray();
  }, []);

  const texts = useLiveQuery(async () => {
    return await db.texts.toArray();
  }, []);

  if (!isOpen) return null;

  const filteredSessions = sessions?.filter((s) =>
    selectedStudent === 'Tous' ? true : s.studentName === selectedStudent
  );

  const getTextTitle = (textId: string) => {
    const found = texts?.find((t) => t.id === textId);
    return found ? found.title : 'Texte';
  };

  const getTextLevel = (textId: string) => {
    const found = texts?.find((t) => t.id === textId);
    return found ? found.level : '';
  };

  const handleDeleteSession = async (id: string) => {
    if (confirm("Supprimer cette séance de l'historique ?")) {
      await db.sessions.delete(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col p-6 animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900 font-fun">Historique des séances</h3>
            <p className="text-xs text-slate-500">
              {selectedStudent === 'Tous' ? 'Tous les élèves' : `Élève : ${selectedStudent}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {(!filteredSessions || filteredSessions.length === 0) ? (
            <div className="text-center py-16 text-slate-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold">Aucune séance enregistrée pour le moment.</p>
              <p className="text-xs mt-1">Complétez une session de lecture pour voir les progrès !</p>
            </div>
          ) : (
            filteredSessions.map((session: FluencySession) => {
              const delta = session.progressionDelta ?? 0;
              const title = getTextTitle(session.textId);
              const level = getTextLevel(session.textId);
              const dateStr = new Date(session.date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={session.id}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 hover:shadow-xs transition-shadow relative group"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      {dateStr}
                    </span>
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {session.studentName} {level && `(${level})`}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm mb-3">
                    {title}
                  </h4>

                  <div className="grid grid-cols-3 gap-2 bg-white rounded-xl p-2.5 border border-slate-100 text-center mb-2">
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">1ère lecture</div>
                      <div className="text-base font-bold text-slate-700 font-fun">
                        {session.step1.mclm} <span className="text-[10px] font-sans">MCLM</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Défi final</div>
                      <div className="text-base font-bold text-indigo-700 font-fun">
                        {session.step3 ? session.step3.mclm : '-'} <span className="text-[10px] font-sans">MCLM</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Gain</div>
                      <div
                        className={`text-base font-bold font-fun ${
                          delta > 0
                            ? 'text-emerald-600'
                            : delta === 0
                            ? 'text-slate-500'
                            : 'text-rose-600'
                        }`}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </div>
                    </div>
                  </div>

                  {session.step1.stumbledWords && session.step1.stumbledWords.length > 0 && (
                    <div className="text-xs text-slate-500 flex flex-wrap gap-1 items-center mt-2">
                      <span className="text-[10px] font-semibold text-slate-400">Mots travaillés :</span>
                      {session.step1.stumbledWords.map((w, idx) => (
                        <span key={idx} className="bg-amber-100/70 text-amber-900 px-1.5 py-0.5 rounded text-[11px]">
                          {w}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="absolute top-3 right-3 text-slate-300 hover:text-rose-500 transition-colors p-1"
                    title="Supprimer la session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
