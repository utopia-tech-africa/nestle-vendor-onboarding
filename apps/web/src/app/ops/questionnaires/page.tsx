"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  calmPrimaryButtonClass,
  calmPrimaryButtonInlineClass,
  calmSecondaryButtonClass,
  calmToolbarOutlineButtonInlineClass
} from "@/lib/calm-ui";
import {
  createQuestionnaire,
  listQuestionnaires,
  seedDefaultQuestionnaire,
  updateQuestionnaire,
  type QuestionnaireQuestion,
  type QuestionnaireRecord
} from "@/lib/outlet/outlet-api";
import { toast } from "@/lib/toast";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm";
const inputClass =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type QuestionDraft = {
  key: string;
  prompt: string;
  type: QuestionnaireQuestion["type"];
  optionsText: string;
  required: boolean;
  helpText: string;
};

const QUESTION_TYPES: QuestionnaireQuestion["type"][] = [
  "text",
  "textarea",
  "number",
  "single_choice",
  "multi_choice",
  "boolean"
];

const blankQuestion = (): QuestionDraft => ({
  key: `q-${Math.random().toString(36).slice(2, 10)}`,
  prompt: "",
  type: "text",
  optionsText: "",
  required: false,
  helpText: ""
});

const optionsFromJson = (optionsJson: string | null): string => {
  if (!optionsJson) return "";
  try {
    const parsed = JSON.parse(optionsJson) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string").join(", ");
    }
  } catch {
    return optionsJson;
  }
  return "";
};

const toDrafts = (row: QuestionnaireRecord): QuestionDraft[] =>
  row.questions.map((q) => ({
    key: q.id,
    prompt: q.prompt,
    type: q.type,
    optionsText: optionsFromJson(q.optionsJson),
    required: q.required,
    helpText: q.helpText ?? ""
  }));

const draftsToPayload = (drafts: QuestionDraft[]) =>
  drafts
    .map((d, index) => {
      const options = d.optionsText
        .split(",")
        .map((o) => o.trim())
        .filter((o) => o.length > 0);
      return {
        prompt: d.prompt.trim(),
        type: d.type,
        required: d.required,
        sortOrder: index,
        ...(d.helpText.trim().length > 0 ? { helpText: d.helpText.trim() } : {}),
        ...(d.type === "single_choice" || d.type === "multi_choice"
          ? { options }
          : {})
      };
    })
    .filter((q) => q.prompt.length >= 2);

export default function OpsQuestionnairesPage(): ReactElement {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [creating, setCreating] = useState(false);

  const listQuery = useQuery({
    queryKey: ["ops", "questionnaires"],
    queryFn: async () => listQuestionnaires(accessToken ?? ""),
    enabled: accessToken !== null
  });

  const rows = listQuery.data ?? [];
  const selected = creating ? null : (rows.find((r) => r.id === selectedId) ?? rows[0] ?? null);

  useEffect(() => {
    if (creating) {
      setTitle("New questionnaire");
      setDescription("");
      setQuestions([blankQuestion()]);
      return;
    }
    if (selected === null) {
      setTitle("");
      setDescription("");
      setQuestions([]);
      return;
    }
    setTitle(selected.title);
    setDescription(selected.description ?? "");
    setQuestions(toDrafts(selected));
  }, [creating, selected]);

  const seedMutation = useMutation({
    mutationFn: async () => seedDefaultQuestionnaire(accessToken ?? ""),
    onSuccess: (row) => {
      toast.success("Default Nestlé questionnaire updated with catalog dropdowns");
      setCreating(false);
      setSelectedId(row.id);
      void queryClient.invalidateQueries({ queryKey: ["ops", "questionnaires"] });
    },
    onError: () => toast.error("Could not seed questionnaire")
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payloadQuestions = draftsToPayload(questions);
      if (title.trim().length < 2) {
        throw new Error("Title is required");
      }
      if (payloadQuestions.length === 0) {
        throw new Error("Add at least one question");
      }
      for (const q of payloadQuestions) {
        if (
          (q.type === "single_choice" || q.type === "multi_choice") &&
          (q.options?.length ?? 0) < 2
        ) {
          throw new Error(`Choice question "${q.prompt}" needs at least 2 options`);
        }
      }
      if (creating || selected === null) {
        return createQuestionnaire(accessToken ?? "", {
          title: title.trim(),
          description: description.trim() || undefined,
          isActive: true,
          questions: payloadQuestions
        });
      }
      return updateQuestionnaire(accessToken ?? "", selected.id, {
        title: title.trim(),
        description: description.trim(),
        questions: payloadQuestions
      });
    },
    onSuccess: (row) => {
      toast.success(creating ? "Questionnaire created" : "Questionnaire saved");
      setCreating(false);
      setSelectedId(row.id);
      void queryClient.invalidateQueries({ queryKey: ["ops", "questionnaires"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Could not save questionnaire");
    }
  });

  const toggleActive = useMutation({
    mutationFn: async (row: QuestionnaireRecord) =>
      updateQuestionnaire(accessToken ?? "", row.id, { isActive: !row.isActive }),
    onSuccess: () => {
      toast.success("Questionnaire updated");
      void queryClient.invalidateQueries({ queryKey: ["ops", "questionnaires"] });
    },
    onError: () => toast.error("Could not update questionnaire")
  });

  const updateQuestion = (key: string, patch: Partial<QuestionDraft>): void => {
    setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Questionnaires</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build and activate visit questions without an app update. Seed Nestlé default refreshes
            gender, role, age, employees, products, and competitor dropdowns from the catalogs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={calmToolbarOutlineButtonInlineClass}
            onClick={() => {
              setCreating(true);
              setSelectedId(null);
            }}
          >
            New form
          </button>
          <button
            type="button"
            className={calmPrimaryButtonInlineClass}
            disabled={seedMutation.isPending}
            onClick={() => seedMutation.mutate()}
          >
            Seed Nestlé default
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <section className={cardClass}>
          <h2 className="text-sm font-semibold">Forms</h2>
          {listQuery.isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 && !creating ? (
            <p className="mt-3 text-sm text-muted-foreground">No questionnaires yet.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {creating ? (
                <li>
                  <div className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
                    <span className="font-medium">New form</span>
                    <span className="mt-0.5 block text-xs">Draft</span>
                  </div>
                </li>
              ) : null}
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      !creating && selected?.id === row.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => {
                      setCreating(false);
                      setSelectedId(row.id);
                    }}
                  >
                    <span className="font-medium">{row.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {row.isActive ? "Active" : "Inactive"} · {row.questions.length} questions
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={cardClass}>
          {!creating && selected === null ? (
            <p className="text-sm text-muted-foreground">Select or seed a questionnaire.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-3">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Title
                    <input
                      className={inputClass}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-medium text-muted-foreground">
                    Description
                    <textarea
                      className={`${inputClass} min-h-20`}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </label>
                </div>
                {!creating && selected !== null ? (
                  <button
                    type="button"
                    className={calmSecondaryButtonClass}
                    disabled={toggleActive.isPending}
                    onClick={() => toggleActive.mutate(selected)}
                  >
                    {selected.isActive ? "Deactivate" : "Activate"}
                  </button>
                ) : null}
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Questions</h3>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() => setQuestions((prev) => [...prev, blankQuestion()])}
                  >
                    Add question
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Saving replaces the question list. Prefer editing before promoters submit answers.
                </p>
                <ul className="mt-3 space-y-3">
                  {questions.map((q, index) => (
                    <li
                      key={q.key}
                      className="rounded-lg border border-border bg-muted/20 p-3 dark:bg-muted/10"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Question {index + 1}
                        </p>
                        <button
                          type="button"
                          className="text-xs text-destructive hover:underline"
                          onClick={() =>
                            setQuestions((prev) => prev.filter((item) => item.key !== q.key))
                          }
                        >
                          Remove
                        </button>
                      </div>
                      <label className="mt-2 block text-xs font-medium text-muted-foreground">
                        Prompt
                        <input
                          className={inputClass}
                          value={q.prompt}
                          onChange={(e) => updateQuestion(q.key, { prompt: e.target.value })}
                        />
                      </label>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Type
                          <Select
                            value={q.type}
                            onValueChange={(value) =>
                              updateQuestion(q.key, {
                                type: value as QuestionnaireQuestion["type"]
                              })
                            }
                          >
                            <SelectTrigger className="mt-1 h-10 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {QUESTION_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </label>
                        <label className="flex items-end gap-2 pb-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={q.required}
                            onChange={(e) => updateQuestion(q.key, { required: e.target.checked })}
                          />
                          Required
                        </label>
                      </div>
                      {q.type === "single_choice" || q.type === "multi_choice" ? (
                        <label className="mt-2 block text-xs font-medium text-muted-foreground">
                          Options (comma-separated)
                          <input
                            className={inputClass}
                            value={q.optionsText}
                            onChange={(e) => updateQuestion(q.key, { optionsText: e.target.value })}
                            placeholder="Yes, No, Maybe"
                          />
                        </label>
                      ) : null}
                      <label className="mt-2 block text-xs font-medium text-muted-foreground">
                        Help text (optional)
                        <input
                          className={inputClass}
                          value={q.helpText}
                          onChange={(e) => updateQuestion(q.key, { helpText: e.target.value })}
                        />
                      </label>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {creating ? (
                  <button
                    type="button"
                    className={calmSecondaryButtonClass}
                    onClick={() => setCreating(false)}
                  >
                    Cancel
                  </button>
                ) : null}
                <button
                  type="button"
                  className={calmPrimaryButtonClass}
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending
                    ? "Saving…"
                    : creating
                      ? "Create questionnaire"
                      : "Save changes"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
