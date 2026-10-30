import {useEffect,useMemo,useState} from 'react'
import {kanjis} from '../services/studyContent'
import {allStudyProgress,updateStudyProgress} from '../services/studyProgressService'
export default function KanjiPage(){
 const [search,setSearch]=useState(''),[saved,setSaved]=useState<Record<string,{favorite:boolean;mastered:boolean}>>({}),[tick,setTick]=useState(0),[error,setError]=useState('')
 useEffect(()=>{void allStudyProgress().then(x=>setSaved(Object.fromEntries(x.filter(y=>y.kind==='kanji').map(y=>[y.itemId,y])))).catch(()=>setError('读取记录失败'))},[tick])
 const shown=useMemo(()=>kanjis.filter(x=>[x.character,x.meaning_zh,x.on_readings,x.kun_readings,...x.common_words].join(' ').includes(search)),[search])
 async function toggle(id:string,k:'favorite'|'mastered'){try{await updateStudyProgress('kanji',id,{[k]:!saved[id]?.[k]});setTick(n=>n+1)}catch{setError('保存失败')}}
 return <main className="mx-auto max-w-5xl space-y-5 pb-12"><h1 className="text-3xl font-bold">汉字学习</h1><p className="text-sm text-gray-500">首批 30 个基础汉字。音训读和释义为教学初稿；笔顺功能尚未提供，不展示未经核实的笔顺。</p>{error&&<p role="alert" className="text-red-600">{error}</p>}<input aria-label="搜索汉字" value={search} onChange={e=>setSearch(e.target.value)} placeholder="汉字、读音、含义或词汇" className="border rounded p-3 w-full"/><p>显示 {shown.length} 个</p><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{shown.map(k=><article key={k.id} className="rounded-xl bg-white border p-5"><h2 className="text-6xl text-center mb-3">{k.character}</h2><p><b>释义：</b>{k.meaning_zh}</p><p><b>音读：</b>{k.on_readings}</p><p><b>训读：</b>{k.kun_readings}</p><p><b>例词：</b>{k.common_words.join('、')}</p><div className="flex gap-2 mt-4"><button className="border p-2 rounded" onClick={()=>void toggle(k.id,'favorite')}>{saved[k.id]?.favorite?'★ 已收藏':'☆ 收藏'}</button><button className="border p-2 rounded" onClick={()=>void toggle(k.id,'mastered')}>{saved[k.id]?.mastered?'✓ 已掌握':'标记掌握'}</button></div></article>)}</div></main>
}
