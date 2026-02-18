"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { TrendItem, MatchResult, VideoIdea } from "@/lib/types";

// 개별 프롬프트 입력을 위한 로컬 타입
type MatchWithPrompt = MatchResult & {
  customPrompt?: string;
  isGenerating?: boolean; // 로딩 중 여부
};

export default function Dashboard() {
  // step: idle -> trends -> matching -> generating(표시용) -> done
  const [step, setStep] = useState<"idle" | "trends" | "matching" | "done">("idle");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [matches, setMatches] = useState<MatchWithPrompt[]>([]);
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [deletedIdeas, setDeletedIdeas] = useState<VideoIdea[]>([]);

  // 페이징 상태: 현재까지 매칭한 트렌드 인덱스
  const [matchIndex, setMatchIndex] = useState(0);

  // 이메일 발송 중 상태
  const [sendingEmailIndex, setSendingEmailIndex] = useState<number | null>(null);

  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // ===== 필터 및 정렬 상태 =====
  const [filterKeyword, setFilterKeyword] = useState<string>("all");
  const [filterLevel, setFilterLevel] = useState<"all" | 1 | 2>("all");
  const [filterStatus, setFilterStatus] = useState<"active" | "used">("active");
  const [ideaTab, setIdeaTab] = useState<"active" | "deleted">("active");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // ===== 사용 완료 도구 관리 (Local Storage) =====
  const [usedTools, setUsedTools] = useState<string[]>([]);

  useEffect(() => {
    const savedTools = localStorage.getItem("used_tools");
    if (savedTools) setUsedTools(JSON.parse(savedTools));

    const savedDeleted = localStorage.getItem("deleted_ideas");
    if (savedDeleted) setDeletedIdeas(JSON.parse(savedDeleted));
  }, []);

  const markAsUsed = (titanName: string, methodology: string) => {
    const key = `${titanName}|${methodology}`;
    const newUsed = [...usedTools, key];
    setUsedTools(newUsed);
    localStorage.setItem("used_tools", JSON.stringify(newUsed));
    showToast("사용 완료 처리되었습니다! (목록에서 이동됨)", "success");
  };

  const restoreTool = (titanName: string, methodology: string) => {
    const key = `${titanName}|${methodology}`;
    const newUsed = usedTools.filter(k => k !== key);
    setUsedTools(newUsed);
    localStorage.setItem("used_tools", JSON.stringify(newUsed));
    showToast("다시 복구되었습니다!", "success");
  };

  // ===== 기획안 삭제 및 복구 =====
  const deleteIdea = (index: number) => {
    const target = ideas[index];
    const newIdeas = ideas.filter((_, i) => i !== index);
    const newDeleted = [target, ...deletedIdeas];

    setIdeas(newIdeas);
    setDeletedIdeas(newDeleted);
    localStorage.setItem("deleted_ideas", JSON.stringify(newDeleted));

    showToast("기획안이 휴지통으로 이동되었습니다.", "success");
  };

  const restoreIdea = (index: number) => {
    const target = deletedIdeas[index];
    const newDeleted = deletedIdeas.filter((_, i) => i !== index);
    const newIdeas = [target, ...ideas]; // 맨 앞에 복구

    setDeletedIdeas(newDeleted);
    setIdeas(newIdeas);
    localStorage.setItem("deleted_ideas", JSON.stringify(newDeleted));
    showToast("기획안이 복구되었습니다!", "success");
  };

  // ===== 이메일 발송 =====
  const sendIdeaEmail = async (idea: VideoIdea, index: number) => {
    setSendingEmailIndex(index);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("이메일이 성공적으로 발송되었습니다! 📧", "success");
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showToast("이메일 발송 실패: " + String(err), "error");
    } finally {
      setSendingEmailIndex(null);
    }
  };

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ===== 1단계: 트렌드 수집 =====
  const collectTrends = useCallback(async () => {
    setLoading(true);
    setLoadingMsg("네이버(경제/부동산 포함) + Google Trends 데이터 수집 중...");
    setStep("trends");
    setMatchIndex(0); // 트렌드 새로 수집하면 인덱스도 초기화
    try {
      const res = await fetch("/api/trends");
      const data = await res.json();
      if (data.success) {
        setTrends(data.trends);
        showToast(`${data.count}개 트렌드 수집 완료!`, "success");
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showToast("트렌드 수집 실패: " + String(err), "error");
      setStep("idle");
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== 2단계: 전문가 매칭 (페이징: 5개씩) =====
  const matchExperts = useCallback(async () => {
    if (trends.length === 0) return;

    // 다음 5개 트렌드 가져오기
    const targetTrends = trends.slice(matchIndex, matchIndex + 5);
    if (targetTrends.length === 0) {
      showToast("더 이상 매칭할 트렌드가 없습니다.", "error");
      return;
    }

    setLoading(true);
    setLoadingMsg(`상위 ${matchIndex + 1}~${matchIndex + targetTrends.length}위 트렌드 매칭 중... (약 15초 소요)`);
    setStep("matching");

    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // API는 받은 트렌드 개수만큼만 처리하도록 수정됨
        body: JSON.stringify({ trends: targetTrends }),
      });

      const data = await res.json();
      if (data.success) {
        const newMatches = data.matches.map((m: MatchResult) => ({ ...m, customPrompt: "" }));

        // 기존 매칭 결과에 추가 (append) - 중복은 useMemo에서 제거됨
        setMatches(prev => [...prev, ...newMatches]);
        setMatchIndex(prev => prev + 5); // 인덱스 증가

        showToast(`✅ ${newMatches.length}개 추가 매칭 완료!`, "success");
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showToast("매칭 실패: " + String(err), "error");
    } finally {
      setLoading(false);
    }
  }, [trends, matchIndex]);

  // ===== 개별 기획안 생성 =====
  const generateSingleIdea = async (match: MatchWithPrompt) => {
    setMatches(prev => prev.map(m =>
      (m.titan.name === match.titan.name && m.trend.keyword === match.trend.keyword)
        ? { ...m, isGenerating: true } : m
    ));

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match,
          customPrompt: match.customPrompt
        }),
      });
      const data = await res.json();
      if (data.success && data.ideas.length > 0) {
        const newIdea = data.ideas[0];
        setIdeas(prev => [newIdea, ...prev]);
        markAsUsed(match.titan.name, match.titan.methodology);
        setStep("done");
        showToast("기획안이 생성되었습니다! (매칭 카드는 사용 완료됨)", "success");
      } else {
        throw new Error(data.error || "생성 실패");
      }
    } catch (err) {
      showToast("기획안 생성 중 오류: " + String(err), "error");
    } finally {
      setMatches(prev => prev.map(m =>
        (m.titan.name === match.titan.name && m.trend.keyword === match.trend.keyword)
          ? { ...m, isGenerating: false } : m
      ));
    }
  };

  // ===== 기획안 복사 =====
  const copyIdea = (idea: VideoIdea) => {
    const text = `📊 영상 기획안\n\n🔥 트렌드: ${idea.trend}\n🧠 전문가: ${idea.titanName}\n\n🎬 제목안:\n${idea.titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n🖼 썸네일: ${idea.thumbnailText}\n💬 후킹: "${idea.hookingPhrase}"\n\n📺 관련 영상: ${idea.relatedYoutube?.title || '-'}\n📚 추천 도서: ${idea.relatedBook?.title || '-'}\n\n🛠 도구: ${idea.toolConcept.name} (Level ${idea.toolConcept.level})\n${idea.toolConcept.description}`;
    navigator.clipboard.writeText(text);
    showToast("클립보드에 복사되었습니다!", "success");
  };

  // ===== 필터링 및 정렬 =====
  const filteredMatches = useMemo(() => {
    // 1. 중복 제거
    const uniqueMap = new Map<string, MatchWithPrompt>();
    matches.forEach((m) => {
      const key = `${m.titan.name}|${m.titan.methodology}`;
      const existing = uniqueMap.get(key);
      if (!existing || m.relevanceScore > existing.relevanceScore) {
        uniqueMap.set(key, m);
      }
    });
    const uniqueMatches = Array.from(uniqueMap.values());

    let result = uniqueMatches.filter((m) => {
      const key = `${m.titan.name}|${m.titan.methodology}`;
      const isUsed = usedTools.includes(key);

      if (filterStatus === "active" && isUsed) return false;
      if (filterStatus === "used" && !isUsed) return false;
      if (filterKeyword !== "all" && m.trend.keyword !== filterKeyword) return false;
      if (filterLevel !== "all" && m.titan.toolLevel !== filterLevel) return false;

      return true;
    });

    return result.sort((a, b) => {
      if (sortOrder === "desc") return b.relevanceScore - a.relevanceScore;
      return a.relevanceScore - b.relevanceScore;
    });
  }, [matches, filterKeyword, filterLevel, filterStatus, sortOrder, usedTools]);

  const getStepState = (s: string) => {
    const order = ["idle", "trends", "matching", "done"];
    const currentIdx = order.indexOf(step);
    const sIdx = order.indexOf(s);
    if (sIdx < currentIdx) return "completed";
    if (sIdx === currentIdx) return "active";
    return "";
  };

  const getCategoryBadge = (category: string) => {
    const map: Record<string, string> = {
      "학습/시험": "badge-blue",
      "비즈니스/창업": "badge-orange",
      "경제/재테크": "badge-orange",
      "멘탈/자기관리": "badge-green",
      "생산성/효율": "badge-cyan",
      "커리어/의사결정": "badge-purple",
      "습관 형성": "badge-pink",
    };
    return map[category] || "badge-purple";
  };

  const displayedIdeas = ideaTab === "active" ? ideas : deletedIdeas;

  return (
    <div className="container">
      <header className="header">
        <h1>🚀 AI 주제추천 에이전트</h1>
        <p>한국 트렌드 분석 → 전문가 매칭 → 기획안 개별 생성 (자동화)</p>
      </header>

      {/* 스텝퍼 */}
      <div className="stepper">
        <div className={`step ${getStepState("trends")}`}>
          <span className="step-number">1</span> 트렌드 수집
        </div>
        <span className="step-arrow">→</span>
        <div className={`step ${getStepState("matching")}`}>
          <span className="step-number">2</span> 전문가 매칭
        </div>
        <span className="step-arrow">→</span>
        <div className={`step ${getStepState("done")}`}>
          <span className="step-number">3</span> 개별 생성 및 완료
        </div>
      </div>

      {/* 액션바 */}
      <div className="action-bar">
        <button className="btn btn-primary" onClick={collectTrends} disabled={loading}>
          📡 트렌드 수집
        </button>

        {/* 페이징 버튼 */}
        <button
          className="btn btn-primary"
          onClick={matchExperts}
          disabled={loading || trends.length === 0 || matchIndex >= trends.length}
          style={{
            background: matches.length > 0 ? '#4ecdc4' : '',
            color: matches.length > 0 ? '#000' : ''
          }}
        >
          {loading
            ? "매칭 중..."
            : matches.length === 0
              ? "🧠 상위 5개 트렌드 매칭"
              : matchIndex >= trends.length
                ? "✨ 모든 트렌드 확인 완료"
                : `🔄 다음 5개 트렌드 매칭 (${matchIndex + 1}~${Math.min(matchIndex + 5, trends.length)}위)`
          }
        </button>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="spinner" />
          <p className="loading-text">{loadingMsg}</p>
        </div>
      )}

      {/* 트렌드 표시 */}
      {trends.length > 0 && !loading && step === "trends" && (
        <section>
          <h2>📊 수집된 트렌드 ({trends.length}개)</h2>
          <div className="trend-grid">
            {trends.map((t, i) => (
              <div className="card" key={i}>
                <div className="trend-keyword">{t.keyword}</div>
                <div className="trend-meta">
                  <span className={`badge ${getCategoryBadge(t.category)}`}>{t.category}</span>
                  <span className="trend-score">{t.score}점</span>
                </div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>
            ▲ 위 트렌드를 바탕으로 [전문가 매칭] 버튼을 눌러주세요.
          </p>
        </section>
      )}

      {/* 매칭 결과 리스트 */}
      {matches.length > 0 && !loading && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, paddingLeft: 4 }}>
              🧠 전문가 매칭 ({filteredMatches.length}개) <span style={{ fontSize: 14, fontWeight: 400, color: '#888' }}>{filterStatus === 'used' ? '(사용 완료 목록)' : ''}</span>
            </h2>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                <option value="active">✅ 사용 가능</option>
                <option value="used">🏁 사용 완료</option>
              </select>
              <select className="filter-select" value={filterKeyword} onChange={(e) => setFilterKeyword(e.target.value)}>
                <option value="all">모든 키워드</option>
                {Array.from(new Set(matches.map(m => m.trend.keyword))).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <select
                className="filter-select"
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value === "all" ? "all" : Number(e.target.value) as 1 | 2)}
              >
                <option value="all">모든 Level</option>
                <option value="1">Level 1 (초급)</option>
                <option value="2">Level 2 (중급)</option>
              </select>
            </div>
          </div>

          {filteredMatches.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', color: '#888', background: '#ffffff05', borderRadius: 12 }}>
              {filterStatus === 'active' ? "모든 항목을 사용하셨거나 조건에 맞는 결과가 없습니다." : "사용 완료된 항목이 없습니다."}
            </div>
          )}

          {filteredMatches.map((match) => (
            <div
              className={`card match-card ${match.titan.source === "ai_discovered" ? "ai-discovered" : ""}`}
              key={`${match.titan.name}|${match.trend.keyword}`}
              style={{ opacity: filterStatus === 'used' ? 0.6 : 1 }}
            >
              {match.isGenerating && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
                  <div className="spinner" style={{ width: 30, height: 30, border: '3px solid #667eea', borderTopColor: 'transparent' }} />
                  <p style={{ color: 'white', marginTop: 10, fontWeight: 600 }}>기획안 생성 중...</p>
                </div>
              )}

              {/* 복구 버튼 (사용 완료 탭에서만 보임) */}
              {filterStatus === 'used' && (
                <button onClick={() => restoreTool(match.titan.name, match.titan.methodology)}
                  style={{ position: 'absolute', top: 16, right: 16, padding: '6px 12px', background: '#4ecdc4', color: '#000', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
                  ↩️ 복구하기
                </button>
              )}

              <div className="card-header">
                <div>
                  <div className="card-title">{match.titan.name} — {match.titan.methodology}</div>
                  <div className="card-subtitle">{match.titan.nameEn} | {match.titan.methodologyEn}</div>
                </div>
                <div style={{ marginRight: filterStatus === 'used' ? 80 : 0 }}>
                  <span className="trend-score" style={{ fontSize: 22 }}>{match.relevanceScore}</span>
                </div>
              </div>

              <div className="trend-meta" style={{ marginBottom: 12 }}>
                <span className="badge badge-purple">🔥 {match.trend.keyword}</span>
                <span className={`badge ${getCategoryBadge(match.trend.category)}`}>{match.trend.category}</span>
                <span className="badge badge-cyan">Level {match.titan.toolLevel || 1}</span>
              </div>

              <div className="reasoning">{match.reasoning}</div>

              {/* 논문/뉴스 섹션 */}
              <div style={{ marginTop: 16 }}>
                {match.papers && match.papers.length > 0 ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-cyan)", marginBottom: 8 }}>
                      📄 관련 논문 ({match.papers.length}편)
                    </div>
                    {match.papers.slice(0, 3).map((paper, j) => (
                      <div className="paper-item" key={j}>
                        <div className="paper-title">{paper.title}</div>
                        <div className="paper-meta">
                          {paper.authors.slice(0, 3).join(", ")}
                          {paper.authors.length > 3 ? " et al." : ""} · {paper.year} · 인용 {paper.citationCount}회
                        </div>
                        {paper.url && (
                          <a href={paper.url} target="_blank" rel="noopener noreferrer" className="paper-link">
                            논문 보기 →
                          </a>
                        )}
                      </div>
                    ))}
                  </>
                ) : match.news && match.news.length > 0 ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#ff6b6b", marginBottom: 8 }}>
                      📰 관련 보도자료 ({match.news.length}건)
                    </div>
                    {match.news.slice(0, 3).map((news, j) => (
                      <div className="paper-item" key={j} style={{ borderLeftColor: '#ff6b6b' }}>
                        <div className="paper-title" dangerouslySetInnerHTML={{ __html: news.title }} />
                        <div className="paper-meta">
                          {new Date(news.pubDate).toLocaleDateString()}
                        </div>
                        <a href={news.originallink || news.link} target="_blank" rel="noopener noreferrer" className="paper-link" style={{ color: '#ff8787' }}>
                          기사 보기 →
                        </a>
                      </div>
                    ))}
                  </>
                ) : null}
              </div>

              {/* === 프롬프트 입력 및 생성 버튼 === */}
              {filterStatus === 'active' && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #333' }}>
                  <textarea
                    placeholder="[선택] 추가 요청사항 입력 (예: 초등학생 타겟, 쉽고 재미있게, 쇼츠용 짧은 호흡 등)"
                    value={match.customPrompt}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMatches(prev => prev.map(p =>
                        (p.titan.name === match.titan.name && p.trend.keyword === match.trend.keyword)
                          ? { ...p, customPrompt: val } : p
                      ));
                    }}
                    style={{
                      width: '100%', height: 60, background: '#0d0d1a', border: '1px solid #444',
                      borderRadius: 8, color: '#eee', padding: 10, fontSize: 13, marginBottom: 10, resize: 'none'
                    }}
                  />
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}
                    onClick={() => generateSingleIdea(match)}
                  >
                    🎬 이 전문가로 기획안 생성 (자동 사용완료 처리)
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* ===== 생성된 기획안 리스트 ===== */}
      {(ideas.length > 0 || deletedIdeas.length > 0) && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              🎬 생성된 기획안 ({ideaTab === 'active' ? ideas.length : deletedIdeas.length}개)
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setIdeaTab('active')}
                style={{
                  padding: '6px 12px', borderRadius: 20,
                  background: ideaTab === 'active' ? '#667eea' : '#1f1f35',
                  color: ideaTab === 'active' ? 'white' : '#888',
                  border: '1px solid #444', cursor: 'pointer'
                }}
              >
                활성
              </button>
              <button
                onClick={() => setIdeaTab('deleted')}
                style={{
                  padding: '6px 12px', borderRadius: 20,
                  background: ideaTab === 'deleted' ? '#ff6b6b' : '#1f1f35',
                  color: ideaTab === 'deleted' ? 'white' : '#888',
                  border: '1px solid #444', cursor: 'pointer'
                }}
              >
                휴지통 ({deletedIdeas.length})
              </button>
            </div>
          </div>

          {displayedIdeas.map((idea, i) => (
            <div className="idea-card" key={i} style={{ position: "relative", opacity: ideaTab === 'deleted' ? 0.7 : 1 }}>
              {/* 우상단 버튼 그룹 */}
              <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
                {/* 이메일 발송 버튼 (활성 탭에만 표시) */}
                {ideaTab === 'active' && (
                  <button
                    className="copy-btn"
                    onClick={() => sendIdeaEmail(idea, i)}
                    style={{ position: 'static', background: sendingEmailIndex === i ? '#555' : '#2dce89', color: 'white', border: 'none' }}
                    disabled={sendingEmailIndex === i}
                  >
                    {sendingEmailIndex === i ? "전송 중..." : "📧 메일"}
                  </button>
                )}

                <button className="copy-btn" onClick={() => copyIdea(idea)} style={{ position: 'static' }}>📋 복사</button>

                {ideaTab === 'active' ? (
                  <button
                    onClick={() => deleteIdea(i)}
                    className="copy-btn"
                    style={{ position: 'static', background: '#333', color: '#ff6b6b', border: '1px solid #555' }}
                  >
                    🗑️ 삭제
                  </button>
                ) : (
                  <button
                    onClick={() => restoreIdea(i)}
                    className="copy-btn"
                    style={{ position: 'static', background: '#4ecdc4', color: '#000', border: 'none' }}
                  >
                    ↩️ 복구
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", paddingRight: 180 }}>
                <span className="badge badge-purple">{idea.titanName}</span>
                <span className="badge badge-cyan">{idea.methodology}</span>
                <span className="badge badge-orange">Level {idea.toolConcept.level}</span>
              </div>

              <div className="card-title" style={{ fontSize: 20, marginBottom: 4 }}>
                🔥 {idea.trend}
              </div>

              <div className="idea-titles">
                {idea.titles.map((t, j) => (
                  <div className="idea-title-item" key={j}>
                    {j + 1}. {t}
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: "var(--gradient-primary)",
                  borderRadius: 12,
                  padding: "20px 24px",
                  textAlign: "center",
                  fontSize: 24,
                  fontWeight: 800,
                  color: "white",
                  marginBottom: 16,
                  letterSpacing: "-0.5px",
                }}
              >
                🖼 {idea.thumbnailText}
              </div>

              <div className="hooking-box">
                <div className="hooking-label">💬 후킹 문구</div>
                <div className="hooking-text">&quot;{idea.hookingPhrase}&quot;</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {idea.relatedYoutube && (
                  <a href={idea.relatedYoutube.url} target="_blank" rel="noopener noreferrer" className="content-link-box" style={{
                    background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit',
                    transition: 'transform 0.2s', cursor: 'pointer'
                  }}>
                    <div style={{ fontSize: 24 }}>📺</div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: 12, color: '#ff4b4b', fontWeight: 700 }}>관련 영상</div>
                      <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{idea.relatedYoutube.title}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{idea.relatedYoutube.channel}</div>
                    </div>
                  </a>
                )}
                {idea.relatedBook && (
                  <div className="content-link-box" style={{
                    background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 12
                  }}>
                    <div style={{ fontSize: 24 }}>📚</div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: 12, color: '#4ecdc4', fontWeight: 700 }}>추천 도서</div>
                      <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{idea.relatedBook.title}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{idea.relatedBook.author}</div>
                    </div>
                  </div>
                )}
              </div>

              {idea.paperCitation && (
                <div className="paper-citation">📄 {idea.paperCitation}</div>
              )}

              <div className="tool-box">
                <div className="tool-name">
                  🛠 {idea.toolConcept.name} (Level {idea.toolConcept.level})
                </div>
                <div className="tool-desc">{idea.toolConcept.description}</div>
                <ul className="tool-features">
                  {idea.toolConcept.features.map((f, k) => (
                    <li key={k}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </section>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
