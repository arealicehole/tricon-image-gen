import { NextRequest, NextResponse } from 'next/server';

const KIE_API_KEY = process.env.KIE_API_KEY;
const KIE_BASE = 'https://api.kie.ai';

export async function POST(request: NextRequest) {
  if (!KIE_API_KEY) {
    return NextResponse.json(
      { error: 'KIE API key not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { mode, prompt, model, imageUrl } = body;

    const payload: any = {
      model: model || (mode === 'img2img' ? 'fal-ai/flux/dev/image-to-image' : 'fal-ai/flux/dev'),
      prompt,
    };

    if (mode === 'img2img' && imageUrl) {
      payload.image_url = imageUrl;
    }

    const res = await fetch(`${KIE_BASE}/v1/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIE_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: 'KIE API error', details: errorText },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Generation failed', details: err.message },
      { status: 500 }
    );
  }
}
