import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { googleSpeechService } from '../lib/googleSpeech';
import { config } from '../config';

interface TranscriptionChunk {
  timestamp: number;
  text: string;
}

const NewReport = () => {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionChunk[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const initializeAudioContext = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorNodeRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      sourceNodeRef.current.connect(processorNodeRef.current);
      processorNodeRef.current.connect(audioContextRef.current.destination);

      return stream;
    } catch (error) {
      throw new Error(`Failed to initialize audio context: ${error}`);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await initializeAudioContext();
      mediaRecorderRef.current = new MediaRecorder(stream);

      // Create initial report entry when starting recording
      if (!currentReportId) {
        const { data: reportData, error: createError } = await supabase
          .from('reports')
          .insert({
            user_id: session?.user?.id,
            date: new Date().toISOString(),
            transcripts: '',
          })
          .select()
          .single();

        if (createError) throw createError;
        setCurrentReportId(reportData.id);
      }

      await googleSpeechService.startStreaming(
        (result) => {
          setTranscription(prev => [...prev, {
            timestamp: result.timestamp,
            text: result.text
          }]);
        },
        (error) => {
          setError(`Speech recognition error: ${error.message}`);
          stopRecording();
        }
      );

      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      await googleSpeechService.stopStreaming();
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }

      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      if (processorNodeRef.current) {
        processorNodeRef.current.disconnect();
      }

      setIsRecording(false);
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatTranscript = (chunks: TranscriptionChunk[]): string => {
    return chunks.map(chunk => {
      const date = new Date(chunk.timestamp);
      return `[${date.toLocaleTimeString()}] ${chunk.text}`;
    }).join('\n');
  };

  const sendTranscript = async () => {
    if (transcription.length === 0) {
      setError('No transcription available to send');
      return;
    }

    if (!currentReportId) {
      setError('No active report session');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const formattedTranscript = formatTranscript(transcription);
      
      // Update existing report with transcription
      const { error: updateError } = await supabase
        .from('reports')
        .update({ transcripts: formattedTranscript })
        .eq('id', currentReportId);

      if (updateError) throw updateError;

      // Send to webhook for processing
      const response = await fetch(config.webhook.url, {
        method: 'POST',
        headers: config.webhook.headers,
        body: JSON.stringify({
          userId: session?.user?.id,
          reportId: currentReportId
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send data to webhook: ${response.status} ${response.statusText}`);
      }

      setSuccess('Report data sent successfully');
      setTranscription([]);
      
      // Navigate to the report editor
      navigate(`/reports/${currentReportId}/edit`);
    } catch (err) {
      console.error('Webhook error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send report data');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Medical Report</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleRecordToggle}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
              isRecording
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            disabled={!!error}
          >
            {isRecording ? (
              <>
                <Square className="animate-pulse" size={20} />
                <span>Stop Recording</span>
              </>
            ) : (
              <>
                <Mic size={20} />
                <span>Start Recording</span>
              </>
            )}
          </button>

          <button
            onClick={sendTranscript}
            disabled={transcription.length === 0 || isSending}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send size={20} />
                <span>Generate Report</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <div className="relative">
          <div className="absolute top-0 right-0 p-2">
            {isRecording && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                <span className="text-sm text-gray-500">Recording...</span>
              </div>
            )}
          </div>
          
          <div className="min-h-[300px] p-4 bg-gray-50 rounded-lg border border-gray-200">
            {transcription.length > 0 ? (
              <div className="space-y-2">
                {transcription.map((chunk, index) => (
                  <div key={index} className="text-gray-700">
                    <span className="text-gray-500 text-sm">
                      [{new Date(chunk.timestamp).toLocaleTimeString()}]
                    </span>{' '}
                    {chunk.text}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-center mt-32">
                {error ? 'Recording unavailable' : 'Start recording to capture audio'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewReport;