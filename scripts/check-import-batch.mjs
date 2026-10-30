import fs from 'node:fs'
import path from 'node:path'

const file = process.argv[2] || 'data/n5_import_batch_01.json'
const full = path.resolve(file)
if (!fs.existsSync(full)) {
  console.error(`找不到文件：${full}`)
  process.exit(1)
}
let rows
try { rows = JSON.parse(fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, '')) }
catch (e) { console.error(`JSON 解析失败：${e.message}`); process.exit(1) }
const fields = ['japanese','kana','meaning','example','exampleMeaning','level','type']
const allowed = new Set(['N5','N4','N3','N2','N1'])
const errors=[]; const keys=new Set(); const ids=new Set()
if (!Array.isArray(rows)) errors.push('顶层必须是数组')
else rows.forEach((r,i)=>{
  const p=`第 ${i+1} 条`
  if (!r || typeof r !== 'object' || Array.isArray(r)) { errors.push(`${p}必须是对象`); return }
  for (const f of fields) if (typeof r[f] !== 'string' || !r[f].trim()) errors.push(`${p}字段 ${f} 缺失或为空`)
  if (!allowed.has(r.level)) errors.push(`${p}等级必须为 N5/N4/N3/N2/N1`)
  const k=`${r.japanese}|${r.kana}`
  if (keys.has(k)) errors.push(`${p}重复词条：${k}`); keys.add(k)
  if (r.id !== undefined) { if (!Number.isInteger(r.id)) errors.push(`${p} id 必须为整数`); else if(ids.has(r.id)) errors.push(`${p}重复 id：${r.id}`); ids.add(r.id) }
})
console.log(`检查文件：${file}`)
console.log(`词条数量：${Array.isArray(rows)?rows.length:0}`)
if(errors.length){ console.error('\n发现问题：'); errors.forEach(e=>console.error('❌ '+e)); process.exit(1) }
console.log('等级统计：', Object.fromEntries(['N5','N4','N3','N2','N1'].map(l=>[l,rows.filter(r=>r.level===l).length])))
console.log('✅ 导入文件格式检查通过。注意：格式通过不代表 JLPT 等级与语言学内容已获官方认证。')
