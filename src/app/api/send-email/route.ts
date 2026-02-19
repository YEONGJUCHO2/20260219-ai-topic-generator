import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
    try {
        const { email, habitTitle, habitDesc, actionGuide } = await req.json();

        if (!email || !habitTitle) {
            return NextResponse.json({ success: false, error: 'Email and Habit Title are required' }, { status: 400 });
        }

        const user = process.env.GMAIL_USER;
        const pass = process.env.GMAIL_APP_PASSWORD;

        if (!user || !pass) {
            return NextResponse.json({ success: false, error: 'Server email configuration missing' }, { status: 500 });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass },
        });

        const mailOptions = {
            from: `"Habit Mentor AI" <${user}>`,
            to: email, // 로그인한 유저의 이메일 (또는 요청받은 이메일)
            subject: `[습관 멘토링] ${habitTitle} 실천 가이드 도착! 🎯`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #6d28d9;">${habitTitle}</h2>
          <p style="font-size: 16px; color: #555;">${habitDesc}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          
          <h3 style="color: #333;">🚀 3단계 실천 가이드</h3>
          <ul style="background: #f9fafb; padding: 20px; border-radius: 8px;">
            ${actionGuide.map((step: string, idx: number) => `<li style="margin-bottom: 10px;"><strong>Step ${idx + 1}:</strong> ${step}</li>`).join('')}
          </ul>

          <p style="margin-top: 30px; font-size: 14px; color: #888;">
            이 메일은 Habit Mentor AI 서비스에서 발송되었습니다.<br/>
            습관 형성을 응원합니다! 💪
          </p>
        </div>
      `,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error('Email send error:', error);
        return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
    }
}
