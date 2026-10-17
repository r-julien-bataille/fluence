import {
  AlertTriangle,
  Check,
  ChevronDown,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { FluencyLevel } from "@/db/db";

export interface StudentProfile {
  level: FluencyLevel;
  name: string;
}

interface StudentSelectorProps {
  currentStudent: StudentProfile;
  onAddStudent: (student: StudentProfile) => void;
  onDeleteStudent?: (student: StudentProfile) => void;
  onSelectStudent: (student: StudentProfile) => void;
  students: StudentProfile[];
}

export const StudentSelector: React.FC<StudentSelectorProps> = ({
  currentStudent,
  students,
  onSelectStudent,
  onAddStudent,
  onDeleteStudent,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState<FluencyLevel>("CM2");
  const [studentPendingDelete, setStudentPendingDelete] =
    useState<StudentProfile | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
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

  useEffect(() => {
    if (!studentPendingDelete) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setStudentPendingDelete(null);
        setConfirmInput("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [studentPendingDelete]);

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

  const openDeleteModal = (student: StudentProfile) => {
    setIsOpen(false);
    setIsAdding(false);
    setConfirmInput("");
    setStudentPendingDelete(student);
  };

  const closeDeleteModal = () => {
    setStudentPendingDelete(null);
    setConfirmInput("");
  };

  const isConfirmMatch =
    studentPendingDelete !== null &&
    confirmInput.trim().toLocaleLowerCase("fr-FR") ===
      studentPendingDelete.name.trim().toLocaleLowerCase("fr-FR");

  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(studentPendingDelete && isConfirmMatch && onDeleteStudent)) {
      return;
    }
    onDeleteStudent(studentPendingDelete);
    closeDeleteModal();
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-cream/60 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-cream"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="font-bold text-stone-900">{currentStudent.name}</span>
        <span className="rounded bg-primary-100 px-1.5 py-0.5 font-bold text-[10px] text-primary-800">
          {currentStudent.level}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="h-3.5 w-3.5 text-stone-500"
        />
      </button>

      {isOpen && (
        <div className="fade-in zoom-in-95 absolute top-full right-0 z-50 mt-1.5 w-60 animate-in rounded-xl border border-stone-200 bg-paper p-1.5 shadow-lg duration-150">
          <div className="px-2.5 py-1 font-semibold text-[11px] text-stone-600">
            Élèves
          </div>

          <div className="max-h-52 space-y-0.5 overflow-y-auto">
            {students.map((s) => {
              const isSelected = currentStudent.name === s.name;
              return (
                <div
                  className={`flex items-center justify-between gap-1 rounded-lg px-2 py-1 text-xs transition-colors ${
                    isSelected
                      ? "bg-primary-50 font-bold text-primary-900"
                      : "text-stone-700 hover:bg-cream"
                  }`}
                  key={`${s.name}-${s.level}`}
                >
                  <button
                    className="flex flex-1 cursor-pointer items-center justify-between py-1 text-left"
                    onClick={() => {
                      onSelectStudent(s);
                      setIsOpen(false);
                    }}
                    type="button"
                  >
                    <span>
                      {s.name}{" "}
                      <span className="text-stone-600">({s.level})</span>
                    </span>
                    {isSelected && (
                      <Check className="mr-1 h-3.5 w-3.5 text-primary-600" />
                    )}
                  </button>
                  {onDeleteStudent && students.length > 1 && (
                    <button
                      aria-label={`Supprimer le profil ${s.name}`}
                      className="cursor-pointer rounded p-1 text-stone-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteModal(s);
                      }}
                      title={`Supprimer ${s.name}`}
                      type="button"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {isAdding ? (
            <form
              className="mt-1.5 space-y-2 border-stone-100 border-t p-1.5 pt-2"
              onSubmit={handleCreate}
            >
              <input
                aria-label="Prénom de l'élève"
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
                  className="flex-1 cursor-pointer rounded bg-stone-100 py-1 text-[11px] text-stone-700 hover:bg-stone-200"
                  onClick={() => setIsAdding(false)}
                  type="button"
                >
                  Annuler
                </button>
                <button
                  className="flex-1 cursor-pointer rounded bg-primary-600 py-1 font-bold text-[11px] text-white hover:bg-primary-700"
                  type="submit"
                >
                  Ajouter
                </button>
              </div>
            </form>
          ) : (
            <button
              className="mt-1 flex w-full cursor-pointer items-center gap-1.5 rounded-lg border-stone-100 border-t px-2.5 py-1.5 pt-2 font-semibold text-primary-700 text-xs transition-colors hover:bg-primary-50"
              onClick={() => setIsAdding(true)}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nouvel élève</span>
            </button>
          )}
        </div>
      )}

      {studentPendingDelete &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-stone-900/50 p-4 backdrop-blur-xs duration-150"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) {
                closeDeleteModal();
              }
            }}
          >
            <div
              aria-labelledby="delete-student-modal-title"
              aria-modal="true"
              className="relative w-full max-w-sm rounded-2xl border border-stone-200 bg-paper p-6 shadow-xl"
              role="dialog"
            >
              <div className="mb-4 flex items-center justify-between border-stone-100 border-b pb-3">
                <div className="flex items-center gap-2 text-rose-700">
                  <AlertTriangle
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0"
                  />
                  <h2
                    className="font-bold font-fun text-base text-stone-900"
                    id="delete-student-modal-title"
                  >
                    Supprimer le profil élève
                  </h2>
                </div>
                <button
                  aria-label="Fermer la fenêtre"
                  className="cursor-pointer rounded-lg p-1 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
                  onClick={closeDeleteModal}
                  type="button"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleConfirmDelete}>
                <p className="text-stone-700 text-xs leading-relaxed">
                  Pour confirmer la suppression du profil{" "}
                  <strong className="font-bold text-stone-900">
                    {studentPendingDelete.name}
                  </strong>{" "}
                  ({studentPendingDelete.level}), tapez son nom ci-dessous :
                </p>

                <div>
                  <label
                    className="mb-1.5 block font-semibold text-stone-700 text-xs"
                    htmlFor="confirm-delete-student-input"
                  >
                    Tapez « {studentPendingDelete.name} »
                  </label>
                  <input
                    autoComplete="off"
                    autoFocus
                    className="w-full rounded-xl border border-stone-200 bg-cream px-3.5 py-2 text-stone-900 text-xs focus:bg-paper focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    id="confirm-delete-student-input"
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder={studentPendingDelete.name}
                    type="text"
                    value={confirmInput}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    className="cursor-pointer rounded-xl border border-stone-200 px-3.5 py-2 font-semibold text-stone-700 text-xs transition-colors hover:bg-cream"
                    onClick={closeDeleteModal}
                    type="button"
                  >
                    Annuler
                  </button>
                  <button
                    className="cursor-pointer rounded-xl bg-rose-600 px-4 py-2 font-bold text-white text-xs transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!isConfirmMatch}
                    type="submit"
                  >
                    Supprimer
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
