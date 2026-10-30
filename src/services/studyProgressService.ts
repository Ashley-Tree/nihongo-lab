import { db, type StudyProgress, type ExamAttempt } from "../db/database";
export type Kind = StudyProgress["kind"];
export async function allStudyProgress() {
  return db.studyProgress.toArray();
}
export async function updateStudyProgress(
  kind: Kind,
  itemId: string,
  patch: Partial<Pick<StudyProgress, "mastered" | "favorite">>,
  result?: boolean,
) {
  const key = `${kind}:${itemId}`;
  await db.transaction("rw", db.studyProgress, async () => {
    const old = await db.studyProgress.get(key);
    await db.studyProgress.put({
      ...old,
      ...patch,
      key,
      kind,
      itemId,
      mastered: patch.mastered ?? old?.mastered ?? false,
      favorite: patch.favorite ?? old?.favorite ?? false,
      attempts: (old?.attempts ?? 0) + (result === undefined ? 0 : 1),
      correct: (old?.correct ?? 0) + (result === true ? 1 : 0),
      updatedAt: Date.now(),
    });
  });
}
export async function saveExamAttempt(value: Omit<ExamAttempt, "id">) {
  return db.examAttempts.add(value);
}
export async function listExamAttempts() {
  return db.examAttempts.orderBy("finishedAt").reverse().toArray();
}
