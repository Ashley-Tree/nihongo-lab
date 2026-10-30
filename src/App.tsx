import { useState } from "react";
import VocabularyPage from "./pages/VocabularyPage";
import VocabularyServiceTest from "./dev/VocabularyServiceTest";
import VocabularyManagerPage from "./pages/VocabularyManagerPage";
import ReviewPage from "./pages/ReviewPage";
import GrammarPage from "./pages/GrammarPage";
import KanjiPage from "./pages/KanjiPage";
import ReadingPage from "./pages/ReadingPage";
import ListeningPage from "./pages/ListeningPage";
import MockExamPage from "./pages/MockExamPage";
import StudyReportPage from "./pages/StudyReportPage";
import UnifiedReviewPage from "./pages/UnifiedReviewPage";
import DataManagerPage from "./pages/DataManagerPage";
import {
  HashRouter,
  Routes,
  Route,
  NavLink,
  Outlet,
  useLocation,
} from "react-router-dom";
import {
  BookOpen,
  BookText,
  Languages,
  Headphones,
  ClipboardCheck,
  Brain,
  BarChart3,
  House,
  Menu,
  X,
  Settings,
  ArrowRight,
  Flame,
  Target,
  CalendarDays,
  Check,
  PenLine,
  FolderUp,
  Database,
} from "lucide-react";
import StudyPages from "./pages/StudyPages";

const navigation = [
  { name: "学习首页", path: "/", icon: House },
  { name: "词汇学习", path: "/vocabulary", icon: BookOpen },
  { name: "语法学习", path: "/grammar", icon: BookText },
  { name: "汉字学习", path: "/kanji", icon: Languages },
  { name: "阅读训练", path: "/reading", icon: PenLine },
  { name: "听力训练", path: "/listening", icon: Headphones },
  { name: "模拟考试", path: "/mock-exam", icon: ClipboardCheck },
  // { name: "学习报告", path: "/reports", icon: ChartNoAxesCombined },
  { name: "全站智能复习", path: "/review-center", icon: Brain },
  { name: "学习报告", path: "/report", icon: BarChart3 },
  {
    name: "词库管理",
    path: "/vocabulary-manager",
    icon: FolderUp,
  },
  {
    name: "数据管理",
    path: "/data-manager",
    icon: Database,
  },
];

const tasks = [
  "复习 20 个日语单词",
  "学习 2 个语法知识点",
  "完成一篇日语阅读",
  "进行一次听力练习",
];

function Dashboard() {
  const [completed, setCompleted] = useState<number[]>([]);

  const toggleTask = (index: number) => {
    setCompleted((old) =>
      old.includes(index)
        ? old.filter((item) => item !== index)
        : [...old, index],
    );
  };

  const progress = Math.round((completed.length / tasks.length) * 100);

  return (
    <div className="space-y-8">
      <section className="rounded-[24px] bg-[#E9EFE7] px-7 py-10 sm:px-10">
        <p className="mb-3 text-xs tracking-[3px] text-[#789079]">
          おかえりなさい · WELCOME BACK
        </p>
        <h1 className="text-2xl font-semibold text-[#354B39] sm:text-3xl">
          今天也来学习日语吧。
        </h1>
        <p className="mt-3 text-sm leading-7 text-[#788579]">
          每天积累一点点，让日语学习成为一种习惯。 从今天开始，向你的 JLPT
          目标继续前进。
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: "连续学习", value: "0 天", icon: Flame },
          { label: "累计词汇", value: "210+", icon: BookOpen },
          { label: "学习时长", value: "0 小时", icon: CalendarDays },
          {
            label: "今日完成",
            value: `${completed.length}/${tasks.length}`,
            icon: Target,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-2xl border border-[#ECEDE7] bg-white p-5"
            >
              <div className="mb-4 flex justify-between">
                <span className="text-xs text-[#92978E]">{item.label}</span>
                <Icon size={19} className="text-[#819781]" />
              </div>
              <p className="text-2xl font-semibold">{item.value}</p>
            </div>
          );
        })}
      </section>

      <section>
        <div className="mb-5">
          <p className="mb-1 text-[10px] tracking-[2px] text-[#9A9D95]">
            YOUR LEARNING SPACE
          </p>
          <h2 className="text-lg font-semibold">学习中心</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {navigation.slice(1).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="group rounded-2xl border border-[#ECEDE7] bg-white p-5 transition hover:-translate-y-1 hover:border-[#D8E2D5] hover:shadow-sm"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF0E8] text-[#66836D]">
                  <Icon size={21} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{item.name}</span>
                  <ArrowRight
                    size={17}
                    className="text-[#A6B2A3] transition group-hover:translate-x-1"
                  />
                </div>
              </NavLink>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-[#ECEDE7] bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="mb-1 text-[10px] tracking-[2px] text-[#9A9D95]">
              DAILY CHECKLIST
            </p>
            <h2 className="text-lg font-semibold">今日学习计划</h2>
          </div>
          <CalendarDays className="text-[#899B87]" size={20} />
        </div>

        <div className="mb-5 flex items-center justify-between text-xs">
          <span className="text-[#858B82]">完成进度</span>
          <span className="font-semibold text-[#66836D]">{progress}%</span>
        </div>

        <div className="mb-5 h-2 overflow-hidden rounded-full bg-[#EEF0EA]">
          <div
            className="h-full rounded-full bg-[#819A7D] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="space-y-3">
          {tasks.map((task, index) => {
            const done = completed.includes(index);
            return (
              <button
                key={task}
                onClick={() => toggleTask(index)}
                className="flex w-full items-center gap-3 rounded-xl bg-[#FAFAF7] p-4 text-left hover:bg-[#F3F5EF]"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                    done
                      ? "border-[#819A7D] bg-[#819A7D] text-white"
                      : "border-[#D8DCD3] bg-white"
                  }`}
                >
                  {done && <Check size={13} />}
                </span>
                <span
                  className={`text-sm ${done ? "text-[#A4AAA0] line-through" : ""}`}
                >
                  {task}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Layout() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const location = useLocation();

  const current = navigation.find((item) => item.path === location.pathname);

  return (
    <div className="min-h-screen bg-[#F8F8F5] text-[#353A35]">
      {mobileMenu && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[260px] flex-col overflow-hidden border-r border-[#ECEDE7] bg-white px-5 py-5 transition-transform duration-300 lg:translate-x-0 ${
          mobileMenu ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-5 flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8EFE7] text-[#66836D]">
              <BookOpen size={22} />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Nihongo Lab</h1>
              <p className="text-[10px] tracking-[2px] text-[#999E96]">
                JAPANESE LEARNING
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenu(false)}
            className="p-2 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <p className="mb-3 shrink-0 px-3 text-[11px] tracking-[2px] text-[#A4A79F]">
          LEARNING MENU
        </p>

        <nav className="min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={() => setMobileMenu(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                    isActive
                      ? "bg-[#EAF0E8] font-medium text-[#52745B]"
                      : "text-[#777D75] hover:bg-[#F6F7F3]"
                  }`
                }
              >
                <Icon size={19} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-3 shrink-0 rounded-2xl bg-[#F6F5EF] p-3">
          <p className="text-xs font-medium text-[#8B795E]">Keep learning</p>
          <p className="mt-2 text-sm">毎日少しずつ。</p>
          <p className="mt-1 text-xs leading-5 text-[#929087]">
            每天进步一点点。
          </p>
        </div>

        <button className="mt-2 flex shrink-0 items-center gap-3 px-3 py-2 text-sm text-[#858A82]">
          <Settings size={18} />
          设置
        </button>
      </aside>

      <main className="min-h-screen lg:ml-[260px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#ECEDE7] bg-[#F8F8F5]/95 px-5 backdrop-blur-md sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenu(true)}
              className="rounded-lg p-2 lg:hidden"
            >
              <Menu size={22} />
            </button>
            <div>
              <p className="text-xs text-[#999E96]">Nihongo Lab / Learning</p>
              <p className="text-sm font-semibold">
                {current?.name ?? "学习首页"}
              </p>
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E7EDE4] text-sm font-semibold text-[#66836D]">
            N
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
          <Outlet />
          <footer className="mt-12 border-t border-[#E9EAE4] py-6 text-center">
            <p className="text-xs tracking-widest text-[#A3A69E]">
              Nihongo Lab · 日本語を、毎日の習慣に。
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/vocabulary" element={<VocabularyPage />} />
        {/* <Route path="/grammar" element={<StudyPages type="grammar" />} />
        <Route path="/kanji" element={<StudyPages type="kanji" />} />
        <Route path="/reading" element={<StudyPages type="reading" />} />
        <Route path="/listening" element={<StudyPages type="listening" />} /> */}
        {/* <Route path="/exam" element={<StudyPages type="exam" />} /> */}
        <Route path="/reports" element={<StudyPages type="reports" />} />
        <Route
          path="*"
          element={<div className="rounded-2xl bg-white p-8">页面不存在</div>}
        />
        <Route path="/vocabulary-test" element={<VocabularyServiceTest />} />
        <Route path="/vocabulary-manager" element={<VocabularyManagerPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/grammar" element={<GrammarPage />} />
        <Route path="/kanji" element={<KanjiPage />} />
        <Route path="/reading" element={<ReadingPage />} />
        <Route path="/listening" element={<ListeningPage />} />
        <Route path="/mock-exam" element={<MockExamPage />} />
        <Route path="/report" element={<StudyReportPage />} />
        <Route path="/review-center" element={<UnifiedReviewPage />} />
        <Route path="/data-manager" element={<DataManagerPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
