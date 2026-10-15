import { Check, Plus } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

import type { FluencyLevel } from "@/db/db";

export interface StudentProfile {
  level: FluencyLevel;
  name: string;
}

interface StudentSelectorProps {
  currentStudent: StudentProfile;
  onAddStudent: (student: StudentProfile) => void;
  onSelectStudent: (student: StudentProfile) => void;
  students: StudentProfile[];
}

export const StudentSelector: React.FC<StudentSelectorProps> = ({
  currentStudent,
  students,
  onSelectStudent,
  onAddStudent,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState<FluencyLevel>("CM2");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setIsAdding(false);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsAdding(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      return;
    }
    const newStudent: StudentProfile = {
      level: newLevel,
      name: newName.trim(),
    };
    onAddStudent(newStudent);
    onSelectStudent(newStudent);
    setNewName("");
    setIsAdding(false);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-stone-200/90 bg-paper px-3 py-2 text-left shadow-2xs transition-all hover:bg-cream"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-100 font-bold text-primary-700 text-xs">
          {currentStudent.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="hidden sm:block">
          <div className="font-bold text-stone-800 text-xs leading-tight">
            {currentStudent.name}
          </div>
          <div className="font-medium text-[10px] text-stone-500">
            Niveau {currentStudent.level}
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="fade-in zoom-in-95 absolute top-full left-0 z-50 mt-2 w-64 animate-in rounded-2xl border border-stone-100 bg-paper p-2 shadow-xl duration-150 sm:right-0 sm:left-auto">
          <div className="px-3 py-1.5 font-bold text-[10px] text-stone-400 uppercase tracking-wider">
            Changer d’élève
          </div>

          <div className="max-h-48 space-y-1 overflow-y-auto">
            {students.map((s, idx) => (
              <button
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 font-medium text-xs transition-colors ${
                  currentStudent.name === s.name
                    ? "bg-primary-50 font-bold text-primary-900"
                    : "text-stone-700 hover:bg-cream"
                }`}
                key={idx}
                onClick={() => {
                  onSelectStudent(s);
                  setIsOpen(false);
                }}
                type="button"
              >
                <span>
                  {s.name} ({s.level})
                </span>
                {currentStudent.name === s.name && (
                  <Check className="h-3.5 w-3.5 text-primary-600" />
                )}
              </button>
            ))}
          </div>

          {isAdding ? (
            <form
              className="mt-2 space-y-2 border-stone-100 border-t p-1 pt-2"
              onSubmit={handleCreate}
            >
              <input
                autoFocus
                className="w-full rounded-lg border border-stone-200 bg-cream px-2.5 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary-500"
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Prénom de l'élève"
                type="text"
                value={newName}
              />
              <div className="flex gap-1">
                {(["CE1", "CE2", "CM1", "CM2"] as FluencyLevel[]).map((lvl) => (
                  <button
                    className={`flex-1 cursor-pointer rounded py-1 font-bold text-[10px] ${
                      newLevel === lvl
                        ? "bg-primary-600 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                    key={lvl}
                    onClick={() => setNewLevel(lvl)}
                    type="button"
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 pt-1">
                <button
                  className="flex-1 cursor-pointer rounded bg-stone-100 py-1 text-[11px] text-stone-600 hover:bg-stone-200"
                  onClick={() => setIsAdding(false)}
                  type="button"
                >
                  Annuler
                </button>
                <button
                  className="flex-1 cursor-pointer rounded bg-primary-600 py-1 font-bold text-[11px] text-white hover:bg-primary-700"
                  type="submit"
                >
                  Valider
                </button>
              </div>
            </form>
          ) : (
            <button
              className="mt-2 flex w-full cursor-pointer items-center gap-2 rounded-xl border-stone-100 border-t px-3 py-1.5 pt-2 font-semibold text-primary-600 text-xs transition-colors hover:bg-primary-50"
              onClick={() => setIsAdding(true)}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ajouter un élève</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
