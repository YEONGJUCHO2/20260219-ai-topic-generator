// =============================================
// Gmail 이메일 발송 (v3 — 습관 코칭 리포트)
// =============================================
import nodemailer from 'nodemailer';
import { AnalysisResult } from './types';

export async function sendAnalysisEmail(
  result: AnalysisResult
): Promise<boolean> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const recipient = process.env.EMAIL_RECIPIENT;

  if (!user || !pass || !recipient) {
    console.warn('[이메일] Gmail 설정이 없습니다. 이메일 발송을 건너뜁니다.');
    throw new Error('이메일 환경변수(GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_RECIPIENT)를 설정해주세요.');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });

  const { suggestion, detail, vibeCoding } = result;

  const stars = '★'.repeat(vibeCoding.difficultyLevel) + '☆'.repeat(5 - vibeCoding.difficultyLevel);

  const htmlContent = `
    <div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;background:#0a0a14;color:#eee;padding:32px;max-width:640px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:28px;margin:0;">
          🎯 AI 습관 멘토링 리포트
        </h1>
        <p style="color:#888;margin:8px 0 0;">${today} | Gemini 2.0 Flash 코칭</p>
      </div>

      <!-- 습관 정보 -->
      <div style="background:#1a1a2e;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #333;">
        <h2 style="color:#e0e0ff;margin:0 0 4px;font-size:20px;">${suggestion.person} — ${suggestion.title}</h2>
        <p style="color:#888;margin:0 0 12px;font-size:14px;">🏷️ ${suggestion.category} · 난이도: ${suggestion.difficulty}</p>
        <p style="color:#ccc;font-size:14px;line-height:1.7;margin:0;">${suggestion.description}</p>
      </div>

      <!-- 상세 분석 & 메시지 -->
      <div style="background:#1a1a2e;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #333;">
        <div style="background:linear-gradient(135deg,#667eea22,#764ba222);border-radius:8px;padding:16px;margin-bottom:16px;">
          <p style="color:#e0e0ff;margin:0;font-size:16px;font-weight:700;">💡 "${detail.coreMessage}"</p>
        </div>
        <p style="color:#ccc;font-size:14px;line-height:1.7;margin:0;">${detail.description}</p>
      </div>

      <!-- 실행 가이드 -->
      <div style="background:#1a1a2e;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #333;">
        <h3 style="color:#4ecdc4;margin:0 0 16px;">🚀 3단계 실천 가이드</h3>
        ${detail.actionGuide.map((step, i) => `
          <div style="display:flex;gap:12px;margin-bottom:12px;">
            <div style="min-width:28px;height:28px;background:#4ecdc4;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#000;font-weight:700;font-size:14px;">${i + 1}</div>
            <p style="color:#ccc;margin:0;font-size:14px;line-height:1.6;">${step}</p>
          </div>
        `).join('')}
        <div style="background:#0d0d1a;border-radius:8px;padding:16px;margin-top:12px;">
          <p style="color:#ff9f43;margin:0;font-size:14px;">📌 적용 예시: ${detail.example}</p>
        </div>
      </div>

      <!-- 바이브 코딩 -->
      <div style="background:#1a1a2e;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #333;">
        <h3 style="color:#764ba2;margin:0 0 4px;">🛠 나만의 습관 앱 만들기 (바이브 코딩)</h3>
        <p style="color:#ff9f43;margin:0 0 12px;font-size:13px;">구현 난이도: ${stars} (Level ${vibeCoding.difficultyLevel})</p>
        <h4 style="color:#e0e0ff;margin:0 0 8px;font-size:18px;">${vibeCoding.appName}</h4>
        <p style="color:#aaa;margin:0 0 12px;font-size:14px;">${vibeCoding.description}</p>
        <ul style="color:#ccc;font-size:14px;margin:0 0 16px;padding-left:20px;">
          ${vibeCoding.features.map(f => `<li style="margin-bottom:4px;">${f}</li>`).join('')}
        </ul>
        <div style="background:#0d0d1a;border-radius:8px;padding:16px;">
          <p style="color:#667eea;margin:0 0 8px;font-size:13px;font-weight:700;">💬 AI 코딩 프롬프트:</p>
          <p style="color:#ccc;margin:0;font-size:13px;line-height:1.6;white-space:pre-wrap;">${vibeCoding.prompt}</p>
        </div>
      </div>

      <div style="text-align:center;padding:24px;color:#555;font-size:12px;">
        AI 습관 멘토링 서비스에 의해 자동 생성된 보고서입니다.
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"습관 멘토링" <${user}>`,
      to: recipient,
      subject: `🎯 [습관 코칭] ${suggestion.person}의 ${suggestion.title}`,
      html: htmlContent,
    });
    console.log('[이메일] 발송 성공:', recipient);
    return true;
  } catch (error) {
    console.error('[이메일] 발송 실패:', error);
    throw error;
  }
}
