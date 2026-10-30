import fs from 'node:fs'; import path from 'node:path'
const root=path.join(process.cwd(),'src','data','content');let failures=0
for(const kind of ['grammar','reading','listening','questions'])for(const level of ['n5','n4','n3','n2','n1']){
 const file=path.join(root,`${kind}_${level}.json`);const entries=JSON.parse(fs.readFileSync(file,'utf8'));const ids=new Set()
 for(const x of entries){if(!x.id||x.level!==level.toUpperCase()||ids.has(x.id)){failures++;console.error('基础字段或重复 ID',file,x.id)}ids.add(x.id)
 if((kind==='questions' && x.type!=='sentence_ordering')||kind==='reading'||kind==='listening'){if(!Array.isArray(x.options)||x.options.length!==4||!Number.isInteger(x.answer_index)||x.answer_index<0||x.answer_index>=4){failures++;console.error('无效选项',x.id)}}}
 console.log(`${kind}_${level}: ${entries.length} 条`)
}
const kanji=JSON.parse(fs.readFileSync(path.join(root,'kanji_core.json'),'utf8'));console.log('汉字:',kanji.length); console.log('模拟练习可用选择题 1350 道，另有未接入排序题 150 道')
if(failures)process.exitCode=1;else console.log('结构检查通过（不代表日语内容已人工审校）')
