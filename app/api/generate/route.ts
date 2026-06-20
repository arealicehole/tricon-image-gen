import { NextRequest, NextResponse } from 'next/server';

const KIE_API_KEY = process.env.KIE_API_KEY;
const KIE_BASE = 'https://api.kie.ai';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  if (!KIE_API_KEY) {
    return NextResponse.json({ error: 'KIE_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { mode, prompt, model, imageUrl } = await request.json();

    // Step 1: Create generation task (following KIE task pattern)
    const createPayload: any = {
      model: model || (mode === 'img2img' ? 'flux-2/flex-image-to-image' : 'flux-2/flex-text-to-image'),
      prompt,
    };

    if (mode === 'img2img' && imageUrl) {
      createPayload.image_url = imageUrl;
    }

    const createRes = await fetch(`${KIE_BASE}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIE_API_KEY}`,
      },
      body: JSON.stringify(createPayload),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      return NextResponse.json({ error: 'Failed to create task', details: err }, { status: 500 });
    }

    const createData = await createRes.json();
    const taskId = createData?.taskId || createData?.id || createData?.data?.taskId;

    if (!taskId) {
      return NextResponse.json({ error: 'No taskId returned', raw: createData }, { status: 500 });
    }

    // Step 2: Poll for result (max ~30 seconds)
    let resultUrl: string | null = null;
    for (let i = 0; i < 15; i++) {
      await sleep(2000);

      const statusRes = await fetch(`${KIE_BASE}/v1/images/generations/${taskId}`, {
        headers: { 'Authorization': `Bearer ${KIE_API_KEY}` },
      });

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData?.status === 'completed' || statusData?.data?.url) {
          resultUrl = statusData.data?.url || statusData.url;
          break;
        }
        if (statusData?.status === 'failed') {
          return NextResponse.json({ error: 'Generation failed', raw: statusData }, { status: 500 });
        }
      }
    }

    if (!resultUrl) {
      return NextResponse.json({ error: 'Generation timed out', taskId }, { status: 504 });
    }

    return NextResponse.json({ image_url: resultUrl, taskId });
  } catch (err: any) {
    return NextResponse.json({ error: 'Generation error', details: err.message }, { status: 500 });
  }
}
