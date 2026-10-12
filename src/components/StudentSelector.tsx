import React, { useState } from 'react';
import { FluencyLevel } from '@/db/db';
import { Plus, Check } from 'lucide-react';

export interface StudentProfile {
  name: string;
  level: FluencyLevel;
}

interface StudentSelectorProps {
  currentStudent: StudentProfile;
  students: StudentProfile[];
  onSelectStudent: (student: StudentProfile) => void;
  onAddStudent: (student: StudentProfile) => void;
}

export const StudentSelector: React.FC<StudentSelectorProps> = ({
  currentStudent,
  students,
  onSelectStudent,
  onAddStudent,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLevel, setNewLevel] = useState<FluencyLevel>('CM2');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newStudent: StudentProfile = {
      name: newName.trim(),
      level: newLevel,
    };
    onAddStudent(newStudent);
    onSelectStudent(newStudent);
    setNewName('');
    setIsAdding(false);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs transition-all cursor-pointer text-left"
      >
        <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
          {currentStudent.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="hidden sm:block">
          <div className="text-xs font-bold text-slate-800 leading-tight">
            {currentStudent.name}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Niveau {currentStudent.level}
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 sm:right-0 sm:left-auto w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
            Changer d'élève
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {students.map((s, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelectStudent(s);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  currentStudent.name === s.name
                    ? 'bg-indigo-50 text-indigo-900 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{s.name} ({s.level})</span>
                {currentStudent.name === s.name && (
                  <Check className="w-3.5 h-3.5 text-indigo-600" />
                )}
              </button>
            ))}
          </div>

          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-indigo-600 hover:bg-indigo-50 font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter un élève</span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="mt-2 pt-2 border-t border-slate-100 space-y-2 p-1">
              <input
                type="text"
                placeholder="Prénom de l'élève"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex gap-1">
                {(['CE1', 'CE2', 'CM1', 'CM2'] as FluencyLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setNewLevel(lvl)}
                    className={`flex-1 py-1 text-[10px] font-bold rounded ${
                      newLevel === lvl
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded"
                >
                  Valider
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
