// =============================================
// Gmail 이메일 발송 (Nodemailer)
// =============================================
import nodemailer from 'nodemailer';
import { VideoIdea, MatchResult } from './types';

export async function sendEmailReport(
  ideas: VideoIdea[],
  matches: MatchResult[] = []
): Promise<boolean> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const recipient = process.env.EMAIL_RECIPIENT;

  if (!user || !pass || !recipient) {
    console.warn('[이메일] Gmail 설정이 없습니다. 이메일 발송을 건너뜁니다.');
    return false;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const htmlContent = buildEmailHtml(ideas, matches, today);

  try {
    await transporter.sendMail({
      from: `"AI 주제추천 에이전트" <${user}>`,
      to: recipient,
      subject: `📊 영상 주제 추천 — ${today}`,
      html: htmlContent,
    });
    console.log('[이메일] 발송 성공:', recipient);
    return true;
  } catch (error) {
    console.error('[이메일] 발송 실패:', error);
    return false;
  }
}

function buildEmailHtml(
  ideas: VideoIdea[],
  matches: MatchResult[],
  date: string
): string {
  const ideaCards = ideas
    .map(
      (idea) => `
    <div style="background:#1a1a2e;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #333;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:4px 12px;border-radius:20px;font-size:13px;">
          ${idea.titanName}
        </span>
        <span style="color:#999;font-size:13px;">${idea.methodology}</span>
      </div>
      <h3 style="color:#e0e0ff;margin:0 0 8px;">🎬 ${idea.trend}</h3>
      <div style="margin-bottom:12px;">
        ${idea.titles
          .map(
            (t, i) =>
              `<p style="color:#ccc;margin:4px 0;padding-left:8px;border-left:3px solid #667eea;">
                ${i + 1}. ${t}
              </p>`
          )
          .join('')}
      </div>
      <div style="background:#0d0d1a;border-radius:8px;padding:12px;margin-bottom:8px;">
        <p style="color:#ff9f43;margin:0;font-size:14px;">💬 후킹: "${idea.hookingPhrase}"</p>
      </div>
      
      ${idea.relatedYoutube ? `<p style="color:#ff6b6b;font-size:13px;margin:8px 0;">📺 <b>관련 영상:</b> <a href="${idea.relatedYoutube.url}" style="color:#ff8787;">${idea.relatedYoutube.title}</a> (${idea.relatedYoutube.channel})</p>` : ''}
      ${idea.relatedBook ? `<p style="color:#4ecdc4;font-size:13px;margin:8px 0;">📚 <b>추천 도서:</b> ${idea.relatedBook.title} - ${idea.relatedBook.author}</p>` : ''}

      ${idea.paperCitation
          ? `<p style="color:#88d;font-size:13px;margin:8px 0;">📄 ${idea.paperCitation}</p>`
          : ''
        }
      <div style="background:#0d0d1a;border-radius:8px;padding:12px;">
        <p style="color:#4ecdc4;margin:0 0 4px;font-weight:bold;">🛠 도구: ${idea.toolConcept.name} (Level ${idea.toolConcept.level})</p>
        <p style="color:#aaa;margin:0;font-size:13px;">${idea.toolConcept.description}</p>
        <ul style="color:#999;font-size:13px;margin:8px 0;">
          ${idea.toolConcept.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>
    </div>`
    )
    .join('');

  return `
    <div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;background:#0a0a14;color:#eee;padding:32px;max-width:640px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:28px;margin:0;">
          🚀 개별 영상 기획안 추천
        </h1>
        <p style="color:#888;margin:8px 0 0;">${date} | AI 자동 생성</p>
      </div>

     ${matches.length > 0 ? `
      <div style="background:#16162a;border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;">
        <span style="color:#999;">분석된 트렌드 </span>
        <strong style="color:#667eea;">${matches.length}개</strong>
        <span style="color:#999;"> → 기획안 </span>
        <strong style="color:#764ba2;">${ideas.length}개</strong>
        <span style="color:#999;"> 생성</span>
      </div>` : ''}

      ${ideaCards}

      <div style="text-align:center;padding:24px;color:#555;font-size:12px;">
        AI 주제추천 에이전트에 의해 자동 생성된 보고서입니다.
      </div>
    </div>
  `;
}
