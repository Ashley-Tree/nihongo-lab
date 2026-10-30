
import {
    BookOpen,
    BookText,
    Languages,
    Headphones,
    ClipboardCheck,
    ChartNoAxesCombined,
    PenLine,
    ArrowRight,
    Search,
    Sparkles,
  } from 'lucide-react'
  
  type StudyPageProps = {
    type: string
  }
  
  const pageData: Record<string, {
    title: string
    english: string
    description: string
    icon: typeof BookOpen
    color: string
    features: string[]
  }> = {
    vocabulary: {
      title: '词汇学习',
      english: 'Vocabulary Learning',
      description: '从基础词汇开始，逐步积累日语表达能力。',
      icon: BookOpen,
      color: 'bg-[#EAF0E8] text-[#66836D]',
      features: ['分级词汇学习', '单词卡片记忆', '假名与中文释义', '收藏与复习'],
    },
    grammar: {
      title: '语法学习',
      english: 'Grammar Learning',
      description: '理解日语语法结构，掌握实际使用方法。',
      icon: BookText,
      color: 'bg-[#F3EDE3] text-[#A3865D]',
      features: ['N5～N1 分级语法', '语法接续说明', '日语例句与翻译', '相似语法辨析'],
    },
    kanji: {
      title: '汉字学习',
      english: 'Kanji Learning',
      description: '从汉字读音、字义到常用词语，建立完整知识体系。',
      icon: Languages,
      color: 'bg-[#E9EDF2] text-[#71849A]',
      features: ['汉字检索', '音读与训读', '常用词语', '汉字复习'],
    },
    reading: {
      title: '阅读训练',
      english: 'Reading Practice',
      description: '通过不同难度的日语文章提升阅读理解能力。',
      icon: PenLine,
      color: 'bg-[#F3EAED] text-[#A07889]',
      features: ['分级阅读文章', '生词标记', '文章理解练习', '阅读历史'],
    },
    listening: {
      title: '听力训练',
      english: 'Listening Practice',
      description: '训练日语听力，逐步提升信息捕捉和理解能力。',
      icon: Headphones,
      color: 'bg-[#EEECF5] text-[#8580A5]',
      features: ['分级听力材料', '音频播放', '听力理解题', '听力记录'],
    },
    exam: {
      title: '模拟考试',
      english: 'Mock Examination',
      description: '按照 JLPT N5～N1 等级进行模拟练习。',
      icon: ClipboardCheck,
      color: 'bg-[#F6EBE4] text-[#B17D62]',
      features: ['分级模拟考试', '限时答题', '自动评分', '答案与解析'],
    },
    reports: {
      title: '学习报告',
      english: 'Learning Reports',
      description: '记录学习过程，观察自己的进步。',
      icon: ChartNoAxesCombined,
      color: 'bg-[#EAF0E8] text-[#66836D]',
      features: ['每日学习记录', '词汇掌握情况', '正确率统计', '学习趋势'],
    },
  }
  
  export default function StudyPages({ type }: StudyPageProps) {
    const page = pageData[type]
  
    if (!page) {
      return <div className="p-8">页面不存在</div>
    }
  
    const Icon = page.icon
  
    return (
      <div className="mx-auto max-w-[1200px] space-y-7">
  
        {/* 页面标题 */}
        <section className="rounded-[24px] bg-white p-7 sm:p-10">
          <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${page.color}`}>
            <Icon size={27} />
          </div>
  
          <p className="mb-2 text-xs tracking-[2px] text-[#A0A39B]">
            {page.english.toUpperCase()}
          </p>
  
          <h1 className="text-2xl font-semibold tracking-wide sm:text-3xl">
            {page.title}
          </h1>
  
          <p className="mt-3 max-w-xl text-sm leading-7 text-[#858B82]">
            {page.description}
          </p>
        </section>
  
        {/* 等级选择 */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">选择 JLPT 学习等级</h2>
            <p className="mt-1 text-xs text-[#A0A39B]">
              根据自己的学习目标选择等级
            </p>
          </div>
  
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {['N5', 'N4', 'N3', 'N2', 'N1'].map((level, index) => (
              <button
                key={level}
                className={`rounded-2xl border p-5 text-left transition hover:-translate-y-1 hover:shadow-sm ${
                  index === 2
                    ? 'border-[#C8D8C5] bg-[#EAF0E8]'
                    : 'border-[#ECEDE7] bg-white'
                }`}
              >
                <p className="text-xl font-semibold text-[#526D57]">
                  {level}
                </p>
                <p className="mt-2 text-[11px] text-[#999E96]">
                  {index === 0 ? '入门' : index === 1 ? '初级' : index === 2 ? '中级' : index === 3 ? '中高级' : '高级'}
                </p>
              </button>
            ))}
          </div>
        </section>
  
        {/* 功能入口 */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">学习功能</h2>
            <p className="mt-1 text-xs text-[#A0A39B]">
              开始你的学习计划
            </p>
          </div>
  
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {page.features.map((feature, index) => (
              <button
                key={feature}
                className="group flex items-center justify-between rounded-2xl border border-[#ECEDE7] bg-white p-5 text-left transition hover:border-[#D5E1D2] hover:shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F5F0] text-[#789079]">
                    {index === 0 ? <Search size={19} /> :
                      index === 1 ? <BookOpen size={19} /> :
                      index === 2 ? <Sparkles size={19} /> :
                      <ArrowRight size={19} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{feature}</p>
                    <p className="mt-1 text-[10px] text-[#A0A39B]">
                      Nihongo Lab Learning
                    </p>
                  </div>
                </div>
                <ArrowRight
                  size={17}
                  className="text-[#A6B2A3] transition group-hover:translate-x-1"
                />
              </button>
            ))}
          </div>
        </section>
  
        {/* 开发提示 */}
        <section className="rounded-2xl border border-dashed border-[#DCE2D8] bg-[#F4F6F1] p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 shrink-0 text-[#789079]" size={19} />
            <div>
              <h3 className="text-sm font-semibold">学习模块正在建设中</h3>
              <p className="mt-2 text-xs leading-6 text-[#858B82]">
                当前已完成页面结构和导航。后续将接入词汇、语法、汉字及题库 JSON 数据，
                并实现搜索、学习、收藏和复习功能。
              </p>
            </div>
          </div>
        </section>
  
      </div>
    )
  }
  