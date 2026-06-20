'use client';

import React, { useState } from 'react';

const PASSWORD = 'poop';
const MODELS = {
  text2img: ['fal-ai/flux/dev', 'fal-ai/flux/schnell', 'fal-ai/stable-diffusion-xl'],
  img2img: ['fal-ai/flux/dev/image-to-image', 'fal-ai/ip-adapter-faceid', 'fal-ai/controlnet']
};

export default function ImageGenBeta() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [mode, setMode] = useState<'text2img' | 'img2img'>('text2img');
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState(MODELS.text2img[0]);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = () => {
    if (passwordInput === PASSWORD) {
      setAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  const handleModeChange = (newMode: 'text2img' | 'img2img') => {
    setMode(newMode);
    setSelectedModel(MODELS[newMode][0]);
    if (newMode === 'text2img') setImageFile(null);
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImageFile(file);
  };

const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Prompt is required');
      return;
    }
    if (mode === 'img2img' && !imageFile) {
      setError('Image required for img2img');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      let imageUrl = undefined;
      if (mode === 'img2img' && imageFile) {
        imageUrl = URL.createObjectURL(imageFile);
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          prompt,
          model: selectedModel,
          imageUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      const outputUrl = data.image_url || data.url || data.output;
      if (outputUrl) {
        setOutputImage(outputUrl);
        const creditCost = mode === 'img2img' ? 2 : 1;
        setCreditsUsed(prev => prev + creditCost);
      } else {
        throw new Error('No image returned from API');
      }
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const useOutputAsInput = () => {
    if (outputImage) {
      // In real app, convert URL to File or handle base64
      setMode('img2img');
      setSelectedModel(MODELS.img2img[0]);
      // Note: For full functionality, fetch and set as File
      alert('Output image set as input (demo). In production this would load the image file.');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tighter">TriCon Image Gen</h1>
            <p className="text-zinc-400 mt-2">Beta • Internal Tool</p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              placeholder="Enter password"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-white"
            />
            <button
              onClick={handleAuth}
              className="w-full bg-white text-black py-3 rounded-xl font-medium active:bg-zinc-200"
            >
              Access Generator
            </button>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </div>
          <p className="text-xs text-center text-zinc-500">Mobile-first • KIE API powered</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      <div className="max-w-md mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <div>
            <div className="font-semibold tracking-tight">TriCon • Image Gen</div>
            <div className="text-xs text-zinc-500">Beta • Credits used: {creditsUsed}</div>
          </div>
          <div className="text-xs px-3 py-1 bg-zinc-900 rounded-full">poop</div>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-zinc-900 rounded-2xl p-1 mb-6">
          {(['text2img', 'img2img'] as const).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${mode === m ? 'bg-white text-black' : 'text-zinc-400'}`}
            >
              {m === 'text2img' ? 'Text → Image' : 'Image → Image'}
            </button>
          ))}
        </div>

        {/* Prompt */}
        <div className="mb-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-base min-h-[120px] resize-y focus:outline-none focus:border-white placeholder:text-zinc-500"
          />
        </div>

        {/* Image Upload (img2img only) */}
        {mode === 'img2img' && (
          <div
            onDrop={handleImageDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border border-dashed border-zinc-700 rounded-2xl p-8 mb-4 text-center active:bg-zinc-900"
          >
            {imageFile ? (
              <div className="text-sm text-emerald-400">✓ {imageFile.name} ready</div>
            ) : (
              <>
                <div className="text-zinc-400 mb-3">Drop image here or</div>
                <label className="inline-block bg-zinc-800 hover:bg-zinc-700 transition px-5 py-2 rounded-xl text-sm cursor-pointer">
                  Choose file
                  <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                </label>
              </>
            )}
          </div>
        )}

        {/* Model Selection */}
        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2 px-1">MODEL</div>
          <div className="flex flex-wrap gap-2">
            {MODELS[mode].map((model) => (
              <button
                key={model}
                onClick={() => setSelectedModel(model)}
                className={`px-4 py-2 text-sm rounded-full border transition-all ${selectedModel === model ? 'bg-white text-black border-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
              >
                {model.split('/').pop()}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full bg-white text-black py-4 rounded-2xl font-semibold text-lg active:bg-zinc-200 disabled:opacity-50 mb-4"
        >
          {isGenerating ? 'Generating...' : 'Generate Image'}
        </button>

        {error && <div className="text-red-400 text-sm mb-4 text-center">{error}</div>}

        {/* Output */}
        {outputImage && (
          <div className="mt-8">
            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-3 px-1">RESULT</div>
            <img src={outputImage} alt="Generated" className="w-full rounded-2xl shadow-xl" />
            
            <div className="flex gap-3 mt-4">
              <button 
                onClick={useOutputAsInput}
                className="flex-1 py-3 bg-zinc-900 rounded-2xl text-sm font-medium active:bg-zinc-800"
              >
                Use as Input (img2img)
              </button>
              <a 
                href={outputImage} 
                download 
                className="flex-1 py-3 bg-zinc-900 rounded-2xl text-sm font-medium text-center active:bg-zinc-800"
              >
                Download
              </a>
            </div>
          </div>
        )}

        <div className="mt-12 text-center text-[10px] text-zinc-600">
          Internal beta • KIE API • Session credits tracked
        </div>
      </div>
    </div>
  );
}
