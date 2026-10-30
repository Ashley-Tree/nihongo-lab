import { db, type StudyProgress, type ExamAttempt } from '../db/database'
/** v4 增量备份：不替代旧版词库完整备份。 */
export interface StudyBackup { format:'NihongoLabStudyV4'; exportedAt:string; studyProgress:StudyProgress[]; examAttempts:ExamAttempt[] }
export async function exportStudyBackup():Promise<StudyBackup> { return {format:'NihongoLabStudyV4',exportedAt:new Date().toISOString(),studyProgress:await db.studyProgress.toArray(),examAttempts:await db.examAttempts.toArray()} }
export async function downloadStudyBackup(){
 const payload=await exportStudyBackup();const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`nihongo-lab-study-v4-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
/** 先验证备份结构；导入时按 key 合并，考试历史追加并去掉原 id；只在用户明确点击恢复时调用。 */
export async function importStudyBackup(payload:unknown){
 if(!payload||typeof payload!=='object')throw new Error('备份内容无效')
 const x=payload as Partial<StudyBackup>
 if(x.format!=='NihongoLabStudyV4'||!Array.isArray(x.studyProgress)||!Array.isArray(x.examAttempts))throw new Error('不是有效的 v4 学习备份')
 for(const p of x.studyProgress){if(typeof p.key!=='string'||typeof p.itemId!=='string'||!['grammar','kanji','reading','listening'].includes(p.kind)||typeof p.mastered!=='boolean'||typeof p.favorite!=='boolean')throw new Error('学习进度数据无效')}
 for(const a of x.examAttempts){if(typeof a.level!=='string'||!Array.isArray(a.answers)||!Number.isInteger(a.total)||!Number.isInteger(a.correct))throw new Error('考试记录数据无效')}
 await db.transaction('rw',db.studyProgress,db.examAttempts,async()=>{
  await db.studyProgress.bulkPut(x.studyProgress!)
  for(const attempt of x.examAttempts!){const {id: _id, ...withoutId}=attempt;void _id;await db.examAttempts.add(withoutId)}
 })
}
