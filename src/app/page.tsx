"use client";

import { useState, useEffect } from "react";
import { HabitSuggestion, AnalysisResult } from "@/lib/types";

export default function Dashboard() {
  // === 상태 ===
  const [step, setStep] = useState<"idle" | "habits" | "analyzing" | "done">("idle");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  // 데이터
  const [habits, setHabits] = useState<HabitSuggestion[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // === 초기 로딩 ===
  useEffect(() => {
    try {
      const saved = localStorage.getItem("analysis_history_v3");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (err) {
      console.error("히스토리 로드 실패:", err);
      // 잘못된 데이터 삭제
      localStorage.removeItem("analysis_history_v3");
    }
  }, []);

  // === 1. 습관 제안 받기 (AI) ===
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
        console.error("API response invalid:", data);
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

  // === 2. 습관 상세 분석 (AI) ===
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
      const data = await res.json();

      if (data.success) {
        setResult(data.result);
        setStep("done");

        // 히스토리 저장
        const newHistory = [data.result, ...history].slice(0, 50);
        setHistory(newHistory);
        localStorage.setItem("analysis_history_v3", JSON.stringify(newHistory));
      } else {
        alert("분석 실패: " + data.error);
        setStep("habits");
      }
    } catch (err) {
      alert("분석 중 에러가 발생했습니다.");
      setStep("habits");
    } finally {
      setLoading(false);
    }
  };

  // === 유틸리티 ===
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    const div = document.createElement("div");
    div.className = `toast toast-${type}`;
    div.innerText = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    showToast("📋 프롬프트가 복사되었습니다!", "success");
  };

  const deleteHistory = (id: string) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem("analysis_history_v3", JSON.stringify(newHistory));
    showToast("삭제되었습니다.", "success");
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
            className="btn"
            onClick={() => setShowHistory(!showHistory)}
            style={{ background: showHistory ? "#764ba2" : "#1f1f35", color: showHistory ? "#fff" : "#888", border: "1px solid #444" }}
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

      {/* =============================== */}
      {/* 1단계: 습관 제안 카드 (Grid) */}
      {/* =============================== */}
      {habits.length > 0 && !loading && step === "habits" && (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              💡 추천 습관 ({habits.length}개)
            </h2>
            <button
              className="btn"
              onClick={fetchHabits}
              disabled={loading}
              style={{ background: "#1f1f35", border: "1px solid #444", color: "#4ecdc4" }}
            >
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

      {/* =============================== */}
      {/* 3단계: 분석 결과 (Detail + Vibe Coding) */}
      {/* =============================== */}
      {result && step === "done" && !loading && (
        <div className="result-container fade-in">
          <button className="btn-back" onClick={() => setStep("habits")}>
            ← 목록으로 돌아가기
          </button>

          <div className="result-header">
            <h2 className="result-title">
              <span className="highlight">{result.suggestion.person}</span>의 {result.suggestion.title}
            </h2>
            <p className="core-message">" {result.detail.coreMessage} "</p>
          </div>

          <div className="result-content">
            {/* 왼쪽: 습관 분석 보고서 */}
            <div className="analysis-card">
              <div className="card-header">
                <h3>📊 습관 분석 보고서</h3>
              </div>
              <div className="card-body">
                <div className="section">
                  <h4>📝 상세 설명</h4>
                  <p className="description-text">{result.detail.description}</p>
                </div>

                <div className="section">
                  <h4>🚀 3단계 실천 가이드</h4>
                  <ul className="action-list">
                    {result.detail.actionGuide.map((step, idx) => (
                      <li key={idx} className="action-item">
                        <span className="step-idx">Step {idx + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="section">
                  <h4>📌 적용 예시</h4>
                  <div className="example-box">
                    {result.detail.example}
                  </div>
                </div>
              </div>
            </div>

            {/* 오른쪽: 바이브 코딩 */}
            <div className="vibe-card">
              <div className="card-header vibe-header">
                <h3>🛠 바이브 코딩 아이디어</h3>
                <span className="badge">Level {result.vibeCoding.difficultyLevel}</span>
              </div>
              <div className="card-body">
                <h4 className="app-name">{result.vibeCoding.appName}</h4>
                <p className="app-desc">{result.vibeCoding.description}</p>

                <div className="feature-list">
                  {result.vibeCoding.features.map((feat, i) => (
                    <span key={i} className="feature-tag">✔ {feat}</span>
                  ))}
                </div>

                <div className="tech-stack">
                  {result.vibeCoding.techStack.map((tech, i) => (
                    <span key={i} className="tech-tag">{tech}</span>
                  ))}
                </div>

                <div className="prompt-box">
                  <pre>{result.vibeCoding.prompt}</pre>
                  <button className="btn-copy" onClick={() => copyPrompt(result.vibeCoding.prompt)}>
                    📋 프롬프트 복사
                  </button>
                  <p className="prompt-help">
                    위 프롬프트를 복사해서 <strong>Cursor</strong>나 <strong>Bolt.new</strong>에 붙여넣으세요.
                    단 몇 초 만에 나만의 습관 도구가 만들어집니다!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 히스토리 모달 (디자인 재활용) */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📚 나의 습관 노트</h2>
              <button className="btn-close" onClick={() => setShowHistory(false)}>✕</button>
            </div>
            <div className="history-list">
              {history.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-info" onClick={() => { setResult(item); setStep("done"); setShowHistory(false); }}>
                    <h4>[{item.suggestion.person}] {item.suggestion.title}</h4>
                    <p>{item.detail.coreMessage}</p>
                    <span className="date">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  <button className="btn-delete" onClick={(e) => { e.stopPropagation(); deleteHistory(item.id); }}>
                    삭제
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
