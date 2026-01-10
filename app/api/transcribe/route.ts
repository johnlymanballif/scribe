import { NextRequest, NextResponse } from 'next/server';
import { processDeepgramResponse } from '@/lib/transcription';
import type { TranscribeAPIResponse } from '@/lib/transcription';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for long audio files

/**
 * GET /api/transcribe
 * Returns an error - this endpoint only accepts POST requests
 */
export async function GET() {
  console.log('⚠️ GET request received on /api/transcribe - this endpoint only accepts POST');
  return NextResponse.json(
    { 
      success: false, 
      error: 'This endpoint only accepts POST requests. Please use POST to upload audio files for transcription.' 
    },
    { status: 405 } // Method Not Allowed
  );
}

/**
 * OPTIONS /api/transcribe
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * POST /api/transcribe
 * Accepts audio file and returns transcribed text with speaker diarization
 */
export async function POST(request: NextRequest): Promise<NextResponse<TranscribeAPIResponse>> {
  // Log function invocation for debugging
  console.log('🎤 Transcription API POST called', {
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL ? 'production' : 'development',
    nodeEnv: process.env.NODE_ENV,
    method: request.method,
    url: request.url,
    headers: {
      contentType: request.headers.get('content-type'),
      contentLength: request.headers.get('content-length'),
    },
  });

  try {
    // Get and trim API key to handle any whitespace issues
    const rawApiKey = process.env.DEEPGRAM_API_KEY;
    const apiKey = rawApiKey?.trim();
    
    // Enhanced logging for environment variable detection
    console.log('🔑 Checking DEEPGRAM_API_KEY:', {
      isSet: !!rawApiKey,
      isEmpty: rawApiKey === '',
      isPlaceholder: rawApiKey === 'your_api_key_here',
      preview: apiKey ? `${apiKey.substring(0, 8)}...` : 'not set',
      length: apiKey?.length || 0,
      rawLength: rawApiKey?.length || 0,
      hasWhitespace: rawApiKey && rawApiKey !== rawApiKey.trim(),
    });
    
    if (!apiKey || apiKey === 'your_api_key_here' || apiKey === '') {
      console.error('❌ DEEPGRAM_API_KEY is not configured', {
        apiKeyExists: !!rawApiKey,
        apiKeyValue: rawApiKey === 'your_api_key_here' ? 'placeholder' : rawApiKey === '' ? 'empty' : 'whitespace-only',
        rawLength: rawApiKey?.length || 0,
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Deepgram API key not configured. Please set DEEPGRAM_API_KEY in Vercel environment variables.' 
        },
        { status: 500 }
      );
    }

    // Get the form data
    console.log('📥 Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('audio') as File | null;

    if (!file) {
      console.error('❌ No audio file in form data');
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log('📁 File received:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeMB: (file.size / 1024 / 1024).toFixed(2),
      lastModified: file.lastModified,
    });

    // Check file size (Vercel has a 4.5MB limit for serverless functions, but we can handle larger files via streaming)
    // Deepgram accepts files up to 2GB, but we'll warn about very large files
    const maxSizeBytes = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSizeBytes) {
      console.error('❌ File too large:', {
        size: file.size,
        sizeMB: (file.size / 1024 / 1024).toFixed(2),
        maxSizeMB: (maxSizeBytes / 1024 / 1024).toFixed(2),
      });
      return NextResponse.json(
        { success: false, error: `File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is ${(maxSizeBytes / 1024 / 1024).toFixed(0)}MB.` },
        { status: 413 }
      );
    }

    // Validate file type
    const validTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/mp4',
      'audio/m4a',
      'audio/x-m4a',
      'audio/ogg',
      'audio/webm',
      'video/mp4', // Some audio files may be detected as video
      'video/webm',
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|ogg|webm|mp4)$/i)) {
      return NextResponse.json(
        { success: false, error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();

    // Call Deepgram API
    const deepgramUrl = new URL('https://api.deepgram.com/v1/listen');
    deepgramUrl.searchParams.set('model', 'nova-2');
    deepgramUrl.searchParams.set('diarize', 'true');
    deepgramUrl.searchParams.set('smart_format', 'true');
    deepgramUrl.searchParams.set('punctuate', 'true');
    deepgramUrl.searchParams.set('utterances', 'true');
    deepgramUrl.searchParams.set('words', 'true'); // Required for our processing logic

    // Determine content type - Deepgram prefers clear audio/ types
    let contentType = file.type;
    if (!contentType || contentType === 'blob') {
      if (file.name.endsWith('.mp3')) contentType = 'audio/mpeg';
      else if (file.name.endsWith('.wav')) contentType = 'audio/wav';
      else if (file.name.endsWith('.m4a')) contentType = 'audio/mp4';
      else contentType = 'audio/mpeg'; // fallback
    }

    console.log(`📤 Sending request to Deepgram: ${file.name} (${file.size} bytes, ${contentType})`);

    const response = await fetch(deepgramUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': contentType,
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Transcription failed';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.err_msg || errorData.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      console.error('❌ Deepgram API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        apiKeySet: !!apiKey,
        apiKeyPreview: apiKey ? `${apiKey.substring(0, 10)}...` : 'not set'
      });

      // Provide more helpful error messages
      if (response.status === 401 || response.status === 403) {
        errorMessage = 'Invalid Deepgram API key. Please check your DEEPGRAM_API_KEY in Vercel environment variables.';
      } else if (response.status === 400) {
        errorMessage = `Deepgram API error: ${errorMessage}. Please check your audio file format.`;
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Log metadata for debugging
    console.log('✅ Deepgram response received:', {
      request_id: data.metadata?.request_id,
      duration: data.metadata?.duration,
      channels: data.metadata?.channels,
      models: data.metadata?.models,
    });

    // Process the response into transcript blocks
    const blocks = processDeepgramResponse(data);
    
    if (blocks.length === 0) {
      console.warn('⚠️ No transcript blocks generated from Deepgram response');
    }

    const duration = data.metadata?.duration;

    return NextResponse.json({
      success: true,
      blocks,
      duration,
    });

  } catch (error) {
    // Enhanced error logging
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL ? 'production' : 'development',
    };
    
    console.error('❌ Transcription error:', errorDetails);
    
    // Return detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? (error instanceof Error ? error.message : 'An unexpected error occurred')
      : 'An unexpected error occurred during transcription. Please check the server logs.';
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}


