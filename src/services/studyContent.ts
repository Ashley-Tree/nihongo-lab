/** 本地内容读取。教材为原创初稿，JLPT 等级仅作学习参考。 */
export type Level = 'N5'|'N4'|'N3'|'N2'|'N1'
export const levels: Level[] = ['N5','N4','N3','N2','N1']
export type Choice = { id:string; level:Level; options:string[]; answer_index:number; explanation_zh?:string; prompt_zh?:string; prompt_ja?:string; title?:string; type?:string; passage_ja?:string; script_ja?:string }
export type Grammar = { id:string; level:Level; pattern:string; meaning_zh:string; formation_zh?:string; usage_zh?:string; examples?:{ja:string;zh:string}[]; contrast_pattern?:string; contrast_notes_zh?:string }
export type Kanji = {id:string; character:string;level:Level;on_readings:string;kun_readings:string;meaning_zh:string;common_words:string[];review_status:string}
export type Reading = Choice & { passage_ja:string; title:string }
export type Listening = Choice & { script_ja:string; title:string; audio?:{status:string; file?:string|null} }
const data = import.meta.glob('../data/content/*.json', { eager:true, import:'default' }) as Record<string,unknown>
function get<T>(kind:string):T[]{ return Object.entries(data).filter(([k])=>k.split('/').pop()?.startsWith(kind+'_')).flatMap(([,v])=>Array.isArray(v)?v as T[]:[]) }
export const grammars = get<Grammar>('grammar')
export const kanjis = (data['../data/content/kanji_core.json'] ?? []) as Kanji[]
export const readings = get<Reading>('reading')
export const listenings = get<Listening>('listening')
export const questions = get<Choice>('questions').filter(q=>Array.isArray(q.options)&&q.options.length===4&&Number.isInteger(q.answer_index)&&q.answer_index>=0&&q.answer_index<4)
export function promptOf(q:Choice){return q.prompt_zh || q.prompt_ja || q.title || '请选择正确答案'}
export function sampleQuestions(level:Level, count:number, seed:number):Choice[] {
 const source=questions.filter(q=>q.level===level)
 // seeded shuffle: a given exam session keeps the same question sequence
 const copy=[...source]; let n=seed>>>0
 for(let i=copy.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[copy[i],copy[j]]=[copy[j],copy[i]]}
 return copy.slice(0,Math.min(count,copy.length))
}
