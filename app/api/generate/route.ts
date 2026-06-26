import { NextRequest, NextResponse } from 'next/server';

const KIE_API_KEY=proces...onst KIE_BASE = 'https://api.kie.ai';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  if (!KIE_API_KEY) {
    return NextResponse.json({ error: 'KIE_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { mode, prompt, model, imageUrl } = await request.json();

    // Use Flux Kontext as reliable default (from actual docs)
    const isImg2Img = mode === 'img2img';
    const modelSlug = model || (isImg2Img ? 'flux-kontext-pro' : 'flux-kontext-pro');

    const createPayload: any = {
      prompt,
      model: modelSlug,
      aspectRatio: '1:1',
    };

    if (isImg2Img && imageUrl) {
      createPayload.imageUrl = imageUrl;
    }

    // Correct create endpoint
    const createRes = await fetch(`${KIE_BASE}/api/v1/flux/kontext/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIE_API_KEY}`,
      },
      body: JSON.stringify(createPayload),
    });

    const createData = await createRes.json();

    if (!createRes.ok || createData.code !== 200) {
      return NextResponse.json(
        { error: 'Failed to create KIE task', details: createData },
        { status: 500 }
      );
    }

    const taskId = createData.data?.taskId;
    if (!taskId) {
      return NextResponse.json({ error: 'No taskId returned', raw: createData }, { status: 500 });
    }

    // Poll with correct details endpoint
    let resultUrl: string | null = null;
    for (let i = 0; i < 20; i++) {
      await sleep(2000);

      const statusRes = await fetch(
        `${KIE_BASE}/api/v1/flux/kontext/record-info?taskId=${taskId}`,
        { headers: { 'Authorization': `Bearer ${KIE_API_KEY}` } }
      );

      if (statusRes.ok) {
        const statusData = await statusRes.json();

        if (statusData.code === 200 && statusData.data?.resultImageUrl) {
          resultUrl = statusData.data.resultImageUrl;
          break;
        }
        if (statusData.data?.status === 3) {
          return NextResponse.json({ error: 'KIE generation failed', raw: statusData }, { status: 500 });
        }
      }
    }

    if (!resultUrl) {
      return NextResponse.json({ error: 'Timed out waiting for image', taskId }, { status: 504 });
    }

    return NextResponse.json({ image_url: resultUrl, taskId });
  } catch (err: any) {
    return NextResponse.json({ error: 'Generation error', details: err.message }, { status: 500 });
  }
}
