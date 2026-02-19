import { NextRequest, NextResponse } from "next/server";
import { sendAnalysisEmail } from "@/lib/email";
import { AnalysisResult } from "@/lib/types";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result: AnalysisResult = body.result;

        if (!result || !result.analysis) {
            return NextResponse.json({ success: false, error: "분석 결과가 없습니다." }, { status: 400 });
        }

        await sendAnalysisEmail(result);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Email sending failed:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
