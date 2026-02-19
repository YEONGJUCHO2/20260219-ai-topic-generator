"use client";

import { useState, useEffect } from "react";
import { HabitSuggestion, AnalysisResult } from "@/lib/types";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"idle" | "habits" | "analyzing" | "done">("idle");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  const [habits, setHabits] = useState<HabitSuggestion[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Hydration 방지
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("analysis_history_v3");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch {
      localStorage.removeItem("analysis_history_v3");
    }
  }, []);

  if (!mounted) return null;

  // === 1. 습관 제안 ===
  const fetchHabits = async () => {
    setLoading(true);
    setLoadingMsg("AI가 당신을 위한 최고의 습관을 찾고 있습니다...");
    setStep("habits");
    setResult(null);

    try {
      const res = await fetch(`/api/suggest?t=${Date.now()}`);
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.habits)) {
        setHabits(data.habits);
      } else {
        alert("습관을 불러오는데 실패했습니다.");
        setHabits([]);
      }
    } catch (err) {
      console.error("Fetch failed:", err);
      alert("네트워크 에러가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setHabits([]);
    } finally {
      setLoading(false);
    }
  };

  // === 2. 습관 분석 ===
  const analyzeHabit = async (habit: HabitSuggestion) => {
    setLoading(true);
    setLoadingMsg(`"${habit.title}" 습관을 분석하여 실천 가이드를 만들고 있습니다...`);
    setStep("analyzing");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habit }),
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();

      if (data.success && data.result) {
        // 안전하게 데이터 정규화
        const safeResult: AnalysisResult = {
          id: data.result.id || String(Date.now()),
          suggestion: data.result.suggestion || habit,
          detail: {
            personName: data.result.detail?.personName || habit.person,
            personTitle: data.result.detail?.personTitle || habit.category,
            coreMessage: data.result.detail?.coreMessage || "핵심 메시지를 생성하지 못했습니다.",
            description: data.result.detail?.description || "설명을 생성하지 못했습니다.",
            actionGuide: Array.isArray(data.result.detail?.actionGuide)
              ? data.result.detail.actionGuide.map((i: any) => typeof i === 'string' ? i : JSON.stringify(i))
              : [],
            example: data.result.detail?.example || "예시를 생성하지 못했습니다.",
            difficulty: data.result.detail?.difficulty || habit.difficulty,
          },
          vibeCoding: {
            appName: data.result.vibeCoding?.appName || "습관 앱",
            description: data.result.vibeCoding?.description || "습관을 도와주는 앱",
            features: Array.isArray(data.result.vibeCoding?.features)
              ? data.result.vibeCoding.features.map((i: any) => typeof i === 'string' ? i : JSON.stringify(i))
              : [],
            techStack: Array.isArray(data.result.vibeCoding?.techStack)
              ? data.result.vibeCoding.techStack.map((i: any) => typeof i === 'string' ? i : JSON.stringify(i))
              : [],
            difficultyLevel: data.result.vibeCoding?.difficultyLevel || 2,
            prompt: data.result.vibeCoding?.prompt || "습관 앱을 만들어주세요.",
          },
          createdAt: data.result.createdAt || new Date().toISOString(),
        };

        setResult(safeResult);
        setStep("done");

        const newHistory = [safeResult, ...history].slice(0, 50);
        setHistory(newHistory);
        localStorage.setItem("analysis_history_v3", JSON.stringify(newHistory));
      } else {
        alert("분석 실패: " + (data.error || "알 수 없는 에러"));
        setStep("habits");
      }
    } catch (err) {
      console.error("Analyze failed:", err);
      alert("분석 중 에러가 발생했습니다. 다시 시도해주세요.");
      setStep("habits");
    } finally {
      setLoading(false);
    }
  };

  // === 유틸리티 ===
  const showToast = (msg: string) => {
    const div = document.createElement("div");
    div.className = "toast toast-success";
    div.innerText = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    showToast("📋 프롬프트가 복사되었습니다!");
  };

  const deleteHistory = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem("analysis_history_v3", JSON.stringify(updated));
    showToast("삭제되었습니다.");
  };

  const getStepState = (s: string) => {
    const order = ["idle", "habits", "analyzing", "done"];
    const ci = order.indexOf(step);
    const si = order.indexOf(s);
    if (si < ci) return "completed";
    if (si === ci) return "active";
    return "";
  };

  return (
    <div className="container">
      <header className="header">
        <h1>🎯 유명인 습관 멘토링</h1>
        <p>AI가 제안하는 세계 최고들의 습관과 마인드셋을 내 것으로 만드세요</p>
      </header>

      {/* 스텝퍼 */}
      <div className="stepper">
        <div className={`step ${getStepState("habits")}`}>
          <span className="step-number">1</span> 습관 발견
        </div>
        <span className="step-arrow">→</span>
        <div className={`step ${getStepState("analyzing")}`}>
          <span className="step-number">2</span> AI 코칭
        </div>
        <span className="step-arrow">→</span>
        <div className={`step ${getStepState("done")}`}>
          <span className="step-number">3</span> 실천하기
        </div>
      </div>

      {/* 액션바 */}
      <div className="action-bar">
        <button className="btn btn-primary" onClick={fetchHabits} disabled={loading}>
          ✨ AI에게 습관 제안받기
        </button>
        {history.length > 0 && (
          <button
            className={`btn btn-history ${showHistory ? "active" : ""}`}
            onClick={() => setShowHistory(!showHistory)}
          >
            📚 나의 습관 노트 ({history.length})
          </button>
        )}
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="loading-container">
          <div className="spinner" />
          <p className="loading-text">{loadingMsg}</p>
        </div>
      )}

      {/* === 1단계: 습관 카드 === */}
      {habits.length > 0 && !loading && step === "habits" && (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              💡 추천 습관 ({habits.length}개)
            </h2>
            <button className="btn btn-refresh" onClick={fetchHabits} disabled={loading}>
              🔄 새로운 제안 받기
            </button>
          </div>
          <div className="habit-grid">
            {habits.map((habit) => (
              <div className="habit-card" key={habit.id} onClick={() => analyzeHabit(habit)}>
                <div>
                  <div className="habit-person">{habit.person}</div>
                  <h3 className="habit-title">{habit.title}</h3>
                  <p className="habit-desc">{habit.description}</p>
                </div>
                <div className="habit-meta">
                  <span className="habit-category">🏷️ {habit.category}</span>
                  <span className={`difficulty-badge difficulty-${habit.difficulty}`}>
                    {habit.difficulty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* === 3단계: 분석 결과 === */}
      {result && step === "done" && !loading && (
        <div className="result-container fade-in">
          <button className="btn-back" onClick={() => setStep("habits")}>
            ← 목록으로 돌아가기
          </button>

          <div className="result-header">
            <h2 className="result-title">
              <span className="highlight">{result.suggestion?.person || "인물"}</span>의 {result.suggestion?.title || "습관"}
            </h2>
            <p className="core-message">&quot; {result.detail?.coreMessage || ""} &quot;</p>
          </div>

          <div className="result-content">
            {/* 습관 분석 보고서 */}
            <div className="analysis-card">
              <div className="card-header"><h3>📊 습관 분석 보고서</h3></div>
              <div className="card-body">
                <div className="section">
                  <h4>📝 상세 설명</h4>
                  <p className="description-text">{result.detail?.description || ""}</p>
                </div>
                <div className="section">
                  <h4>🚀 3단계 실천 가이드</h4>
                  <ul className="action-list">
                    {(result.detail?.actionGuide || []).map((s, i) => (
                      <li key={i} className="action-item">
                        <span className="step-idx">Step {i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="section">
                  <h4>📌 적용 예시</h4>
                  <div className="example-box">{result.detail?.example || ""}</div>
                </div>
              </div>
            </div>

            {/* 바이브 코딩 */}
            <div className="vibe-card">
              <div className="card-header vibe-header">
                <h3>🛠 바이브 코딩 아이디어</h3>
                <span className="badge">Level {result.vibeCoding?.difficultyLevel || "?"}</span>
              </div>
              <div className="card-body">
                <h4 className="app-name">{result.vibeCoding?.appName || "앱"}</h4>
                <p className="app-desc">{result.vibeCoding?.description || ""}</p>
                <div className="feature-list">
                  {(result.vibeCoding?.features || []).map((feat, i) => (
                    <span key={i} className="feature-tag">✔ {feat}</span>
                  ))}
                </div>
                <div className="tech-stack">
                  {(result.vibeCoding?.techStack || []).map((tech, i) => (
                    <span key={i} className="tech-tag">{tech}</span>
                  ))}
                </div>
                <div className="prompt-box">
                  <pre>{result.vibeCoding?.prompt || ""}</pre>
                  <button className="btn-copy" onClick={() => copyPrompt(result.vibeCoding?.prompt || "")}>
                    📋 프롬프트 복사
                  </button>
                  <p className="prompt-help">
                    위 프롬프트를 복사해서 <strong>Cursor</strong>나 <strong>Bolt.new</strong>에 붙여넣으세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === 모달: 나의 습관 노트 === */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📚 나의 습관 노트</h2>
              <button className="modal-close" onClick={() => setShowHistory(false)}>✕</button>
            </div>
            <div className="modal-body">
              {history.length === 0 && (
                <p style={{ textAlign: "center", color: "#888", padding: 40 }}>저장된 습관이 없습니다.</p>
              )}
              {history.map((item) => (
                <div key={item.id} className="note-card">
                  <div className="note-card-content" onClick={() => { setResult(item); setStep("done"); setShowHistory(false); }}>
                    <div className="note-person">{item.suggestion?.person || "인물"}</div>
                    <h4 className="note-title">{item.suggestion?.title || "습관"}</h4>
                    <p className="note-message">&quot;{item.detail?.coreMessage || ""}&quot;</p>
                    <div className="note-footer">
                      <span className="note-category">🏷️ {item.suggestion?.category || ""}</span>
                      <span className="note-date">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("ko-KR") : ""}</span>
                    </div>
                  </div>
                  <button className="note-delete" onClick={(e) => { e.stopPropagation(); deleteHistory(item.id); }}>
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
