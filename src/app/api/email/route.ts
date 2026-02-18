import { NextRequest, NextResponse } from "next/server";
import { sendEmailReport } from "@/lib/email";
import { VideoIdea } from "@/lib/types";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { idea } = body;

        if (!idea) {
            return NextResponse.json({ success: false, error: "No idea provided" }, { status: 400 });
        }

        // lib/email.ts의 sendEmailReport는 배열을 받도록 되어 있으므로 배열로 감싸서 전달
        await sendEmailReport([idea]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Email sending failed:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
