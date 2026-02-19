"use client";

import { useState, useEffect } from "react";
import { YouTubeVideo, HabitAnalysis, VibeCodingIdea, AnalysisResult } from "@/lib/types";

export default function Dashboard() {
  // === 상태 ===
  const [step, setStep] = useState<"idle" | "videos" | "analyzing" | "done">("idle");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);

  // 분석 결과
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);

  // 사용한 영상 ID (중복 방지)
  const [usedVideoIds, setUsedVideoIds] = useState<string[]>([]);

  // 이메일 발송
  const [sendingEmail, setSendingEmail] = useState(false);

  // 토스트
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // 히스토리 보기
  const [showHistory, setShowHistory] = useState(false);

  // === LocalStorage 로드 ===
  useEffect(() => {
    const savedUsed = localStorage.getItem("used_video_ids_v2");
    if (savedUsed) setUsedVideoIds(JSON.parse(savedUsed));

    const savedHistory = localStorage.getItem("analysis_history_v2");
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // === 1단계: 유튜브 영상 검색 ===
  const searchVideos = async (newOffset: number = 0) => {
    setLoading(true);
    setLoadingMsg("🔍 유튜브에서 유명인 습관 영상을 찾고 있습니다...");
    setStep("videos");
    setSelectedVideo(null);
    setCurrentResult(null);

    try {
      const usedParam = usedVideoIds.join(",");
      const res = await fetch(`/api/youtube?offset=${newOffset}&usedIds=${usedParam}`);
      const data = await res.json();

      if (data.success) {
        setVideos(data.videos);
        setHasMore(data.hasMore);
        setOffset(newOffset);
        showToast(`✅ ${data.count}개 영상을 찾았습니다!`, "success");
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showToast("영상 검색 실패: " + String(err), "error");
      setStep("idle");
    } finally {
      setLoading(false);
    }
  };

  // === 2단계: 영상 선택 → AI 분석 ===
  const analyzeVideo = async (video: YouTubeVideo) => {
    setSelectedVideo(video);
    setLoading(true);
    setLoadingMsg(`🤖 ${video.title.slice(0, 30)}... 분석 중 (Gemini 2.5 Pro)`);
    setStep("analyzing");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video }),
      });

      const data = await res.json();

      if (data.success) {
        const result: AnalysisResult = {
          id: `${video.videoId}_${Date.now()}`,
          video,
          analysis: data.analysis,
          vibeCoding: data.vibeCoding,
          createdAt: new Date().toISOString(),
        };

        setCurrentResult(result);

        // 사용 완료 처리
        const newUsedIds = [...usedVideoIds, video.videoId];
        setUsedVideoIds(newUsedIds);
        localStorage.setItem("used_video_ids_v2", JSON.stringify(newUsedIds));

        // 히스토리 추가
        const newHistory = [result, ...history];
        setHistory(newHistory);
        localStorage.setItem("analysis_history_v2", JSON.stringify(newHistory));

        setStep("done");
        showToast("✅ 분석 완료!", "success");
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showToast("분석 실패: " + String(err), "error");
      setStep("videos");
    } finally {
      setLoading(false);
    }
  };

  // === 이메일 발송 ===
  const sendEmail = async (result: AnalysisResult) => {
    setSendingEmail(true);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("📧 이메일이 발송되었습니다!", "success");
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showToast("이메일 발송 실패: " + String(err), "error");
    } finally {
      setSendingEmail(false);
    }
  };

  // === 클립보드 복사 ===
  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    showToast("📋 프롬프트가 복사되었습니다!", "success");
  };

  const copyFullResult = (result: AnalysisResult) => {
    const { analysis, vibeCoding } = result;
    const stars = "★".repeat(vibeCoding.difficultyLevel) + "☆".repeat(5 - vibeCoding.difficultyLevel);
    const text = `🎯 ${analysis.personName} (${analysis.personTitle})

💡 핵심: ${analysis.coreMessage}

📝 설명: ${analysis.description}

🚀 내 것으로 만드는 법:
${analysis.actionGuide.map((s, i) => `${i + 1}. ${s}`).join("\n")}

📌 적용 예시: ${analysis.example}

🛠 바이브 코딩: ${vibeCoding.appName}
${vibeCoding.description}
난이도: ${stars} (Level ${vibeCoding.difficultyLevel})

💬 AI 프롬프트:
${vibeCoding.prompt}`;
    navigator.clipboard.writeText(text);
    showToast("📋 전체 분석 결과가 복사되었습니다!", "success");
  };

  // === 히스토리 삭제 ===
  const deleteHistory = (id: string) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem("analysis_history_v2", JSON.stringify(newHistory));
    showToast("삭제되었습니다.", "success");
  };

  // 스텝 상태
  const getStepState = (s: string) => {
    const order = ["idle", "videos", "analyzing", "done"];
    const ci = order.indexOf(step);
    const si = order.indexOf(s);
    if (si < ci) return "completed";
    if (si === ci) return "active";
    return "";
  };

  // 난이도 뱃지
  const levelBadge = (level: number) => {
    const colors = ["", "#4ecdc4", "#45b7d1", "#f9ca24", "#ff6b6b", "#e74c3c"];
    const labels = ["", "입문", "초급", "중급", "고급", "전문가"];
    return { color: colors[level] || "#888", label: labels[level] || "" };
  };

  return (
    <div className="container">
      <header className="header">
        <h1>🎯 유명인 습관 멘토링</h1>
        <p>AI가 제안하는 세계 최고들의 습관과 마인드셋을 내 것으로 만드세요</p>
      </header>

      {/* 스텝퍼 */}
      <div className="stepper">
        <div className={`step ${getStepState("videos")}`}>
          <span className="step-number">1</span> 습관 발견
        </div>
        <span className="step-arrow">→</span>
        <div className={`step ${getStepState("analyzing")}`}>
          <span className="step-number">2</span> AI 분석
        </div>
        <span className="step-arrow">→</span>
        <div className={`step ${getStepState("done")}`}>
          <span className="step-number">3</span> 결과 & 실행
        </div>
      </div>

      {/* 액션바 */}
      <div className="action-bar">
        <button className="btn btn-primary" onClick={() => searchVideos(0)} disabled={loading}>
          ✨ AI에게 습관 제안받기
        </button>

        {history.length > 0 && (
          <button
            className="btn"
            onClick={() => setShowHistory(!showHistory)}
            style={{ background: showHistory ? "#764ba2" : "#1f1f35", color: showHistory ? "#fff" : "#888", border: "1px solid #444" }}
          >
            📚 분석 이력 ({history.length})
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
      {/* 1단계: 유튜브 영상 카드 (5개) */}
      {/* =============================== */}
      {videos.length > 0 && !loading && step === "videos" && (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              🎯 오늘의 AI 추천 습관 ({videos.length}개)
            </h2>
            <button
              className="btn"
              onClick={() => searchVideos(offset + 1)}
              disabled={!hasMore || loading}
              style={{ background: "#1f1f35", border: "1px solid #444", color: hasMore ? "#4ecdc4" : "#555" }}
            >
              🔄 새로운 제안 받기
            </button>
          </div>

          <div className="video-grid">
            {videos.map((video) => (
              <div className="video-card" key={video.videoId}>
                <div className="video-thumb-wrap">
                  {video.suggestion && (
                    <div className="suggestion-overlay">
                      <span>💡 {video.suggestion}</span>
                    </div>
                  )}
                  {video.category && (
                    <span className="category-badge">{video.category}</span>
                  )}
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="video-thumbnail"
                  />
                  <span className="video-views">👀 {video.viewCount}회</span>
                </div>

                <div className="video-info">
                  <h3 className="video-title">{video.title}</h3>
                  <p className="video-channel">{video.channelTitle}</p>
                  <p className="video-date">
                    {new Date(video.publishedAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>

                <div className="video-actions">
                  <a
                    href={video.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-link"
                  >
                    ▶ 영상 보기
                  </a>
                  <button
                    className="btn btn-select"
                    onClick={() => analyzeVideo(video)}
                  >
                    🤖 이 영상 분석하기
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p style={{ textAlign: "center", marginTop: 20, color: "#666", fontSize: 14 }}>
            마음에 드는 영상을 선택하면 AI가 습관을 분석하고 바이브 코딩 방법을 제안합니다.
          </p>
        </section>
      )}

      {/* =============================== */}
      {/* 3단계: 분석 결과 */}
      {/* =============================== */}
      {currentResult && !loading && step === "done" && (
        <section className="result-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🎯 분석 결과</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn"
                onClick={() => copyFullResult(currentResult)}
                style={{ background: "#1f1f35", border: "1px solid #444", color: "#ccc" }}
              >
                📋 전체 복사
              </button>
              <button
                className="btn"
                onClick={() => sendEmail(currentResult)}
                disabled={sendingEmail}
                style={{ background: "#2dce89", color: "#fff", border: "none" }}
              >
                {sendingEmail ? "전송 중..." : "📧 메일 발송"}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => searchVideos(offset + 1)}
              >
                🔍 다른 영상 찾기
              </button>
            </div>
          </div>

          {/* 원본 영상 정보 */}
          <div className="result-video-info">
            <img src={currentResult.video.thumbnailUrl} alt="" className="result-thumb" />
            <div>
              <h3 style={{ margin: "0 0 4px", color: "#e0e0ff", fontSize: 16 }}>
                {currentResult.video.title}
              </h3>
              <p style={{ margin: "0 0 4px", color: "#888", fontSize: 13 }}>
                📺 {currentResult.video.channelTitle} · 👀 {currentResult.video.viewCount}회
              </p>
              <a
                href={currentResult.video.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#ff4b4b", fontSize: 13 }}
              >
                영상 보기 →
              </a>
            </div>
          </div>

          {/* 인물 & 핵심 메시지 */}
          <div className="analysis-card">
            <div className="person-header">
              <h2 className="person-name">{currentResult.analysis.personName}</h2>
              <span className="person-title">{currentResult.analysis.personTitle}</span>
            </div>

            <div className="core-message-box">
              <span className="core-icon">💡</span>
              <p className="core-text">&quot;{currentResult.analysis.coreMessage}&quot;</p>
            </div>

            <p className="description-text">{currentResult.analysis.description}</p>
          </div>

          {/* 실행 가이드 */}
          <div className="analysis-card">
            <h3 className="section-title" style={{ color: "#4ecdc4" }}>🚀 내 것으로 만드는 법</h3>

            <div className="action-steps">
              {currentResult.analysis.actionGuide.map((step, i) => (
                <div className="action-step" key={i}>
                  <div className="step-circle">{i + 1}</div>
                  <p className="step-text">{step}</p>
                </div>
              ))}
            </div>

            <div className="example-box">
              <span className="example-label">📌 적용 예시</span>
              <p className="example-text">{currentResult.analysis.example}</p>
            </div>
          </div>

          {/* 바이브 코딩 제안 */}
          <div className="analysis-card vibe-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              <div>
                <h3 className="section-title" style={{ color: "#764ba2", marginBottom: 4 }}>🛠 바이브 코딩 제안</h3>
                <div className="difficulty-badge" style={{ borderColor: levelBadge(currentResult.vibeCoding.difficultyLevel).color }}>
                  <span className="difficulty-stars">
                    {"★".repeat(currentResult.vibeCoding.difficultyLevel)}{"☆".repeat(5 - currentResult.vibeCoding.difficultyLevel)}
                  </span>
                  <span style={{ color: levelBadge(currentResult.vibeCoding.difficultyLevel).color }}>
                    Level {currentResult.vibeCoding.difficultyLevel} ({levelBadge(currentResult.vibeCoding.difficultyLevel).label})
                  </span>
                </div>
              </div>
              <span className="tech-stack">
                {currentResult.vibeCoding.techStack.join(" · ")}
              </span>
            </div>

            <h4 className="app-name">{currentResult.vibeCoding.appName}</h4>
            <p className="app-desc">{currentResult.vibeCoding.description}</p>

            <ul className="feature-list">
              {currentResult.vibeCoding.features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>

            <div className="prompt-box">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span className="prompt-label">💬 AI에 붙여넣기용 프롬프트</span>
                <button
                  className="btn-copy"
                  onClick={() => copyPrompt(currentResult.vibeCoding.prompt)}
                >
                  📋 복사
                </button>
              </div>
              <p className="prompt-text">{currentResult.vibeCoding.prompt}</p>
            </div>
          </div>
        </section>
      )}

      {/* =============================== */}
      {/* 분석 이력 */}
      {/* =============================== */}
      {showHistory && history.length > 0 && (
        <section>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 40, marginBottom: 16 }}>
            📚 분석 이력 ({history.length}개)
          </h2>

          {history.map((result) => {
            const badge = levelBadge(result.vibeCoding.difficultyLevel);
            return (
              <div className="history-card" key={result.id}>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <img src={result.video.thumbnailUrl} alt="" style={{ width: 120, borderRadius: 8, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div>
                        <h4 style={{ margin: "0 0 4px", color: "#667eea", fontSize: 16 }}>{result.analysis.personName}</h4>
                        <p style={{ margin: "0 0 4px", color: "#aaa", fontSize: 13 }}>{result.analysis.personTitle}</p>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button className="btn-copy" onClick={() => copyFullResult(result)}>📋</button>
                        <button className="btn-copy" onClick={() => sendEmail(result)} disabled={sendingEmail}>📧</button>
                        <button className="btn-copy" onClick={() => deleteHistory(result.id)} style={{ color: "#ff6b6b" }}>🗑️</button>
                      </div>
                    </div>
                    <p style={{ margin: "0 0 8px", color: "#e0e0ff", fontSize: 14, fontWeight: 600 }}>
                      💡 {result.analysis.coreMessage}
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span className="badge badge-purple">{result.vibeCoding.appName}</span>
                      <span className="badge" style={{ background: badge.color + "22", color: badge.color, border: `1px solid ${badge.color}44` }}>
                        Level {result.vibeCoding.difficultyLevel}
                      </span>
                      <span style={{ color: "#666", fontSize: 12 }}>
                        {new Date(result.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
