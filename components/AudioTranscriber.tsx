"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Mic, Loader2, AlertCircle, Check, X } from "lucide-react";
import TranscriptEditor from "./TranscriptEditor";
import type { TranscriptBlock, SpeakerMapping, TranscriptionState } from "@/lib/transcription";
import { formatTimeLong, blocksToPlainText, applyDictionaryToBlocks, getUniqueSpeakers } from "@/lib/transcription";
import type { DictionaryEntry, Person } from "@/lib/contacts/types";

interface AudioTranscriberProps {
  onTranscriptReady: (transcript: string, blocks: TranscriptBlock[]) => void;
  dictionary: DictionaryEntry[];
  participants: Person[];
  onParticipantMapChange?: (mapping: SpeakerMapping) => void;
}

export default function AudioTranscriber({
  onTranscriptReady,
  dictionary,
  participants,
  onParticipantMapChange,
}: AudioTranscriberProps) {
  const [state, setState] = useState<TranscriptionState>({
    status: 'idle',
    blocks: [],
    speakerMapping: {},
  });
  
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSpeakerMapper, setShowSpeakerMapper] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    // Cleanup previous audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setFile(selectedFile);
    setAudioUrl(URL.createObjectURL(selectedFile));
    setState({
      status: 'idle',
      blocks: [],
      speakerMapping: {},
    });
  }, [audioUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('audio/')) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleTranscribe = async () => {
    if (!file) return;

    setState((prev) => ({ ...prev, status: 'uploading' }));

    try {
      const formData = new FormData();
      formData.append('audio', file);

      setState((prev) => ({ ...prev, status: 'transcribing' }));

      console.log('📤 Sending transcription request:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        method: 'POST',
      });

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it automatically with boundary
      });

      console.log('📥 Transcription response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        let errorMessage = 'Transcription failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // Use default error message
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Transcription failed');
      }

      // Initialize speaker mapping with default names
      const speakers = getUniqueSpeakers(data.blocks);
      const initialMapping: SpeakerMapping = {};
      speakers.forEach((speaker) => {
        initialMapping[speaker] = speaker;
      });

      setState({
        status: 'complete',
        blocks: data.blocks,
        speakerMapping: initialMapping,
        audioDuration: data.duration,
      });

      // Show speaker mapper if there are multiple speakers
      if (speakers.length > 1) {
        setShowSpeakerMapper(true);
      }

    } catch (error) {
      console.error('Transcription error:', error);
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'An error occurred',
      }));
    }
  };

  const handleSpeakerRename = (originalSpeaker: string, newName: string) => {
    setState((prev) => ({
      ...prev,
      speakerMapping: {
        ...prev.speakerMapping,
        [originalSpeaker]: newName,
      },
    }));
  };

  const handleBlockTextChange = (blockId: string, newText: string) => {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) =>
        block.id === blockId
          ? { ...block, text: newText, words: newText.split(' ') }
          : block
      ),
    }));
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleConfirmTranscript = () => {
    // Apply dictionary corrections
    const correctedBlocks = applyDictionaryToBlocks(state.blocks, dictionary);
    
    // Apply speaker mapping to get final blocks
    const finalBlocks = correctedBlocks.map((block) => ({
      ...block,
      speakerLabel: state.speakerMapping[block.speaker] || block.speakerLabel,
    }));

    // Convert to plain text for summarization
    const transcriptText = blocksToPlainText(finalBlocks);
    
    // Notify parent
    onTranscriptReady(transcriptText, finalBlocks);
    onParticipantMapChange?.(state.speakerMapping);
  };

  const handleReset = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setFile(null);
    setAudioUrl(null);
    setState({
      status: 'idle',
      blocks: [],
      speakerMapping: {},
    });
    setShowSpeakerMapper(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uniqueSpeakers = getUniqueSpeakers(state.blocks);

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      {state.status === 'idle' && !file && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center cursor-pointer hover:border-border hover:bg-surface/30 transition-all"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-surfaceDark flex items-center justify-center">
              <Upload className="w-5 h-5 text-tertiary" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">
                Drop audio file or click to upload
              </p>
              <p className="text-xs text-tertiary mt-1">
                MP3, WAV, M4A, OGG, WebM supported
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File Selected - Ready to Transcribe */}
      {file && state.status === 'idle' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-border/40">
            <div className="w-10 h-10 rounded-lg bg-surfaceDark flex items-center justify-center flex-shrink-0">
              <Mic className="w-5 h-5 text-tertiary" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary truncate">{file.name}</p>
              <p className="text-xs text-tertiary">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={handleReset}
              className="p-2 text-tertiary hover:text-primary transition-colors"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Audio Player */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              className="w-full"
              controls
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          )}

          <button
            onClick={handleTranscribe}
            className="w-full bg-primary text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            <Mic size={16} strokeWidth={1.5} />
            Transcribe Audio
          </button>
        </div>
      )}

      {/* Transcribing State */}
      {(state.status === 'uploading' || state.status === 'transcribing') && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" strokeWidth={1.5} />
          <div className="text-center">
            <p className="text-sm font-medium text-primary">
              {state.status === 'uploading' ? 'Uploading audio...' : 'Transcribing...'}
            </p>
            <p className="text-xs text-tertiary mt-1">
              This may take a few minutes for longer recordings
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {state.status === 'error' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Transcription failed</p>
              <p className="text-xs text-red-600 mt-1">{state.error}</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Transcription Complete */}
      {state.status === 'complete' && state.blocks.length > 0 && (
        <div className="space-y-6">
          {/* Audio Player */}
          {audioUrl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-tertiary">
                  {file?.name} • {state.audioDuration ? formatTimeLong(state.audioDuration) : ''}
                </p>
                <button
                  onClick={handleReset}
                  className="text-xs text-tertiary hover:text-primary transition-colors"
                >
                  Upload different file
                </button>
              </div>
              <audio
                ref={audioRef}
                src={audioUrl}
                className="w-full"
                controls
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>
          )}

          {/* Speaker Mapper */}
          {showSpeakerMapper && uniqueSpeakers.length > 1 && (
            <div className="p-4 bg-surface rounded-lg border border-border/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-secondary">
                  Assign Speaker Names
                </h4>
                <button
                  onClick={() => setShowSpeakerMapper(false)}
                  className="text-xs text-tertiary hover:text-primary"
                >
                  Done
                </button>
              </div>
              <div className="space-y-2">
                {uniqueSpeakers.map((speaker) => (
                  <div key={speaker} className="flex items-center gap-3">
                    <span className="text-xs text-tertiary w-20 flex-shrink-0">{speaker}</span>
                    <span className="text-tertiary">→</span>
                    <select
                      value={
                        participants.some((p) => p.name === state.speakerMapping[speaker])
                          ? state.speakerMapping[speaker]
                          : '__custom__'
                      }
                      onChange={(e) => {
                        if (e.target.value !== '__custom__') {
                          handleSpeakerRename(speaker, e.target.value);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-sm bg-white border border-border/40 rounded focus:ring-0 focus:border-borderFocus"
                    >
                      <option value="__custom__">
                        {state.speakerMapping[speaker] || speaker}
                      </option>
                      {participants.map((person) => (
                        <option key={person.id} value={person.name}>
                          {person.name}
                          {person.title ? ` (${person.title})` : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={state.speakerMapping[speaker] || ''}
                      onChange={(e) => handleSpeakerRename(speaker, e.target.value)}
                      placeholder="Custom name"
                      className="w-32 px-3 py-1.5 text-sm bg-white border border-border/40 rounded focus:ring-0 focus:border-borderFocus"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transcript Editor */}
          <TranscriptEditor
            blocks={state.blocks}
            speakerMapping={state.speakerMapping}
            onSpeakerRename={handleSpeakerRename}
            onBlockTextChange={handleBlockTextChange}
            audioUrl={audioUrl}
            currentTime={currentTime}
            onSeek={handleSeek}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
          />

          {/* Confirm Button */}
          <button
            onClick={handleConfirmTranscript}
            className="w-full bg-accent text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-accentHover transition-all flex items-center justify-center gap-2"
          >
            <Check size={16} strokeWidth={1.5} />
            Use This Transcript
          </button>
        </div>
      )}
    </div>
  );
}


