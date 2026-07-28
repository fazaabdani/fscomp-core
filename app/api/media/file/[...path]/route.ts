import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { MEDIA_UPLOAD_DIR } from "@/lib/media-data";

export const dynamic = "force-dynamic";

const baseDir = path.join(process.cwd(), MEDIA_UPLOAD_DIR);

export async function GET(_request: Request, { params }: { params: { path: string[] } }) {
  const segments = params.path ?? [];
  if (segments.some((segment) => segment.includes("..") || segment.includes("/") || segment.includes("\\"))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(baseDir, ...segments);
  if (!filePath.startsWith(baseDir)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) return new NextResponse("Not found", { status: 404 });
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
