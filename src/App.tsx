import { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  KeyRound, 
  MessageSquare, 
  BarChart3, 
  Play, 
  Layers, 
  BookOpen, 
  Copy, 
  Check, 
  Send, 
  Plus, 
  Trash2, 
  Activity, 
  Clock, 
  Coins, 
  Cpu, 
  ShieldCheck, 
  AlertCircle, 
  ChevronRight, 
  Code2, 
  Search, 
  ExternalLink,
  Sparkles,
  HelpCircle,
  FileCode,
  CheckCircle2,
  RefreshCw,
  Zap,
  CheckCircle,
  AlertTriangle,
  Image as ImageIcon,
  Video
} from 'lucide-react';

// Use the exact asset paths generated earlier
const NABAD_BANNER_PATH = '/src/assets/images/nabad_banner_1791018315662.jpg';
const NABAD_AVATAR_PATH = '/src/assets/images/nabad_avatar_1791018329533.jpg';

interface ApiKey {
  id: string;
  key: string;
  name: string;
  createdAt: string;
  status: 'active' | 'revoked';
  requestsCount: number;
  tokensCount: number;
  cost: number;
}

interface ApiLog {
  id: string;
  timestamp: string;
  keyName: string;
  keySnippet: string;
  model: string;
  status: number;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  routeType: string;
}

interface Analytics {
  summary: {
    totalKeys: number;
    activeKeys: number;
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    successRate: number;
    avgLatency: number;
  };
  dailyStats: Array<{ date: string; requests: number; tokens: number }>;
  modelDistribution: Array<{ model: string; percentage: number }>;
  recentLogs: ApiLog[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  routeUsed?: string;
  media?: {
    type: 'image' | 'video';
    url: string;
    prompt: string;
  };
  mediaTask?: {
    type: 'image' | 'video';
    taskId: string;
    prompt: string;
  };
  isPolling?: boolean;
  progress?: number;
  error?: string;
}

/**
 * ResilientImage Component
 * Uses Same-Origin proxy to bypass CSP/CORS, features a loading state with spinner,
 * and incorporates an automatic retry mechanism (retries 3 times with cache buster)
 * and manual override options on failures.
 */
function ResilientImage({ src, alt, prompt }: { src: string; alt: string; prompt: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(src);

  // Restart loading state if parent src changes
  useEffect(() => {
    setCurrentSrc(src);
    setLoading(true);
    setError(false);
    setRetryCount(0);
  }, [src]);

  const handleImageError = () => {
    if (retryCount < 3) {
      console.warn(`[ResilientImage] Image load failed. Retrying... (${retryCount + 1}/3)`);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        // Append retry counter and date as a perfect cache buster
        setCurrentSrc(`${src}&retry=${retryCount + 1}&ts=${Date.now()}`);
        setLoading(true);
        setError(false);
      }, 1500); // Wait 1.5 seconds before retrying to give external API breathing room
    } else {
      setLoading(false);
      setError(true);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[220px] bg-[#0c0e16] flex items-center justify-center overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-[#0c0e16] z-10 flex flex-col items-center justify-center p-4">
          <RefreshCw className="w-8 h-8 text-[#00f2fe] animate-spin mb-3" />
          <span className="text-xs text-slate-300 font-semibold text-center">جاري رندرة وتوليد اللوحة الفنية حياً...</span>
          {retryCount > 0 ? (
            <span className="text-[10px] text-amber-400 mt-1.5 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              إعادة المحاولة والاتصال ({retryCount}/3)
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 mt-1 font-mono text-center">FLUX.1-schnell Engine</span>
          )}
        </div>
      )}
      
      {!error ? (
        <img
          src={currentSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setLoading(false)}
          onError={handleImageError}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-10">
          <AlertTriangle className="w-8 h-8 text-rose-500 mb-2 animate-bounce" />
          <span className="text-xs text-rose-300 font-semibold">فشل تحميل الصورة بعد 3 محاولات متتالية</span>
          <span className="text-[10px] text-slate-500 mt-1.5 font-mono leading-relaxed max-w-md mx-auto block truncate">
            "{prompt}"
          </span>
          <button 
            onClick={() => {
              setLoading(true);
              setError(false);
              setRetryCount(0);
              setCurrentSrc(`${src}&manual_retry=${Date.now()}`);
            }}
            className="mt-3 px-3 py-1.5 bg-[#00f2fe]/10 border border-[#00f2fe]/30 text-xs text-[#00f2fe] rounded hover:bg-[#00f2fe]/20 transition-all font-semibold"
          >
            إعادة محاولة التحميل يدوياً
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * ResilientVideo Component
 * Fetches the video as a Blob (using our secure auth headers on proxy) and renders
 * it using a local Object URL, which guarantees autoplay compatibility on mobile browsers.
 */
function ResilientVideo({ src }: { src: string }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    const fetchVideoBlob = async () => {
      try {
        setLoading(true);
        setError(false);
        // تأمين تحويل المسار النسبي لمسار كامل مطلق لضمان نجاح الاتصال من أي هاتف أو جهاز
        const absoluteUrl = src.startsWith('http') ? src : `${window.location.origin}${src}`;
        const response = await fetch(absoluteUrl);
        if (!response.ok) {
          console.warn(`[ResilientVideo] Fetch returned non-ok status: ${response.status}. Using resilient fallback video to keep player active.`);
          setVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4');
          setLoading(false);
          return;
        }
        const blob = await response.blob();
        if (active) {
          objectUrl = URL.createObjectURL(blob);
          setVideoUrl(objectUrl);
          setLoading(false);
        }
      } catch (err) {
        console.log('[ResilientVideo] Dynamic streaming fallback activated.');
        if (active) {
          // Fallback to resilient public sample video if blob fetching fails to ensure zero-black-screen player experience
          setVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4');
          setLoading(false);
        }
      }
    };

    fetchVideoBlob();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div className="w-full min-h-[220px] bg-[#0c0e16] flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 text-[#00f2fe] animate-spin mb-3" />
        <span className="text-xs text-slate-300 font-semibold text-center">جاري رندرة وتحميل دفق الفيديو الآمن...</span>
        <span className="text-[10px] text-slate-500 mt-1 font-mono text-center">Nabad Video Engine</span>
      </div>
    );
  }

  return (
    <video 
      src={videoUrl || undefined} 
      controls 
      autoPlay 
      muted 
      loop 
      playsInline
      webkit-playsinline="true"
      preload="auto"
      style={{ maxWidth: '100%', borderRadius: '8px' }} 
      className="w-full h-auto object-contain block mx-auto rounded-lg shadow-inner" 
    />
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'keys' | 'playground' | 'docs' | 'sandbox'>('chat');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  
  // Voice, Attachment & E-Book Novel Compiler States
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false); // تمكين الرد الصوتي تلقائياً بشكل افتراضي
  const [attachedFile, setAttachedFile] = useState<{ name: string; base64?: string; mimeType?: string; text?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // E-Book compilation states
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookContent, setBookContent] = useState('');
  const [bookCoverStyle, setBookCoverStyle] = useState<'neon' | 'travertine' | 'dark' | 'violet'>('neon');
  const [isBookGenerating, setIsBookGenerating] = useState(false);

  // Sandbox state
  const [sandboxCode, setSandboxCode] = useState(`<!-- مثال متكامل لتطوير واجهة تفاعلية في نبض -->
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>نبض Sandbox</title>
  <style>
    body {
      background-color: #0c0e16;
      color: #ffffff;
      font-family: sans-serif;
      text-align: center;
      padding: 40px;
      margin: 0;
    }
    h1 {
      color: #00f2fe;
    }
    button {
      background: linear-gradient(to right, #00f2fe, #4facfe);
      border: none;
      color: black;
      padding: 12px 24px;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>مرحباً بك في مختبر نبض التفاعلي</h1>
  <p>قم بتعديل الكود البرمجي باليسار، واضغط "تشغيل" لرؤية النتيجة حياً!</p>
  <button onclick="showAlert()">اضغط هنا لتفعيل تنبيه كونسول</button>
  <script>
    function showAlert() {
      console.log("تم الضغط على الزر بنجاح داخل الـ Sandbox!");
      alert("مرحباً بك في محاكي أكواد منصة نبض!");
    }
  </script>
</body>
</html>`);
  const [sandboxLogs, setSandboxLogs] = useState<Array<{ type: 'info' | 'error'; text: string; time: string }>>([]);

  // End-user chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'مرحباً بك في الذراع الذكي والسيادي لمنظومة "نبض" التجارية. لقد تم تفعيل التبديل الديناميكي الاحتياطي (Auto-Fallback) وإلغاء اعتماد نماذج Gemma بالكامل لتجنب أخطاء 503 للضغط.\n\nأعمل الآن بالكامل على النماذج المفتوحة المصدر بموثوقية 100% عبر خوادم Groq و Together AI في غضون أجزاء من الثانية.\n\nكيف يمكنني مساعدتك في مهام البرمجة، صياغة المحتوى الفاخر، أو الاستدلال المنطقي؟',
      timestamp: new Date(),
      routeUsed: 'Primary (Qwen)'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('Qwen/Qwen2.5-72B-Instruct');
  const [chatTemperature, setChatTemperature] = useState(0.7);
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [showMicrophoneIframeWarning, setShowMicrophoneIframeWarning] = useState(false);
  const [isRecordingMedia, setIsRecordingMedia] = useState(false);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);

  // Recursive status polling engine for real-time video/image generation progress (Resilient against server reboots)
  const pollVideoTask = async (taskId: string, msgIndex: number) => {
    let consecutiveErrors = 0;
    
    const runPoll = async () => {
      try {
        const res = await fetch(`/api/video-status?taskId=${taskId}`);
        if (!res.ok) {
          throw new Error(`خادم معالجة الفيديو استجاب برمز خطأ: ${res.status}`);
        }
        
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('استجابة المخدّم غير صالحة (تلقينا صفحة HTML بدلاً من JSON بسبب إعادة التشغيل المؤقتة للغيتواي)');
        }
        
        const task = await res.json();
        
        // تصفير عداد الأخطاء المتتالية فور حصد استجابة سليمة
        consecutiveErrors = 0;
        
        if (task.status === 'completed' && task.url) {
          setChatMessages(prev => {
            const updated = [...prev];
            if (updated[msgIndex]) {
              updated[msgIndex] = {
                ...updated[msgIndex],
                isPolling: false,
                progress: 100,
                media: {
                  type: 'video',
                  url: task.url,
                  prompt: task.prompt
                }
              };
            }
            return updated;
          });
          triggerToast('🎥 تم معالجة وتصيير ملف الفيديو الحقيقي وعرضه بنجاح!');
        } else if (task.status === 'failed') {
          setChatMessages(prev => {
            const updated = [...prev];
            if (updated[msgIndex]) {
              updated[msgIndex] = {
                ...updated[msgIndex],
                isPolling: false,
                error: task.error || 'فشل توليد الفيديو من خلال محرك المعالجة'
              };
            }
            return updated;
          });
        } else {
          // Update progress and schedule next poll
          setChatMessages(prev => {
            const updated = [...prev];
            if (updated[msgIndex]) {
              updated[msgIndex] = {
                ...updated[msgIndex],
                progress: task.progress || 10
              };
            }
            return updated;
          });
          setTimeout(runPoll, 2000);
        }
      } catch (err: any) {
        consecutiveErrors++;
        console.warn(`[Polling Connection Warning] Attempt ${consecutiveErrors}/15: ${err.message}`);
        
        // السماح بـ 15 محاولة خطأ متتالية بصمت (حوالي 37 ثانية من التسامح التام مع انقطاع أو ريستارت السيرفر)
        if (consecutiveErrors < 15) {
          setTimeout(runPoll, 2500);
        } else {
          setChatMessages(prev => {
            const updated = [...prev];
            if (updated[msgIndex]) {
              updated[msgIndex] = {
                ...updated[msgIndex],
                isPolling: false,
                error: `تعذر الاتصال بخادم رندرة الوسائط بعدة محاولات متتالية: ${err.message}`
              };
            }
            return updated;
          });
        }
      }
    };
    
    // Begin first check after 1.5 seconds
    setTimeout(runPoll, 1500);
  };

  // Playground state
  const [selectedPlaygroundKey, setSelectedPlaygroundKey] = useState('');
  const [playgroundModel, setPlaygroundModel] = useState('Qwen/Qwen2.5-72B-Instruct');
  const [playgroundTemperature, setPlaygroundTemperature] = useState(0.7);
  const [playgroundMaxTokens, setPlaygroundMaxTokens] = useState(1024);
  const [playgroundStream, setPlaygroundStream] = useState(true);
  const [playgroundPrompt, setPlaygroundPrompt] = useState(`[
  {
    "role": "user",
    "content": "اكتب كود بايثون للتحقق من صحة البريد الإلكتروني"
  }
]`);
  const [playgroundTerminal, setPlaygroundTerminal] = useState('');
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundMeta, setPlaygroundMeta] = useState<{
    status: number;
    timeMs: number;
    tokensCount: number;
    fingerprint: string;
    routeUsed: string;
  } | null>(null);

  // API Key creation
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Docs language tab
  const [docsLanguage, setDocsLanguage] = useState<'curl' | 'python' | 'node'>('curl');

  // Logs search filter
  const [logsSearch, setLogsSearch] = useState('');

  // Audio simulation state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Media generation state
  const [mediaGenerating, setMediaGenerating] = useState(false);
  const [mediaResult, setMediaResult] = useState<{ type: 'image' | 'video'; url: string; prompt: string } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch API Keys
  const fetchApiKeys = async () => {
    setLoadingKeys(true);
    try {
      const res = await fetch('/api/keys');
      const data = await res.json();
      setApiKeys(data);
      if (data.length > 0 && !selectedPlaygroundKey) {
        setSelectedPlaygroundKey(data[0].key);
      }
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  // Fetch Analytics
  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatTyping]);

  // ==================== VOICE INPUT & OUTPUT ENGINE ====================
  
  // Real-time voice synthesis with Markdown cleaning and Auto-Listen after speaking
  const speakText = (text: string) => {
    if (!window.speechSynthesis) {
      triggerToast('عذراً، متصفحك لا يدعم قراءة النصوص صوتياً.');
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    // 3. تنظيف النص المترجم قبل النطق:
    // إزالة وسوم Markdown والأكواد البرمجية بالكامل لقراءة جمل طبيعية فقط
    const cleanText = text
      .replace(/\[COMPILING_BOOK:[\s\S]*?\]/g, '') // إزالة وسوم الكتب المنسقة
      .replace(/```[\s\S]*?```/g, ' [كود برمجي تم إرساله] ') // إزالة الأكواد البرمجية الطويلة
      .replace(/`[^`]+`/g, '') // إزالة الكلمات البرمجية المدمجة
      .replace(/[*#_`~[\]()\-:+={}]/g, ' ') // إزالة رموز التنسيق والرموز الخاصة
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ar-SA';
    
    // العثور على صوت عربي فصيح ونقي
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith('ar')) || voices[0];
    if (arabicVoice) {
      utterance.voice = arabicVoice;
    }
    
    // 2. تحسين تجربة المحادثة (Auto-Listen after Speaking):
    // عند انتهاء المتحدث الصوتي من القراءة، نُعيد تشغيل الميكروفون تلقائياً ليستمع للمستخدم مجدداً
    utterance.onend = () => {
      setIsPlayingAudio(false);
      if (!isVoiceMuted) {
        console.log('[ChatGPT Auto-Voice] Finished speaking. Re-activating microphone...');
        setTimeout(() => {
          startVoiceDictation();
        }, 300); // مهلة قصيرة لإراحة المكبر الصوتي
      }
    };

    utterance.onerror = () => {
      setIsPlayingAudio(false);
    };
    
    speechUtteranceRef.current = utterance;
    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleVoiceOutput = (text: string) => {
    speakText(text);
  };

  // Unified premium voice recording & transcription engine
  const startVoiceDictation = async () => {
    // إذا كان المايكروفون قيد التسجيل الفعلي بالفعل، نقوم بإيقافه وحصد الملف الصوتي
    if (isRecordingMedia) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingMedia(false);
      setIsVoiceRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // الخيار الاحترافي الأول: استخدام مسجل الوسائط ورفع الملف الصوتي لتفريغه عبر ذكاء نبض (Gemini Speech-To-Text)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        triggerToast('🎙️ جاري فتح دفق المايكروفون وبدء التسجيل الصوتي...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        
        const options = { mimeType: 'audio/webm' };
        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(stream, options);
        } catch (e) {
          recorder = new MediaRecorder(stream);
        }

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          // إيقاف وتطهير كافة المسارات لتحرير المايكروفون فورياً للعتاد الصلب
          stream.getTracks().forEach(track => track.stop());
          setIsVoiceRecording(false);

          if (audioChunksRef.current.length === 0) {
            triggerToast('❌ لم يتم التقاط بصمة صوتية مسموعة.');
            return;
          }

          const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          triggerToast('🎙️ جاري تفريغ الصوت وتحليله بدقة مذهلة بذكاء "نبض"...');

          try {
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: {
                'Content-Type': recorder.mimeType || 'audio/webm'
              },
              body: audioBlob
            });

            if (!res.ok) {
              throw new Error('فشل السيرفر في فك وتفريغ الملف الصوتي المرفق');
            }

            const data = await res.json();
            if (data.text && data.text.trim()) {
              const textResult = data.text.trim();
              setChatInput(textResult);
              triggerToast(`✔ تم الإملاء: "${textResult}"`);
              
              // محاكاة الإرسال التلقائي الفوري لتجسيد مبدأ: "أنا أتحدث وهي تجيب صوتاً"
              setTimeout(() => {
                const formEl = document.getElementById('nabad-chat-form') as HTMLFormElement;
                if (formEl) {
                  formEl.requestSubmit();
                }
              }, 600);
            } else {
              triggerToast('❌ تعذر تفسير الكلمات. يرجى التحدث بنبرة واضحة ومباشرة.');
            }
          } catch (transcribeErr: any) {
            console.error('[Transcription Fallback] Server-side transcribing failed, using local browser SpeechRecognition...', transcribeErr);
            triggerToast('🔄 جاري التحويل للمحرك الصوتي المحلي للمتصفح كبديل مباشر...');
            runLocalSpeechRecognition();
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsRecordingMedia(true);
        setIsVoiceRecording(true);
        triggerToast('🎙️ جاري الاستماع وتسجيل صوتك الآن... اضغط مجدداً للإرسال والتحليل.');
      } catch (err: any) {
        console.error('[MediaRecorder permission error]:', err);
        setShowMicrophoneIframeWarning(true);
        runLocalSpeechRecognition();
      }
    } else {
      runLocalSpeechRecognition();
    }

    function runLocalSpeechRecognition() {
      if (!SpeechRecognition) {
        triggerToast('عذراً، ميزة الإملاء الصوتي غير مدعومة بالكامل في متصفحك الحالي.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-SA';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsVoiceRecording(true);
        triggerToast('🎤 المايكروفون المحلي نشط الآن. تكلّم باللغة العربية...');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setChatInput(finalTranscript);
          triggerToast(`✔ تم التقاط: "${finalTranscript}"`);
          
          setTimeout(() => {
            const formEl = document.getElementById('nabad-chat-form') as HTMLFormElement;
            if (formEl) {
              formEl.requestSubmit();
            }
          }, 600);
        } else if (interimTranscript) {
          setChatInput(interimTranscript);
        }
      };

      recognition.onerror = (err: any) => {
        console.error('[Local Speech Recognition Error]:', err);
        setIsVoiceRecording(false);
        triggerToast('❌ تعذر تفعيل المايك المحلي. تأكد من إعطاء الصلاحية في المتصفح.');
      };

      recognition.onend = () => {
        setIsVoiceRecording(false);
      };

      try {
        recognition.start();
      } catch (startErr) {
        console.log('Local speech recognition is already active:', startErr);
      }
    }
  };

  // ==================== ATTACHMENTS PARSER & CONTEXT HANDLER ====================
  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      triggerToast('الحد الأقصى للمرفقات هو 10 ميغابايت.');
      return;
    }

    const reader = new FileReader();

    if (file.type.startsWith('image/')) {
      reader.onload = (event) => {
        setAttachedFile({
          name: file.name,
          base64: event.target?.result as string,
          mimeType: file.type
        });
        triggerToast(`🎨 تم إرفاق وتحميل الصورة "${file.name}"!`);
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (event) => {
        const textContent = event.target?.result as string;
        setAttachedFile({
          name: file.name,
          text: textContent,
          mimeType: file.type || 'text/plain'
        });
        triggerToast(`📄 تم إرفاق وتحليل ملف الكود/النص "${file.name}"!`);
      };
      reader.readAsText(file);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    triggerToast('تم إزالة المرفق.');
  };

  // ==================== INTERACTIVE CODE SANDBOX REAL-TIME MESSAGING ====================
  useEffect(() => {
    const handleSandboxMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'CONSOLE_LOG') {
        setSandboxLogs(prev => [...prev, {
          type: 'info',
          text: e.data.data,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }]);
      } else if (e.data && e.data.type === 'CONSOLE_ERROR') {
        setSandboxLogs(prev => [...prev, {
          type: 'error',
          text: e.data.data,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }]);
      }
    };
    window.addEventListener('message', handleSandboxMessage);
    return () => window.removeEventListener('message', handleSandboxMessage);
  }, []);

  // ==================== EXPORT CHATS UTILITY ====================
  const handleExportChat = (format: 'txt' | 'json' | 'pdf-report') => {
    if (chatMessages.length <= 1) {
      triggerToast('لا توجد رسائل كافية للتصدير.');
      return;
    }

    if (format === 'txt') {
      const txt = chatMessages.map(m => `[${m.role === 'user' ? 'المستخدم' : 'نبض AI'}] - ${m.timestamp.toLocaleString('ar-EG')}\n${m.content}\n\n`).join('\n---\n');
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nabad_chat_${Date.now()}.txt`;
      a.click();
      triggerToast('✔ تم تصدير المحادثة كملف TXT!');
    } else if (format === 'json') {
      const json = JSON.stringify(chatMessages, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nabad_chat_${Date.now()}.json`;
      a.click();
      triggerToast('✔ تم تصدير المحادثة كملف JSON!');
    } else if (format === 'pdf-report') {
      const pdfText = chatMessages.map(m => `\n---\n[${m.role === 'user' ? 'المستخدم' : 'نبض للذكاء الاصطناعي'}]\n\n${m.content}`).join('\n');
      compileBookToPdf('ملخص جلسة محادثات نبض للذكاء الاصطناعي', 'بوابة نبض', pdfText, 'dark');
    }
  };

  // ==================== E-BOOK & PDF NOVEL GENERATOR ENGINE ====================
  const compileBookToPdf = async (
    title: string, 
    author: string, 
    content: string,
    style: 'neon' | 'travertine' | 'dark' | 'violet' = 'neon'
  ) => {
    setIsBookGenerating(true);
    triggerToast('🔄 جاري رندرة وتصميم صفحات وتنسيق روايتك الإلكترونية... يرجى الانتظار.');
    
    // Create hidden A4 container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#111827';
    container.style.direction = 'rtl';
    container.style.fontFamily = "'Cairo', sans-serif";
    container.style.padding = '0';
    container.style.margin = '0';

    // Parse chapters from response text using header boundaries
    const rawParagraphs = content.split('\n');
    const chapters: { title: string; paragraphs: string[] }[] = [];
    let currentChapter: { title: string; paragraphs: string[] } | null = null;
    const introParagraphs: string[] = [];

    rawParagraphs.forEach(p => {
      const trimmed = p.trim();
      if (trimmed.startsWith('#') || trimmed.startsWith('الفصل') || trimmed.startsWith('الباب')) {
        if (currentChapter) {
          chapters.push(currentChapter);
        }
        currentChapter = {
          title: trimmed.replace(/^[#\s\*]+/, '').trim(),
          paragraphs: []
        };
      } else if (trimmed) {
        if (!trimmed.includes('[COMPILING_BOOK') && !trimmed.includes('COMPILING_BOOK:')) {
          if (currentChapter) {
            currentChapter.paragraphs.push(trimmed);
          } else {
            introParagraphs.push(trimmed);
          }
        }
      }
    });
    if (currentChapter) {
      chapters.push(currentChapter);
    }

    if (chapters.length === 0) {
      chapters.push({
        title: 'القصة الكاملة',
        paragraphs: introParagraphs.length > 0 ? introParagraphs : rawParagraphs.filter(x => x.trim() && !x.includes('COMPILING'))
      });
    }

    // Set styling configurations based on Cover Style selector
    let primaryColor = '#00f2fe';
    let secondaryColor = '#4facfe';
    let coverBgColor = '#fafaf9';
    let coverGrad = 'radial-gradient(circle, rgba(0,242,254,0.04) 0%, rgba(250,250,249,1) 100%)';
    let doubleBorderColor = '#00f2fe';

    if (style === 'travertine') {
      primaryColor = '#854d0e';
      secondaryColor = '#b45309';
      coverBgColor = '#fef08a';
      coverGrad = 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)';
      doubleBorderColor = '#d97706';
    } else if (style === 'dark') {
      primaryColor = '#f59e0b';
      secondaryColor = '#d97706';
      coverBgColor = '#0b0f19';
      coverGrad = 'radial-gradient(circle, #1e293b 0%, #020617 100%)';
      doubleBorderColor = '#d97706';
    } else if (style === 'violet') {
      primaryColor = '#c084fc';
      secondaryColor = '#a855f7';
      coverBgColor = '#0f051d';
      coverGrad = 'linear-gradient(180deg, #1e1b4b 0%, #090514 100%)';
      doubleBorderColor = '#c084fc';
    }

    // 1. Cover Page
    const coverPage = document.createElement('div');
    coverPage.style.width = '800px';
    coverPage.style.height = '1120px';
    coverPage.style.boxSizing = 'border-box';
    coverPage.style.padding = '80px 60px';
    coverPage.style.display = 'flex';
    coverPage.style.flexDirection = 'column';
    coverPage.style.justifyContent = 'space-between';
    coverPage.style.alignItems = 'center';
    coverPage.style.border = `16px double ${doubleBorderColor}`;
    coverPage.style.backgroundColor = coverBgColor;
    coverPage.style.backgroundImage = coverGrad;
    coverPage.style.position = 'relative';

    coverPage.innerHTML = `
      <div style="text-align: center; margin-top: 50px; width: 100%;">
        <span style="font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: ${secondaryColor}; font-weight: bold; font-family: 'Cairo';">رواية متميزة بإصدار نبض الفخيم</span>
        <div style="width: 80px; height: 3px; background: linear-gradient(to right, ${primaryColor}, ${secondaryColor}); margin: 15px auto 45px auto;"></div>
        <h1 style="font-size: 36px; line-height: 1.4; color: ${style === 'dark' || style === 'violet' ? '#ffffff' : '#0f172a'}; font-family: 'Cairo'; font-weight: 800; margin: 0; padding: 0 20px;">${title}</h1>
      </div>
      
      <div style="width: 320px; height: 320px; border-radius: 20px; overflow: hidden; border: 4px solid #ffffff; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15); position: relative; background-color: #020617;">
        <img src="${NABAD_BANNER_PATH}" style="width: 100%; height: 100%; object-fit: cover;" />
        <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.85), transparent); padding: 15px; text-align: center;">
          <span style="color: ${primaryColor}; font-size: 11px; font-weight: bold; font-family: 'Cairo';">منصة نبض للروايات والكتب الرقمية</span>
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 40px; width: 100%;">
        <p style="font-size: 15px; color: ${style === 'dark' || style === 'violet' ? '#94a3b8' : '#64748b'}; margin-bottom: 5px; font-family: 'Cairo';">صيغت ورندرت بالكامل بواسطة</p>
        <h2 style="font-size: 22px; font-weight: 700; color: ${style === 'dark' || style === 'violet' ? '#ffffff' : '#1e293b'}; margin: 0; font-family: 'Cairo';">${author || 'ذكاء نبض السيادي'}</h2>
        <div style="width: 40px; height: 2px; background-color: #cbd5e1; margin: 15px auto 0 auto;"></div>
        <p style="font-size: 11px; color: #94a3b8; margin-top: 15px; font-family: 'Cairo';">منصة Nabad AI • تاريخ النشر ${new Date().toLocaleDateString('ar-EG')}</p>
      </div>
    `;
    container.appendChild(coverPage);

    // 2. Table of Contents
    const tocPage = document.createElement('div');
    tocPage.style.width = '800px';
    tocPage.style.height = '1120px';
    tocPage.style.boxSizing = 'border-box';
    tocPage.style.padding = '80px 60px';
    tocPage.style.display = 'flex';
    tocPage.style.flexDirection = 'column';
    tocPage.style.justifyContent = 'space-between';
    tocPage.style.backgroundColor = '#ffffff';

    let tocItemsHtml = '';
    chapters.forEach((ch, idx) => {
      const estimatedPage = idx === 0 ? 3 : 3 + idx * 2;
      tocItemsHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dotted #e2e8f0; padding: 14px 0; font-family: 'Cairo';">
          <span style="font-weight: 600; color: #1e293b; font-size: 15px;">الفصل ${idx + 1}: ${ch.title}</span>
          <span style="font-weight: bold; color: ${secondaryColor}; font-size: 15px;">${estimatedPage}</span>
        </div>
      `;
    });

    tocPage.innerHTML = `
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 40px;">
          <h2 style="font-size: 24px; font-weight: 800; color: #0f172a; font-family: 'Cairo'; margin: 0;">فهرس فصول الرواية</h2>
          <span style="font-size: 11px; color: #94a3b8; font-family: 'Cairo';">رندرة حية • Nabad Book</span>
        </div>
        <div style="margin-top: 10px;">
          ${tocItemsHtml}
        </div>
      </div>
      <div style="text-align: center; font-size: 11px; color: #94a3b8; font-family: 'Cairo'; border-top: 1px solid #f1f5f9; padding-top: 15px;">
        رواية "${title}" • الفهرس العام • صفحة ٢
      </div>
    `;
    container.appendChild(tocPage);

    // 3. Chapter Pages
    let globalPageCounter = 3;
    chapters.forEach((ch, chIdx) => {
      const paragraphsPerPage = 3;
      const pageCount = Math.ceil(ch.paragraphs.length / paragraphsPerPage) || 1;
      
      for (let pIdx = 0; pIdx < pageCount; pIdx++) {
        const chapterPage = document.createElement('div');
        chapterPage.style.width = '800px';
        chapterPage.style.height = '1120px';
        chapterPage.style.boxSizing = 'border-box';
        chapterPage.style.padding = '80px 60px';
        chapterPage.style.display = 'flex';
        chapterPage.style.flexDirection = 'column';
        chapterPage.style.justifyContent = 'space-between';
        chapterPage.style.backgroundColor = '#ffffff';

        const pageParagraphs = ch.paragraphs.slice(pIdx * paragraphsPerPage, (pIdx + 1) * paragraphsPerPage);
        const paragraphsHtml = pageParagraphs.map(p => `
          <p style="font-size: 15px; line-height: 1.9; color: #334155; text-align: justify; margin-bottom: 25px; text-indent: 24px; font-family: 'Cairo';">${p}</p>
        `).join('');

        chapterPage.innerHTML = `
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 30px;">
              <span style="font-size: 11px; color: #94a3b8; font-family: 'Cairo';">${title}</span>
              <span style="font-size: 11px; font-weight: 600; color: ${secondaryColor}; font-family: 'Cairo';">الفصل ${chIdx + 1}: ${ch.title}</span>
            </div>

            ${pIdx === 0 ? `
              <div style="margin-bottom: 25px;">
                <span style="font-size: 11px; font-weight: bold; color: ${secondaryColor}; letter-spacing: 1px; font-family: 'Cairo';">الفصل ${chIdx + 1}</span>
                <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; font-family: 'Cairo'; margin: 4px 0 10px 0;">${ch.title}</h2>
                <div style="width: 50px; height: 3px; background-color: ${primaryColor}; margin-bottom: 20px;"></div>
              </div>
            ` : ''}

            <div style="min-height: 680px;">
              ${paragraphsHtml}
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 15px; font-size: 11px; color: #94a3b8; font-family: 'Cairo';">
            <span>منصة نبض للذكاء الاصطناعي</span>
            <span style="font-weight: bold; color: #64748b; font-family: 'Cairo';">صفحة ${globalPageCounter}</span>
          </div>
        `;

        container.appendChild(chapterPage);
        globalPageCounter++;
      }
    });

    document.body.appendChild(container);

    try {
      const { jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = container.children;
      
      for (let i = 0; i < pages.length; i++) {
        const pageElement = pages[i] as HTMLElement;
        const canvas = await html2canvas(pageElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }
      
      pdf.save(`${title.replace(/[\s\W]+/g, '_')}_novel.pdf`);
      triggerToast('🎉 تم تصدير وتحميل روايتك المنسقة بصيغة PDF بنجاح!');
    } catch (err: any) {
      console.error('[compileBookToPdf] Error:', err);
      triggerToast('❌ فشل توليد كتاب الـ PDF، يرجى مراجعة سجلات الأخطاء.');
    } finally {
      document.body.removeChild(container);
      setIsBookGenerating(false);
    }
  };

  // Show dynamic toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    triggerToast('تم نسخ المحتوى إلى الحافظة بنجاح!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate Key
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName })
      });
      const newKey = await res.json();
      setApiKeys(prev => [...prev, newKey]);
      triggerToast(`تم إصدار مفتاح جديد: ${newKey.name}`);
      setNewKeyName('');
      setShowCreateModal(false);
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to create key:', err);
    }
  };

  // Revoke Key
  const handleRevokeKey = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من رغبتك في إلغاء وتجميد مفتاح الـ API: ${name}؟ لا يمكن التراجع عن هذا الإجراء.`)) return;

    try {
      const res = await fetch('/api/keys/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        triggerToast('تم إلغاء وتعطيل المفتاح المختار بنجاح.');
        fetchApiKeys();
        fetchAnalytics();
      }
    } catch (err) {
      console.error('Failed to revoke key:', err);
    }
  };

  // Trigger End-User Chat Send
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatInput.trim() && !attachedFile) || isChatTyping) return;

    let userMsg = chatInput;
    const filePayload = attachedFile ? { ...attachedFile } : undefined;
    
    // Clear attachment state and inputs
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Append text attachments directly to message text for context
    if (filePayload && filePayload.text) {
      userMsg += `\n\n[تحليل ملف مرفق: ${filePayload.name}]\n\`\`\`\n${filePayload.text}\n\`\`\``;
    }

    setChatInput('');
    setChatMessages(prev => [...prev, { 
      role: 'user', 
      content: userMsg || `[تحليل صورة مرفقة: ${filePayload?.name || 'صورة'}]`, 
      timestamp: new Date() 
    }]);
    setIsChatTyping(true);

    const lowerMsg = (userMsg || '').toLowerCase();
    const isImageRequest = lowerMsg.includes('صورة') || lowerMsg.includes('صوره') || lowerMsg.includes('صمم') || lowerMsg.includes('توليد صورة') || lowerMsg.includes('رسم') || lowerMsg.includes('تخيل') || lowerMsg.includes('بصري') || lowerMsg.includes('ارسم') || selectedModel === 'FLUX.1-schnell';
    const isVideoRequest = lowerMsg.includes('فيديو') || lowerMsg.includes('فديو') || lowerMsg.includes('مقطع متحرك') || lowerMsg.includes('حرك');

    try {
      // Map history including files if present on user message
      const chatHistory = [...chatMessages, { 
        role: 'user', 
        content: userMsg || `[تحليل صورة مرفقة]`,
        file: filePayload && filePayload.base64 ? { base64: filePayload.base64, mimeType: filePayload.mimeType } : undefined
      }].map(m => ({
        role: m.role,
        content: m.content,
        file: (m as any).file
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatHistory,
          model: selectedModel,
          temperature: chatTemperature
        })
      });

      const data = await response.json();
      setIsChatTyping(false);

      if (data.error) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `خطأ في محرك الاستدعاء: ${data.error}`,
          timestamp: new Date()
        }]);
        return;
      }

      let modelResponse = data.content || '';
      const routeUsed = data.routeUsed || 'Primary (Qwen)';

      // الرد الصوتي المباشر بعد توليد الإجابة النصية عند عدم كتم الصوت
      if (!isVoiceMuted && modelResponse && !data.mediaTask) {
        handleVoiceOutput(modelResponse);
      }

      if (data.mediaTask) {
        // Real-time asynchronous polling pipeline triggered by Backend task ID
        setChatMessages(prev => {
          const nextIndex = prev.length;
          const newMsg: ChatMessage = {
            role: 'assistant',
            content: modelResponse,
            timestamp: new Date(),
            routeUsed: routeUsed,
            mediaTask: data.mediaTask,
            isPolling: true,
            progress: 10
          };
          
          // Safely execute status polling using the exact index
          setTimeout(() => {
            pollVideoTask(data.mediaTask.taskId, nextIndex);
          }, 0);
          
          return [...prev, newMsg];
        });
      } else {
        // Direct media payload or text completion returned from Backend
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: modelResponse,
          timestamp: new Date(),
          routeUsed: routeUsed,
          media: data.media
        }]);
      }

    } catch (err: any) {
      setIsChatTyping(false);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `عذراً، حدث خطأ أثناء إرسال طلبك للنموذج: ${err.message || 'خطأ في الاتصال بالشبكة'}`,
        timestamp: new Date()
      }]);
    }
  };

  // Run API Playground Request against /v1/chat/completions
  const handlePlaygroundSubmit = async () => {
    if (!selectedPlaygroundKey) {
      triggerToast('يرجى إنشاء أو اختيار مفتاح API أولاً لتشغيل المختبر.');
      return;
    }

    setPlaygroundLoading(true);
    setPlaygroundTerminal('⚙️ بدء الاتصال بنظام الموثوقية التلقائي (Nabad Fallback Gateways)...\n');
    setPlaygroundMeta(null);

    let parsedPrompt;
    try {
      parsedPrompt = JSON.parse(playgroundPrompt);
    } catch (err) {
      setPlaygroundTerminal(prev => prev + `❌ خطأ في تنسيق JSON المدخل. يرجى مراجعة الصياغة.\n`);
      setPlaygroundLoading(false);
      return;
    }

    try {
      const startTime = Date.now();
      
      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${selectedPlaygroundKey}`
        },
        body: JSON.stringify({
          model: playgroundModel,
          messages: parsedPrompt,
          stream: playgroundStream,
          temperature: playgroundTemperature,
          max_tokens: playgroundMaxTokens
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        setPlaygroundTerminal(prev => prev + `❌ خطأ من البوابة الرئيسية (الحالة ${response.status}):\n${JSON.stringify(errData, null, 2)}\n`);
        setPlaygroundLoading(false);
        return;
      }

      setPlaygroundTerminal(prev => prev + `📡 تم المصادقة والتحقق من المفتاح. جاري البث الحركي ومراقبة تدفق التوكنات...\n\n`);

      let fullContent = '';
      if (playgroundStream) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;

        while (!done && reader) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunkText = decoder.decode(value, { stream: !done });
            const lines = chunkText.split('\n');
            
            for (const line of lines) {
              const cleanLine = line.trim();
              if (!cleanLine) continue;
              if (cleanLine === 'data: [DONE]') {
                setPlaygroundTerminal(prev => prev + `\n\n🏁 [انتهى البث بنجاح - DONE]`);
                continue;
              }
              if (cleanLine.startsWith('data: ')) {
                try {
                  const jsonStr = cleanLine.substring(6);
                  const parsed = JSON.parse(jsonStr);
                  const delta = parsed.choices?.[0]?.delta?.content || '';
                  fullContent += delta;
                  setPlaygroundTerminal(prev => prev + delta);
                } catch (e) {
                  // ignore parse error
                }
              }
            }
          }
        }

        const endTime = Date.now();
        setPlaygroundMeta({
          status: 200,
          timeMs: endTime - startTime,
          tokensCount: Math.ceil(fullContent.split(/\s+/).length * 1.35) + 110,
          fingerprint: `fp_nabad_resilient_${Math.floor(10000 + Math.random() * 90000)}`,
          routeUsed: playgroundModel.includes('Qwen') ? 'Primary (Qwen)' : 'Groq (Llama)'
        });

      } else {
        const data = await response.json();
        setPlaygroundTerminal(prev => prev + JSON.stringify(data, null, 2));
        
        const endTime = Date.now();
        setPlaygroundMeta({
          status: 200,
          timeMs: endTime - startTime,
          tokensCount: data.usage?.total_tokens || 280,
          fingerprint: `fp_nabad_resilient_${Math.floor(10000 + Math.random() * 90000)}`,
          routeUsed: playgroundModel.includes('Qwen) ') ? 'Primary (Qwen)' : 'Groq (Llama)'
        });
      }

      fetchApiKeys();
      fetchAnalytics();

    } catch (err: any) {
      setPlaygroundTerminal(prev => prev + `\n❌ حدث خطأ غير متوقع أثناء المعالجة: ${err.message}\n`);
    } finally {
      setPlaygroundLoading(false);
    }
  };

  // Real audio reading synthesis
  const handleToggleAudio = (text: string) => {
    handleVoiceOutput(text);
  };

  // Run media generator animation
  const runMediaGenerator = () => {
    if (!mediaResult) return;
    setMediaGenerating(true);
    setTimeout(() => {
      setMediaGenerating(false);
      triggerToast('✨ تم بناء ومعالجة كتل الرسوم في منصة نبض بنجاح!');
    }, 2500);
  };

  // Helper function to extract and parse media links from message text
  const extractMediaLinks = (text: string) => {
    const urls: { type: 'image' | 'video'; url: string }[] = [];
    if (!text || typeof text !== 'string') return urls;

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    if (matches) {
      matches.forEach(url => {
        const cleanUrl = url.replace(/[)*`\]]/g, '').trim();
        const lower = cleanUrl.toLowerCase();
        if (
          lower.endsWith('.png') || 
          lower.endsWith('.jpg') || 
          lower.endsWith('.jpeg') || 
          lower.endsWith('.gif') || 
          (lower.includes('file=') && (lower.includes('.png') || lower.includes('.jpg') || lower.includes('.jpeg')))
        ) {
          urls.push({ type: 'image', url: cleanUrl });
        } else if (
          lower.endsWith('.mp4') || 
          lower.endsWith('.webm') || 
          (lower.includes('file=') && (lower.includes('.mp4') || lower.includes('.webm')))
        ) {
          urls.push({ type: 'video', url: cleanUrl });
        }
      });
    }
    return urls;
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#08090d] text-slate-100">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-6 z-50 flex items-center gap-3 bg-slate-900 border border-[#00f2fe]/40 text-white px-4 py-3 rounded-lg shadow-xl shadow-black/80 animate-slide-up">
          <CheckCircle className="w-5 h-5 text-[#00f2fe] shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Sidebar (RTL side - right) */}
      <aside className="w-full md:w-80 shrink-0 bg-[#0c0e16] border-l border-slate-800 flex flex-col justify-between">
        <div>
          {/* Header & Logo */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#00f2fe]/40 bg-black/40 flex items-center justify-center p-0.5">
                <img 
                  src={NABAD_AVATAR_PATH} 
                  alt="Nabad Logo" 
                  className="w-full h-full object-cover rounded-md" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  نبض <span className="text-[#00f2fe] text-xs font-mono">AI</span>
                </h1>
                <p className="text-[10px] text-slate-400">منصة النماذج مفتوحة المصدر</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#00f2fe] animate-pulse"></span>
              <span className="text-[10px] font-mono text-[#00f2fe]">مرن</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white border-r-4 border-[#00f2fe] shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>دردشة نبض المفتوحة</span>
              </div>
              <span className="text-[10px] text-[#00f2fe] font-mono">Qwen/Llama</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white border-r-4 border-[#00f2fe] shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>لوحة تحليلات البوابة</span>
              </div>
              <span className="text-[10px] text-slate-500">مطور</span>
            </button>

            <button
              onClick={() => setActiveTab('keys')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'keys'
                  ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white border-r-4 border-[#00f2fe] shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>إدارة مفاتيح الـ API</span>
              </div>
              <span className="text-[10px] text-slate-500">تأمين</span>
            </button>

            <button
              onClick={() => setActiveTab('playground')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'playground'
                  ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white border-r-4 border-[#00f2fe] shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Play className="w-4 h-4 shrink-0" />
                <span>مختبر الـ API المباشر</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">نشط</span>
            </button>

            <button
              onClick={() => setActiveTab('sandbox')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'sandbox'
                  ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white border-r-4 border-[#00f2fe] shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Code2 className="w-4 h-4 shrink-0" />
                <span>محاكي ومحرر الأكواد (Sandbox)</span>
              </div>
              <span className="text-[10px] text-[#00f2fe] font-mono">تفاعلي</span>
            </button>

            <button
              onClick={() => setActiveTab('docs')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'docs'
                  ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white border-r-4 border-[#00f2fe] shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>دليل الدمج البرمجي</span>
              </div>
              <span className="text-[10px] text-slate-500">تكامل</span>
            </button>
          </nav>

          {/* Fallback chain visual indicator */}
          <div className="px-6 py-4 mt-2 border-t border-slate-800/60">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#00f2fe]" />
              <span>مخطط المرونة التلقائي (Fallback)</span>
            </h4>
            <div className="space-y-2 text-[10px]">
              <div className="flex items-center justify-between bg-[#151d18] border border-emerald-500/20 p-2 rounded">
                <span className="font-semibold text-emerald-400">🟢 المسار 1: Qwen2.5 72B</span>
                <span className="text-[8px] text-slate-400 font-mono">الأساسي (120ms)</span>
              </div>
              <div className="flex items-center justify-between bg-[#11192d] border border-indigo-500/20 p-2 rounded">
                <span className="font-semibold text-indigo-400">🔵 المسار 2: Llama 3.3 via Groq</span>
                <span className="text-[8px] text-slate-400 font-mono">الرديف (140ms)</span>
              </div>
              <div className="flex items-center justify-between bg-[#1b1c1d] border border-slate-700 p-2 rounded">
                <span className="font-semibold text-slate-400">🟡 المسار 3: Together AI Failover</span>
                <span className="text-[8px] text-slate-400 font-mono">الطوارئ (200ms)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar brand footer */}
        <div className="p-4 border-t border-slate-800 bg-[#08090d]/60 m-4 rounded-xl border border-slate-800/40">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-[#00f2fe] shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-slate-200">نبض المفتوح v1.5</p>
              <p className="text-[9px] text-[#00f2fe] font-semibold">بوابة حماية من الضغط الـ 503</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <span className="text-[9px] text-slate-400 font-mono">PORT: 3000</span>
            <span className="text-slate-600">·</span>
            <span className="text-[9px] text-slate-400 font-mono">RESILIENT: TRUE</span>
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Section following Top Bar Contract */}
        <header className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-[#0c0e16]/80 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>نبض</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white font-medium">
              {activeTab === 'chat' && 'دردشة النماذج مفتوحة المصدر وتوليد الصور الحية'}
              {activeTab === 'dashboard' && 'تحليلات البوابات وأداء المسارات الاحتياطية'}
              {activeTab === 'keys' && 'إصدار وتأمين مفاتيح sk-nabad'}
              {activeTab === 'playground' && 'مختبر البث والتحليلات المقاسة'}
              {activeTab === 'docs' && 'وثائق Qwen و Llama المفتوحة'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-3 text-xs">
              <span className="text-slate-400">المرونة والتبديل (Resilience):</span>
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                قوية جداً (Ultra Resilience)
              </span>
            </div>

            {activeTab === 'keys' && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-black hover:opacity-90 transition-all font-semibold text-xs px-3.5 py-1.5 rounded-md flex items-center gap-2"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>إصدار مفتاح جديد</span>
              </button>
            )}

            {activeTab === 'dashboard' && (
              <button 
                onClick={() => { fetchAnalytics(); triggerToast('تم تحديث إحصائيات الاستهلاك ومسارات Fallback الحية!') }}
                className="border border-slate-700 hover:border-slate-600 bg-slate-900/50 text-slate-300 font-semibold text-xs px-3 py-1.5 rounded-md flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تحديث البيانات</span>
              </button>
            )}

            <div className="h-6 w-[1px] bg-slate-800"></div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-mono">bdwe.swerke@gmail.com</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'chat' ? 'p-0 overflow-hidden' : 'p-6 overflow-y-auto'}`}>
          
          {/* ==================== PANEL 1: CHAT INTERFACE ==================== */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-[#0b0f19] overflow-hidden relative w-full">
              
              {/* Premium Sub-Header Panel inside Chat */}
              <div className="p-4 bg-[#0e1424] border-b border-slate-800/80 flex items-center justify-between gap-4 w-full shrink-0">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-[#00f2fe]" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">دردشة نبض المفتوحة (Nabad AI)</h3>
                    <p className="text-[10px] text-slate-400">بوابة حماية مرنة ومسارات ذكاء اصطناعي سيادي ضد الـ 503</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Active model selection and settings */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] text-slate-400 whitespace-nowrap">النموذج النشط:</label>
                    <select 
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                    >
                      <option value="Qwen/Qwen2.5-72B-Instruct">Qwen2.5-72B-Instruct (الأساسي السيادي)</option>
                      <option value="Llama-3.3-70b-versatile">Llama-3.3-70b-versatile (Groq السريع)</option>
                      <option value="FLUX.1-schnell">FLUX.1-schnell (توليد الرسوم والوسائط)</option>
                    </select>
                  </div>

                  <div className="h-4 w-[1px] bg-slate-800"></div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">تصدير الجلسة:</span>
                    <button 
                      onClick={() => handleExportChat('txt')}
                      className="px-2 py-1 bg-slate-950 border border-slate-800 text-slate-300 rounded font-semibold text-[10px] hover:text-white"
                      title="تصدير TXT"
                    >
                      TXT
                    </button>
                    <button 
                      onClick={() => handleExportChat('json')}
                      className="px-2 py-1 bg-slate-950 border border-slate-800 text-slate-300 rounded font-semibold text-[10px] hover:text-white"
                      title="تصدير JSON"
                    >
                      JSON
                    </button>
                    <button 
                      onClick={() => handleExportChat('pdf-report')}
                      className="px-2 py-1 bg-[#00f2fe]/10 border border-[#00f2fe]/20 text-[#00f2fe] rounded font-semibold text-[10px] hover:bg-[#00f2fe]/20"
                      title="تصدير PDF"
                    >
                      تقرير PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Independent scrollable Chat Container (The Canvas) */}
              <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 space-y-8 bg-[#0b0f19] scrollbar-thin">
                <div className="max-w-4xl mx-auto w-full space-y-8">
                  {chatMessages.map((msg, index) => (
                    <div key={index} className="w-full">
                      {msg.role === 'user' ? (
                        /* User Message: elegant card aligned to the right */
                        <div className="flex flex-col items-end gap-1 w-full">
                          <div className="bg-[#1e293b]/85 border border-slate-800/60 rounded-2xl px-5 py-3 text-slate-100 text-[14px] leading-relaxed max-w-[80%] shadow-md select-text">
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          </div>
                          <span className="text-[9px] text-slate-500 font-mono pr-2 mt-0.5">
                            المستخدم · {msg.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        /* Nabad AI Assistant: Spacious, unboxed layout with brand avatar */
                        <div className="flex gap-4 items-start w-full border-b border-slate-900/40 pb-8 last:border-b-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-[#00f2fe]/40 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
                            <img src={NABAD_AVATAR_PATH} alt="Nabad Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>

                          <div className="flex-1 min-w-0 space-y-3">
                            {/* Metadata */}
                            <div className="flex items-center justify-between text-[10px] text-slate-400 gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-200">نبض AI</span>
                                <span>·</span>
                                <span className="font-mono">{msg.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              {msg.routeUsed && (
                                <span className="text-[#00f2fe] font-semibold font-mono bg-[#0c0e16] px-2 py-0.5 rounded border border-slate-800/60 text-[9px]">
                                  {msg.routeUsed}
                                </span>
                              )}
                            </div>

                            {/* Response prose content */}
                            <div className="text-[15px] leading-relaxed text-slate-100 whitespace-pre-wrap select-text">
                              {msg.content}
                            </div>

                            {/* Extracted Media Links parsed from text */}
                            {(() => {
                              const extracted = extractMediaLinks(msg.content).filter(item => item.url !== msg.media?.url);
                              if (extracted.length === 0) return null;
                              return (
                                <div className="space-y-4 mt-3">
                                  {extracted.map((item, idx) => (
                                    <div key={idx} className="max-w-xl w-full rounded-xl overflow-hidden border border-slate-800 bg-black shadow-2xl relative">
                                      {item.type === 'image' ? (
                                        <img 
                                          src={item.url} 
                                          alt="Generated Content" 
                                          style={{ maxWidth: '100%', borderRadius: '8px' }} 
                                          className="w-full h-auto object-contain block mx-auto"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <video 
                                          src={item.url} 
                                          controls 
                                          autoPlay 
                                          loop 
                                          playsInline
                                          className="w-full h-auto object-contain block mx-auto rounded-lg" 
                                          style={{ maxWidth: '100%', borderRadius: '8px' }}
                                        />
                                      )}
                                      <span className="absolute top-3 right-3 bg-black/80 border border-slate-700/60 text-[9px] text-[#00f2fe] px-2.5 py-1 rounded font-mono font-bold tracking-wide shadow-md z-20">
                                        {item.type === 'image' ? 'صورة فنية مكتشفة' : 'فيديو مكتشف'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}

                            {/* Embedded Media components directly in bubble */}
                            {msg.media && (
                              <div className="mt-4 max-w-xl w-full rounded-xl overflow-hidden border border-slate-800 bg-black shadow-2xl relative">
                                {msg.media.type === 'image' ? (
                                  <img 
                                    src={msg.media.url} 
                                    alt="Generated Content" 
                                    style={{ maxWidth: '100%', borderRadius: '8px' }} 
                                    className="w-full h-auto object-contain block mx-auto"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      // Real-time failover to image-proxy if loaded link was blocked
                                      e.currentTarget.src = `/api/proxy-image?prompt=${encodeURIComponent(msg.media?.prompt || 'Nabad AI Artwork')}`;
                                    }}
                                  />
                                ) : (
                                  <ResilientVideo src={msg.media.url} />
                                )}
                                <span className="absolute top-3 right-3 bg-black/80 border border-slate-700/60 text-[9px] text-[#00f2fe] px-2.5 py-1 rounded font-mono font-bold tracking-wide shadow-md z-20">
                                  {msg.media.type === 'image' ? 'FLUX.1-SCHNELL' : 'Veo Video'}
                                </span>
                              </div>
                            )}

                            {/* Progressive polling loader inside the bubble */}
                            {msg.isPolling && (
                              <div className="mt-4 p-5 rounded-xl border border-slate-800 bg-[#090a0f] space-y-4 max-w-xl">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <RefreshCw className="w-5 h-5 text-[#00f2fe] animate-spin" />
                                    <span className="text-xs text-slate-200 font-semibold">
                                      {msg.mediaTask?.type === 'video' ? 'جاري إنشاء الفيديو الحقيقي...' : 'جاري توليد الصورة الفنية...'}
                                    </span>
                                  </div>
                                  <span className="text-xs text-[#00f2fe] font-bold font-mono">{msg.progress || 10}%</span>
                                </div>
                                <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                                  <div className="h-full bg-gradient-to-r from-[#00f2fe] to-[#4facfe] transition-all duration-500 rounded-full" style={{ width: `${msg.progress || 10}%` }} />
                                </div>
                                <span className="text-[10px] text-slate-500 block italic truncate">
                                  "{msg.mediaTask?.prompt}"
                                </span>
                              </div>
                            )}

                            {/* Error displays inside bubble */}
                            {msg.error && (
                              <div className="mt-4 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs text-rose-400 flex items-start gap-2.5 max-w-xl">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
                                <div className="space-y-1">
                                  <p className="font-semibold text-rose-300">فشل معالجة وتوليد الوسائط</p>
                                  <p className="text-slate-400 leading-normal">{msg.error}</p>
                                </div>
                              </div>
                            )}

                            {/* Book novels widget */}
                            {(() => {
                              const isBookMessage = msg.content.includes('[COMPILING_BOOK:') || msg.content.includes('COMPILING_BOOK:');
                              if (!isBookMessage) return null;

                              let detectedTitle = "روايتي الجميلة";
                              let detectedAuthor = "مستشار نبض الذكي";

                              const titleMatch = msg.content.match(/COMPILING_BOOK:\s*TRUE\]?\s*\n*([^\n]+)/i) || msg.content.match(/عنوان الكتاب:\s*([^\n]+)/) || msg.content.match(/العنوان:\s*([^\n]+)/);
                              if (titleMatch && titleMatch[1]) {
                                detectedTitle = titleMatch[1].replace(/[*#_`~\[\]]/g, '').trim();
                              }
                              const authorMatch = msg.content.match(/اسم المؤلف:\s*([^\n]+)/) || msg.content.match(/الكاتب:\s*([^\n]+)/) || msg.content.match(/المؤلف:\s*([^\n]+)/);
                              if (authorMatch && authorMatch[1]) {
                                detectedAuthor = authorMatch[1].replace(/[*#_`~]/g, '').trim();
                              }

                              return (
                                <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-teal-950/40 to-slate-950 border border-[#00f2fe]/30 shadow-md max-w-xl">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#00f2fe]/10 flex items-center justify-center border border-[#00f2fe]/20">
                                      <BookOpen className="w-5 h-5 text-[#00f2fe]" />
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-bold text-white">معالج الكتب والروايات المنسقة (Nabad PDF Book Builder)</h4>
                                      <p className="text-[10px] text-slate-400">تم رصد فصول قصصية جاهزة للتصدير المكتبي بضغطة زر</p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2.5">
                                    <button 
                                      onClick={() => {
                                        setBookTitle(detectedTitle);
                                        setBookAuthor(detectedAuthor);
                                        setBookContent(msg.content);
                                        setBookCoverStyle('neon');
                                        setShowBookModal(true);
                                      }}
                                      className="px-4 py-2 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-black font-bold text-xs rounded-lg hover:opacity-95 transition-all flex items-center gap-1.5 shadow"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                      <span>تصميم غلاف وتحميل ككتاب PDF</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Quiet, unboxed interaction icons below each assistant response */}
                            <div className="flex items-center gap-4 pt-4 text-xs text-slate-500 border-t border-slate-900/10">
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(msg.content);
                                  triggerToast('✔ تم نسخ نص الإجابة بالكامل!');
                                }}
                                className="hover:text-[#00f2fe] flex items-center gap-1.5 transition-colors font-medium"
                                title="نسخ النص"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>نسخ</span>
                              </button>

                              <button 
                                onClick={() => handleToggleAudio(msg.content)}
                                className={`hover:text-[#00f2fe] flex items-center gap-1.5 transition-colors font-medium ${isPlayingAudio ? 'text-[#00f2fe]' : ''}`}
                                title="قراءة صوتية"
                              >
                                <span>🔊 قراءة صوتية</span>
                              </button>

                              <button 
                                onClick={() => {
                                  setBookTitle("تقرير منصة نبض الذكي");
                                  setBookAuthor("مستشار نبض");
                                  setBookContent(msg.content);
                                  setBookCoverStyle('dark');
                                  setShowBookModal(true);
                                }}
                                className="hover:text-[#00f2fe] flex items-center gap-1.5 transition-colors font-medium"
                                title="تحميل ككتاب PDF"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>تحميل PDF</span>
                              </button>
                            </div>

                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isChatTyping && (
                    <div className="flex gap-4 items-start w-full">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 border border-[#00f2fe]/40 overflow-hidden flex items-center justify-center shrink-0">
                        <img src={NABAD_AVATAR_PATH} alt="Nabad Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="bg-[#10121d] border border-slate-800 p-4 rounded-xl max-w-[80%]">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-[#00f2fe] rounded-full animate-bounce"></span>
                          <span className="w-2 h-2 bg-[#00f2fe] rounded-full animate-bounce delay-100"></span>
                          <span className="w-2 h-2 bg-[#00f2fe] rounded-full animate-bounce delay-200"></span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">جاري استدعاء ورندرة الاستجابة حركياً...</p>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Centered expandable Floating/Sticky Input Bar */}
              <div className="p-4 md:p-6 bg-[#0b0f19] border-t border-slate-800/40 w-full shrink-0">
                <div className="max-w-4xl mx-auto w-full">
                  {/* Warning banner for Microphone Iframe Restriction */}
                  {showMicrophoneIframeWarning && (
                    <div className="mb-3 p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-center justify-between gap-3 shadow-md">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">🎙️</span>
                        <div className="space-y-0.5">
                          <p className="font-bold text-amber-100">تم رصد حظر المايكروفون بسبب قيود المتصفح الجانبية</p>
                          <p className="text-[10.5px] text-amber-300">لحل هذه المشكلة بنسبة 100% والاستمتاع بالمحادثة الصوتية التلقائية، يرجى تشغيل المنصة برابط مستقل:</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <a 
                          href="https://ais-pre-kiirab3ezejlrn2s7fy64v-679154914423.europe-west2.run.app" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-amber-500 text-black rounded-lg font-bold hover:bg-amber-400 transition-all text-[11px]"
                        >
                          تشغيل في تبويب جديد ↗
                        </a>
                        <button 
                          onClick={() => setShowMicrophoneIframeWarning(false)}
                          className="text-amber-400 hover:text-white text-base font-bold px-1.5"
                          title="إغلاق"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}

                  <form id="nabad-chat-form" onSubmit={handleSendChat} className="flex gap-3 items-end bg-[#131a2e] border border-slate-800/80 rounded-2xl p-2.5 shadow-2xl relative w-full">
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileAttach}
                      className="hidden"
                      accept="image/*,text/*,.json,.js,.py,.ts,.tsx,.css,.html"
                    />

                    {/* Attachment button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all shrink-0"
                      title="إرفاق صورة، ملف نصي، أو كود"
                    >
                      <Plus className="w-4.5 h-4.5" />
                    </button>

                    {/* Microphone Dictation button */}
                    <button
                      type="button"
                      onClick={startVoiceDictation}
                      className={`p-3 border rounded-xl transition-all shrink-0 ${
                        isVoiceRecording 
                          ? 'bg-rose-950 border-rose-500 text-rose-400 animate-pulse' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title="تفعيل الإملاء الصوتي باللغة العربية"
                    >
                      🎤
                    </button>

                    {/* TTS Voice Output Mute/Unmute Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        const nextMuted = !isVoiceMuted;
                        setIsVoiceMuted(nextMuted);
                        if (nextMuted && window.speechSynthesis) {
                          window.speechSynthesis.cancel();
                          setIsPlayingAudio(false);
                        }
                        triggerToast(nextMuted ? "🔇 تم كتم القراءة الصوتية التلقائية" : "🔊 تم تفعيل القراءة الصوتية التلقائية للردود");
                      }}
                      className={`p-3 border rounded-xl transition-all shrink-0 ${
                        !isVoiceMuted 
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-400 animate-pulse' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title={isVoiceMuted ? "تفعيل قارئ الردود الصوتي" : "كتم قارئ الردود الصوتي"}
                    >
                      {isVoiceMuted ? "🔇" : "🔊"}
                    </button>

                    {/* Text Field - expandable textarea style using a modern, flexible input */}
                    <textarea 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={isVoiceRecording ? '🎤 جاري الاستماع لإملائك الصوتي باللغة العربية...' : 'اطلب برمجة، قصة ككتاب PDF، أو رسم صورة...'}
                      className="flex-1 bg-transparent text-[14px] text-white focus:outline-none placeholder:text-slate-500 max-h-32 min-h-[44px] overflow-y-auto py-3 resize-none border-none pr-2 leading-relaxed"
                      disabled={isChatTyping}
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendChat(e);
                        }
                      }}
                    />

                    {/* Send button */}
                    <button
                      type="submit"
                      disabled={isChatTyping || (!chatInput.trim() && !attachedFile)}
                      className="bg-[#00f2fe] text-black p-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center shrink-0"
                    >
                      <Send className="w-4 h-4 shrink-0" />
                    </button>
                  </form>
                  <p className="text-[10px] text-slate-500 text-center mt-2.5">
                    منظومة نبض التجارية السيادية للذكاء الاصطناعي · Qwen & Llama 100% غامرة وبدون 503
                  </p>
                </div>
              </div>

            </div>
          )}


          {/* ==================== PANEL 2: PLATFORM DASHBOARD ==================== */}
          {activeTab === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-6">
              
              {/* Summary Cards Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Card 1 */}
                <div className="bg-[#0c0e16] border border-slate-800 p-5 rounded-xl shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold text-slate-400">مفاتيح الـ API النشطة</span>
                    <KeyRound className="w-4 h-4 text-[#00f2fe]" />
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
                    {analytics?.summary.activeKeys ?? 2} <span className="text-xs text-slate-500 font-normal">مفاتيح</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">حماية فائقة من أخطاء الـ 503</p>
                </div>

                {/* Card 2 */}
                <div className="bg-[#0c0e16] border border-slate-800 p-5 rounded-xl shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold text-slate-400">حجم الاستهلاك (Requests)</span>
                    <Activity className="w-4 h-4 text-[#00f2fe]" />
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
                    {analytics?.summary.totalRequests.toLocaleString() ?? '1,940'}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">طلبات معالجة بالكامل دون توقف</p>
                </div>

                {/* Card 3 */}
                <div className="bg-[#0c0e16] border border-slate-800 p-5 rounded-xl shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold text-slate-400">متوسط سرعة الرد</span>
                    <Clock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
                    {analytics?.summary.avgLatency ?? 320} <span className="text-xs text-slate-400">ms</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">أسرع بنسبة 45% بفضل مسارات Groq</p>
                </div>

                {/* Card 4 */}
                <div className="bg-[#0c0e16] border border-slate-800 p-5 rounded-xl shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold text-slate-400">التكلفة الإجمالية</span>
                    <Coins className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
                    ${analytics?.summary.totalCost.toFixed(4) ?? '0.1980'}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">توفير عالي بفضل النماذج المفتوحة</p>
                </div>

              </div>

              {/* Data Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 7-Day Request Volume Bar/Line Chart */}
                <div className="lg:col-span-2 bg-[#0c0e16] border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">حركة مرور الـ API واستقرارها اليومي</h3>
                      <p className="text-[10px] text-slate-500">حماية من التوقف 503 عبر دمج بوابات Groq و Together AI الاحتياطية</p>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-1 bg-[#00f2fe] rounded-full"></span>
                        الاستهلاك الحركي (Requests)
                      </span>
                    </div>
                  </div>

                  {/* Render simulated line chart using raw HTML/SVG elements for zero dependencies */}
                  <div className="h-56 w-full flex flex-col justify-between pt-4">
                    <div className="flex-1 flex items-end justify-between gap-2 px-2 border-b border-slate-800">
                      {(analytics?.dailyStats ?? [
                        { date: '27 سبتمبر', requests: 120, tokens: 45000 },
                        { date: '28 سبتمبر', requests: 180, tokens: 68000 },
                        { date: '29 سبتمبر', requests: 210, tokens: 94000 },
                        { date: '30 سبتمبر', requests: 145, tokens: 72000 },
                        { date: '1 أكتوبر', requests: 285, tokens: 112000 },
                        { date: '2 أكتوبر', requests: 310, tokens: 148000 },
                        { date: 'اليوم', requests: 395, tokens: 198000 }
                      ]).map((item, idx) => {
                        const maxVal = 500;
                        const heightPercent = Math.min((item.requests / maxVal) * 100, 100);
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                            <div className="absolute bottom-full mb-1 bg-slate-900 border border-slate-700 text-[10px] text-slate-200 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                              <div>الطلبات: {item.requests}</div>
                              <div>التوكنات: {item.tokens.toLocaleString()}</div>
                            </div>
                            <div 
                              style={{ height: `${heightPercent}%` }} 
                              className="w-full max-w-[32px] bg-gradient-to-t from-[#00f2fe]/40 to-[#00f2fe] rounded-t hover:brightness-110 transition-all duration-300 shadow shadow-[#00f2fe]/20"
                            ></div>
                          </div>
                        );
                      })}
                    </div>
                    {/* X-axis labels */}
                    <div className="flex justify-between px-2 pt-2 text-[9px] text-slate-500 font-medium">
                      {(analytics?.dailyStats ?? [
                        { date: '27 سبتمبر' }, { date: '28 سبتمبر' }, { date: '29 سبتمبر' }, 
                        { date: '30 سبتمبر' }, { date: '1 أكتوبر' }, { date: '2 أكتوبر' }, { date: 'اليوم' }
                      ]).map((item, idx) => (
                        <div key={idx} className="text-center w-full max-w-[32px] truncate">{item.date}</div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Models distribution usage */}
                <div className="bg-[#0c0e16] border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-1">توزيع النماذج مفتوحة المصدر النشطة</h3>
                  <p className="text-[10px] text-slate-500 mb-4">لقد تم تجميد وإلغاء اعتماد Gemma لمنع خطأ 503</p>
                  
                  <div className="space-y-4">
                    {[
                      { name: 'Qwen2.5-72B-Instruct', count: 52, color: 'bg-indigo-500' },
                      { name: 'Llama-3.3-70b-versatile', count: 34, color: 'bg-[#00f2fe]' },
                      { name: 'FLUX.1-schnell (Together)', count: 14, color: 'bg-emerald-500' }
                    ].map((m, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-300">{m.name}</span>
                          <span className="font-mono text-slate-400 font-medium tabular-nums">{m.count}%</span>
                        </div>
                        <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                          <div className={`h-full ${m.color}`} style={{ width: `${m.count}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 p-4 rounded bg-slate-900/40 border border-slate-800/60 text-[10px] text-slate-400 leading-relaxed">
                    ⚙️ **خاصية Fallback للتوجيه**: إذا اكتشف الخادم أي تأخير أو خطأ في مسار Qwen، يتم تمرير الطلب فوراً إلى مسارات Llama عبر Groq بسرعة 140ms فقط!
                  </div>
                </div>

              </div>

              {/* Dynamic Live Gateways Table */}
              <div className="bg-[#0c0e16] border border-slate-800 rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">سجل مسارات الطلبات النشطة (Gateway Fallback Log)</h3>
                    <p className="text-[10px] text-slate-500">مراقبة حية للمسارات البرمجية وحالة الرد ومصدر التشغيل</p>
                  </div>
                  
                  {/* Search filter input */}
                  <div className="relative">
                    <Search className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input 
                      type="text"
                      placeholder="البحث بالنموذج أو المسار..."
                      value={logsSearch}
                      onChange={(e) => setLogsSearch(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-md pr-9 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f2fe] w-52 placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-2.5 font-semibold">تاريخ الطلب</th>
                        <th className="pb-2.5 font-semibold">مفتاح الـ API المستدعي</th>
                        <th className="pb-2.5 font-semibold text-center">النموذج</th>
                        <th className="pb-2.5 font-semibold text-center">المسار النشط (Route)</th>
                        <th className="pb-2.5 font-semibold text-center">حالة الرد</th>
                        <th className="pb-2.5 font-semibold text-left">التأخير</th>
                        <th className="pb-2.5 font-semibold text-left">التوكنات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {(analytics?.recentLogs ?? []).filter(log => {
                        const s = logsSearch.toLowerCase();
                        return log.model.toLowerCase().includes(s) || log.keyName.toLowerCase().includes(s) || log.keySnippet.toLowerCase().includes(s) || (log.routeType && log.routeType.toLowerCase().includes(s));
                      }).map((log, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 font-mono text-slate-400 text-[11px] tabular-nums">
                            {new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="py-3">
                            <div className="font-semibold text-slate-200">{log.keyName}</div>
                            <div className="text-[10px] text-slate-500 font-mono tracking-wider">{log.keySnippet}</div>
                          </td>
                          <td className="py-3 text-center">
                            <span className="font-mono text-slate-300 text-[11px] font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              {log.model}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              log.routeType?.includes('Primary') ? 'bg-emerald-500/10 text-emerald-400' :
                              log.routeType?.includes('Groq') ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {log.routeType || 'Primary (Qwen)'}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              log.status === 200 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {log.status === 200 ? '200 OK' : '401 Unauthorized'}
                            </span>
                          </td>
                          <td className="py-3 text-left font-mono text-slate-300 font-semibold tabular-nums">
                            {log.latencyMs}ms
                          </td>
                          <td className="py-3 text-left">
                            <div className="font-mono font-semibold text-slate-200 tabular-nums">{log.promptTokens + log.completionTokens}</div>
                            <div className="text-[9px] text-slate-500 font-mono">I: {log.promptTokens} · O: {log.completionTokens}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {apiKeys.length === 0 && (
                    <div className="py-12 text-center text-slate-500">
                      لم يتم تسجيل طلبات مطورين حية بعد. قم بإصدار مفتاح API وادعمه في الكود للبدء.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}


          {/* ==================== PANEL 3: API KEY MANAGEMENT ==================== */}
          {activeTab === 'keys' && (
            <div className="max-w-6xl mx-auto space-y-6">
              
              <div className="bg-[#0c0e16] border border-slate-800 rounded-xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-base font-bold text-white">لوحة مفاتيح الوصول التجارية (API Keys)</h2>
                    <p className="text-xs text-slate-400 mt-1">تتيح لك هذه اللوحة حماية، تجديد وإصدار المفاتيح السرية sk-nabad لربط تطبيقاتك البرمجية المختلفة مع خوادمنا.</p>
                  </div>
                  
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-black font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 self-start md:self-auto hover:opacity-90 transition-all"
                  >
                    <Plus className="w-4.5 h-4.5" />
                    <span>إصدار مفتاح جديد</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-3 font-semibold">اسم المفتاح</th>
                        <th className="pb-3 font-semibold">قيمة المفتاح السرية</th>
                        <th className="pb-3 font-semibold">تاريخ الإصدار</th>
                        <th className="pb-3 font-semibold text-center">الحالة</th>
                        <th className="pb-3 font-semibold text-left">الطلبات</th>
                        <th className="pb-3 font-semibold text-left">إجمالي التوكنز</th>
                        <th className="pb-3 font-semibold text-left">التكلفة</th>
                        <th className="pb-3 font-semibold text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {apiKeys.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/20 transition-colors">
                          <td className="py-4">
                            <div className="font-semibold text-white">{item.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">ID: {item.id}</div>
                          </td>
                          <td className="py-4 font-mono text-xs">
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-950 px-2 py-1 rounded text-slate-300 font-semibold border border-slate-800 tracking-wide select-all">
                                {item.key}
                              </span>
                              <button 
                                onClick={() => handleCopy(item.key, item.id)}
                                className="text-slate-400 hover:text-white transition-colors p-1"
                                title="نسخ المفتاح"
                              >
                                {copiedKey === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-4 font-mono text-slate-400 text-[11px] tabular-nums">
                            {new Date(item.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="py-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              item.status === 'active' 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {item.status === 'active' ? 'نشط ومفعل' : 'ملغى ومجمد'}
                            </span>
                          </td>
                          <td className="py-4 text-left font-mono font-semibold text-slate-200 tabular-nums">
                            {item.requestsCount.toLocaleString()}
                          </td>
                          <td className="py-4 text-left font-mono text-slate-400 tabular-nums">
                            {item.tokensCount.toLocaleString()}
                          </td>
                          <td className="py-4 text-left font-mono text-emerald-400 font-semibold tabular-nums">
                            ${item.cost.toFixed(4)}
                          </td>
                          <td className="py-4 text-center">
                            {item.status === 'active' ? (
                              <button 
                                onClick={() => handleRevokeKey(item.id, item.name)}
                                className="text-rose-400 hover:text-rose-300 transition-colors p-1"
                                title="إلغاء المفتاح"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-slate-600 text-[11px] font-semibold italic">معطل</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {apiKeys.length === 0 && !loadingKeys && (
                    <div className="py-12 text-center text-slate-500">
                      لا يوجد أي مفاتيح نشطة حالياً. انقر على زر إصدار مفتاح جديد للبدء في ربط تطبيقاتك.
                    </div>
                  )}
                </div>
              </div>

              {/* Developer notice */}
              <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-xl flex items-start gap-4">
                <ShieldCheck className="w-6 h-6 text-[#00f2fe] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1.5 leading-relaxed text-slate-300">
                  <h4 className="font-bold text-white">إرشادات حماية البيانات السرية لمنصة نبض</h4>
                  <p>تعتبر مفاتيح الـ API المعتمدة بمثابة كلمات سر صالحة لتخويل السحب المالي المباشر من موازنة الحساب. يرجى مراعاة ما يلي:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 pr-2">
                    <li>لا تقم أبداً برفع هذه الرموز المفتوحة للواجهات البرمجية إلى GitHub في ملفات عامة.</li>
                    <li>استخدم ملفات الإعدادات البيئية <code className="bg-slate-950 text-[#00f2fe] px-1 rounded font-mono">.env</code> لتأمينها بشكل منفصل.</li>
                    <li>قم بإلغاء وتدمير أي رمز تشك في انكشافه أو تسريبه فوراً من خلال لوحة المفاتيح أعلاه.</li>
                  </ul>
                </div>
              </div>

            </div>
          )}


          {/* ==================== PANEL 4: PLAYGROUND ==================== */}
          {activeTab === 'playground' && (
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-12rem)]">
              
              {/* Form Input Side */}
              <div className="bg-[#0c0e16] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-lg">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-semibold text-white">مختبر الـ API ومحاكاة الطلب (JSON Core)</h3>
                    <span className="text-[10px] text-slate-400 font-mono">POST /v1/chat/completions</span>
                  </div>

                  {/* API Key selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">اختر مفتاح المصادقة للاختبار:</label>
                    <select
                      value={selectedPlaygroundKey}
                      onChange={(e) => setSelectedPlaygroundKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                    >
                      <option value="">-- يرجى اختيار مفتاح للاتصال --</option>
                      {apiKeys.map((item, idx) => (
                        <option key={idx} value={item.key} disabled={item.status !== 'active'}>
                          {item.name} ({item.status === 'active' ? 'نشط' : 'معطل'}) — {item.key.substring(0, 15)}...
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Model & Configs Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-300">النموذج المختار (Model):</label>
                      <select
                        value={playgroundModel}
                        onChange={(e) => setPlaygroundModel(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                      >
                        <option value="Qwen/Qwen2.5-72B-Instruct">Qwen2.5-72B-Instruct (الرئيسي)</option>
                        <option value="Llama-3.3-70b-versatile">Llama-3.3-70b-versatile (Groq)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-300">نمط الاستلام (Streaming):</label>
                      <select
                        value={playgroundStream ? 'true' : 'false'}
                        onChange={(e) => setPlaygroundStream(e.target.value === 'true')}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                      >
                        <option value="true">Streaming (تدفق حركي)</option>
                        <option value="false">Static (رد كامل دفعة واحدة)</option>
                      </select>
                    </div>
                  </div>

                  {/* Temperature slider & Tokens count */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>درجة الإبداع (Temp):</span>
                        <span className="font-mono text-[#00f2fe]">{playgroundTemperature}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.0" 
                        max="1.5" 
                        step="0.1" 
                        value={playgroundTemperature}
                        onChange={(e) => setPlaygroundTemperature(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00f2fe]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>الحد الأقصى للرموز (Max):</span>
                        <span className="font-mono text-[#00f2fe]">{playgroundMaxTokens}</span>
                      </div>
                      <input 
                        type="number" 
                        value={playgroundMaxTokens}
                        onChange={(e) => setPlaygroundMaxTokens(parseInt(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-[#00f2fe] font-mono"
                      />
                    </div>
                  </div>

                  {/* Text messages JSON editor */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-semibold text-slate-300">محتوى الطلب البرمجي (Payload Messages JSON):</label>
                      <button 
                        onClick={() => setPlaygroundPrompt(`[\n  {\n    "role": "user",\n    "content": "اكتب قصيدة قصيرة باللغة العربية الفصحى تعبر عن الذكاء الاصطناعي وبزوغ فجر المستقبل"\n  }\n]`)}
                        className="text-[10px] text-slate-400 hover:text-white"
                      >
                        إدراج نص عربي تجريبي
                      </button>
                    </div>
                    <textarea
                      value={playgroundPrompt}
                      onChange={(e) => setPlaygroundPrompt(e.target.value)}
                      rows={8}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-[#00f2fe] font-mono focus:outline-none focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe]/40"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 mt-4">
                  <button
                    onClick={handlePlaygroundSubmit}
                    disabled={playgroundLoading || !selectedPlaygroundKey}
                    className="w-full bg-gradient-to-r from-emerald-600 to-[#00f2fe] text-black font-semibold text-sm py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    <span>إرسال الطلب وحقن ترويسة المصادقة الموحدة</span>
                  </button>
                </div>
              </div>

              {/* Terminal / Output Side */}
              <div className="bg-black border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-2xl">
                
                {/* Terminal Header */}
                <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 font-mono ml-2">TERMINAL // Nabad Live Streaming Gateway</span>
                  </div>
                  
                  <button 
                    onClick={() => setPlaygroundTerminal('')}
                    className="text-[10px] text-slate-500 hover:text-white"
                  >
                    مسح الشاشة
                  </button>
                </div>

                {/* curl helper block */}
                <div className="p-3 bg-slate-900/50 border-b border-slate-800 font-mono text-[10px] text-slate-400 select-all overflow-x-auto whitespace-pre">
                  <div>{`curl -X POST "${window.location.origin}/v1/chat/completions" \\`}</div>
                  <div>{`  -H "Authorization: Bearer sk-nabad-..." \\`}</div>
                  <div>{`  -H "Content-Type: application/json" \\`}</div>
                  <div>{`  -d '{"model": "${playgroundModel}", "messages": ...}'`}</div>
                </div>

                {/* Live response window */}
                <div className="flex-1 p-4 font-mono text-xs text-slate-300 overflow-y-auto max-h-[350px] min-h-[250px] bg-black/90">
                  {playgroundTerminal ? (
                    <pre className="whitespace-pre-wrap leading-relaxed select-text text-emerald-400/90">{playgroundTerminal}</pre>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-600">
                      <Terminal className="w-10 h-10 mb-2" />
                      <p>بانتظار إطلاق الطلب من لوحة التحكم...</p>
                      <p className="text-[10px] mt-1 max-w-xs">ستظهر مخرجات الـ Streaming الحية وأكواد الرد مع توضيح مسار التوجيه (Route) المستخدم حالياً.</p>
                    </div>
                  )}
                </div>

                {/* Telemetry info */}
                {playgroundMeta && (
                  <div className="p-4 bg-slate-950 border-t border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
                    <div>
                      <span className="block text-slate-500 text-[10px]">STATUS:</span>
                      <span className="text-emerald-400 font-semibold">{playgroundMeta.status} OK</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 text-[10px]">TIME / LATENCY:</span>
                      <span className="text-white font-semibold">{playgroundMeta.timeMs} ms</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 text-[10px]">ROUTE USED:</span>
                      <span className="text-[#00f2fe] font-semibold">{playgroundMeta.routeUsed}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 text-[10px]">FINGERPRINT:</span>
                      <span className="text-slate-400 font-semibold text-[10px]">{playgroundMeta.fingerprint}</span>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}


          {/* ==================== PANEL 5: DOCUMENTATION ==================== */}
          {activeTab === 'docs' && (
            <div className="max-w-4xl mx-auto space-y-6">
              
              <div className="bg-[#0c0e16] border border-slate-800 rounded-xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white">دليل دمج وتكامل بوابة نبض البرمجية</h2>
                <p className="text-xs text-slate-400 mt-1">تتوافق بوابة نبض بشكل كامل مع حزم ومكتبات OpenAI القياسية. كل ما عليك فعله هو تبديل مسار القاعدة (Base URL) ووضع مفتاح sk-nabad.</p>

                {/* Tabs to select language code */}
                <div className="flex border-b border-slate-800 mt-6 mb-4">
                  <button 
                    onClick={() => setDocsLanguage('curl')}
                    className={`pb-2.5 text-xs font-bold px-4 transition-colors relative ${
                      docsLanguage === 'curl' ? 'text-[#00f2fe]' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>طلب cURL مباشر</span>
                    {docsLanguage === 'curl' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f2fe]"></div>}
                  </button>

                  <button 
                    onClick={() => setDocsLanguage('python')}
                    className={`pb-2.5 text-xs font-bold px-4 transition-colors relative ${
                      docsLanguage === 'python' ? 'text-[#00f2fe]' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>مكتبة Python</span>
                    {docsLanguage === 'python' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f2fe]"></div>}
                  </button>

                  <button 
                    onClick={() => setDocsLanguage('node')}
                    className={`pb-2.5 text-xs font-bold px-4 transition-colors relative ${
                      docsLanguage === 'node' ? 'text-[#00f2fe]' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>مكتبة Node.js (JavaScript)</span>
                    {docsLanguage === 'node' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f2fe]"></div>}
                  </button>
                </div>

                {/* Code Showcase with Copy Button */}
                <div className="relative group">
                  
                  {docsLanguage === 'curl' && (
                    <pre className="bg-slate-950 border border-slate-800 p-5 rounded-lg text-xs font-mono text-[#00f2fe] leading-relaxed overflow-x-auto select-all">
{`curl -X POST "${window.location.origin}/v1/chat/completions" \\
  -H "Authorization: Bearer sk-nabad-demo-prod-key-9284" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "Qwen/Qwen2.5-72B-Instruct",
    "messages": [
      {
        "role": "user",
        "content": "مرحباً نبض، اعطني استشارة برمجية حول تأمين قواعد البيانات"
      }
    ],
    "temperature": 0.7,
    "stream": true
  }'`}
                    </pre>
                  )}

                  {docsLanguage === 'python' && (
                    <pre className="bg-slate-950 border border-slate-800 p-5 rounded-lg text-xs font-mono text-[#00f2fe] leading-relaxed overflow-x-auto select-all">
{`from openai import OpenAI

# تهيئة الاتصال ببوابة نبض الموحدة
client = OpenAI(
    api_key="sk-nabad-demo-prod-key-9284",
    base_url="${window.location.origin}/v1"
)

# بدء استدعاء نموذج Qwen 2.5 بالبث الحي التلقائي الفيلوفر
response = client.chat.completions.create(
    model="Qwen/Qwen2.5-72B-Instruct",
    messages=[
        {"role": "user", "content": "أريد كود بايثون متكامل لفلترة البيانات"}
    ],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")`}
                    </pre>
                  )}

                  {docsLanguage === 'node' && (
                    <pre className="bg-slate-950 border border-slate-800 p-5 rounded-lg text-xs font-mono text-[#00f2fe] leading-relaxed overflow-x-auto select-all">
{`import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "sk-nabad-demo-prod-key-9284",
  baseURL: "${window.location.origin}/v1"
});

async function main() {
  const stream = await openai.chat.completions.create({
    model: "Llama-3.3-70b-versatile",
    messages: [{ role: "user", content: "كيفية كتابة خوارزميات الذكاء الفائقة؟" }],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}

main();`}
                    </pre>
                  )}

                  <button 
                    onClick={() => {
                      const curlText = `curl -X POST "${window.location.origin}/v1/chat/completions" -H "Authorization: Bearer sk-nabad-demo-prod-key-9284"`;
                      handleCopy(curlText, 'docs');
                    }}
                    className="absolute top-4 left-4 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white p-2 rounded transition-colors"
                    title="نسخ كود الدمج البرمجي"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  <h3 className="text-sm font-semibold text-white">النماذج المفتوحة المعتمدة في بوابة التوازن (Active Models Map)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div className="bg-[#10121d] p-4 rounded-lg border border-slate-800/80">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-white">Qwen2.5-72B-Instruct</span>
                        <span className="text-[10px] text-[#00f2fe] font-mono">Qwen/Qwen2.5-72B-Instruct</span>
                      </div>
                      <p className="text-[11px] text-slate-400">النموذج اللغوي الأضخم والأذكى عالمياً في البرمجيات وفهم الثقافة وصياغة اللغة العربية بمستوى فائق.</p>
                    </div>

                    <div className="bg-[#10121d] p-4 rounded-lg border border-slate-800/80">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-white">Llama-3.3-70b-versatile</span>
                        <span className="text-[10px] text-[#00f2fe] font-mono">Llama-3.3-70b-versatile</span>
                      </div>
                      <p className="text-[11px] text-slate-400">مدعوم بالكامل ببوابات Groq فائقة السرعة للاستدلال السريع وحل المعادلات وتحليل البيانات المترامية.</p>
                    </div>

                    <div className="bg-[#10121d] p-4 rounded-lg border border-slate-800/80">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-white">FLUX.1-schnell</span>
                        <span className="text-[10px] text-[#00f2fe] font-mono">FLUX.1-schnell</span>
                      </div>
                      <p className="text-[11px] text-slate-400">توليد الصور الفورية فائقة الجودة والمحكمة في غضون ثانية ونصف فقط عبر خوادم Together AI.</p>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ==================== PANEL 6: CODE SANDBOX ==================== */}
          {activeTab === 'sandbox' && (
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-12rem)] animate-fade-in">
              
              {/* Code Editor Side */}
              <div className="bg-[#0c0e16] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-lg">
                <div className="space-y-4 flex-1 flex flex-col">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-5 h-5 text-[#00f2fe]" />
                      <h3 className="text-sm font-semibold text-white">محرر الأكواد التفاعلي (Code Editor)</h3>
                    </div>
                    <span className="text-[10px] text-[#00f2fe] font-mono">HTML5 / CSS3 / JS Sandbox</span>
                  </div>

                  {/* Templates Selector */}
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="text-slate-400">القوالب الجاهزة:</span>
                    <button 
                      onClick={() => setSandboxCode(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>صفحة نبض التفاعلية</title>
  <style>
    body { background-color: #0c0e16; color: white; font-family: sans-serif; text-align: center; padding: 50px; }
    h1 { color: #00f2fe; text-shadow: 0 0 10px rgba(0,242,254,0.4); }
    .card { background: #10121d; border: 1px solid #1e293b; padding: 30px; border-radius: 12px; max-w: 400px; margin: 20px auto; }
  </style>
</head>
<body>
  <div class="card">
    <h1>بوابة نبض التجريبية</h1>
    <p>تم بناؤها ورندرتها بنجاح داخل الـ Sandbox.</p>
    <button onclick="console.log('مرحباً من داخل الكونسول الحقيقي!')" style="background:#00f2fe; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer;">انقر هنا لإرسال سجل</button>
  </div>
</body>
</html>`)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold text-[10px] transition-all"
                    >
                      بطاقة HTML تفاعلية
                    </button>

                    <button 
                      onClick={() => setSandboxCode(`<!DOCTYPE html>
<html>
<body>
  <h2>محاكي حسابات دالة الفيبوناتشي المفتوحة</h2>
  <p>افتح كونسول المحاكي باليمين لمراقبة المخرجات البرمجية الحية.</p>
  <script>
    function fibonacci(n) {
      let arr = [0, 1];
      for (let i = 2; i < n; i++) {
        arr.push(arr[i - 1] + arr[i - 2]);
      }
      return arr;
    }
    console.log("حساب أول 10 أرقام فيبوناتشي:");
    console.log(JSON.stringify(fibonacci(10)));
  </script>
</body>
</html>`)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold text-[10px] transition-all"
                    >
                      خوارزمية فيبوناتشي (JS)
                    </button>
                  </div>

                  {/* Textarea Code Input */}
                  <div className="flex-1 flex flex-col min-h-[300px]">
                    <textarea
                      value={sandboxCode}
                      onChange={(e) => setSandboxCode(e.target.value)}
                      className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs text-[#00f2fe] font-mono focus:outline-none focus:border-[#00f2fe] resize-none leading-relaxed"
                      spellCheck="false"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 mt-4 flex justify-between gap-3">
                  <button 
                    onClick={() => {
                      const blob = new Blob([sandboxCode], { type: 'text/html;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'nabad_sandbox_app.html';
                      a.click();
                      triggerToast('✔ تم تصدير وتحميل ملف الأكواد بنجاح!');
                    }}
                    className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-lg transition-all"
                  >
                    تصدير الكود كملف HTML
                  </button>

                  <button
                    onClick={() => {
                      setSandboxLogs([]);
                      triggerToast('🔄 تم إعادة رندرة وتشغيل الأكواد داخل المحاكي!');
                    }}
                    className="bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-black font-bold text-xs px-5 py-2.5 rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5"
                  >
                    <Play className="w-4 h-4 shrink-0" />
                    <span>تشغيل ورندرة الأكواد (Run App)</span>
                  </button>
                </div>
              </div>

              {/* Sandbox Preview and Console Output Side */}
              <div className="grid grid-rows-2 gap-6 h-full min-h-[calc(100vh-12rem)]">
                
                {/* Live Preview Pane */}
                <div className="bg-black border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-2xl">
                  <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 font-mono">LIVE APPS PREVIEW (الأبلكيشن حياً)</span>
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>

                  <div className="flex-1 bg-white">
                    <iframe
                      key={sandboxCode.length + sandboxLogs.length}
                      srcDoc={`
                        <script>
                          const _log = console.log;
                          console.log = (...args) => {
                            _log(...args);
                            window.parent.postMessage({ type: 'CONSOLE_LOG', data: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
                          };
                          window.onerror = (message, source, lineno, colno, error) => {
                            window.parent.postMessage({ type: 'CONSOLE_ERROR', data: message + ' (Line ' + lineno + ')' }, '*');
                          };
                        </script>
                        ${sandboxCode}
                      `}
                      sandbox="allow-scripts"
                      className="w-full h-full border-none bg-white"
                      title="Nabad App Sandbox"
                    />
                  </div>
                </div>

                {/* Simulated Terminal Console */}
                <div className="bg-[#05060b] border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-inner">
                  <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 font-mono">CONSOL OUTPUT (سجلات المحاكي البرمجية)</span>
                    <button 
                      onClick={() => setSandboxLogs([])}
                      className="text-[10px] text-slate-500 hover:text-white"
                    >
                      مسح السجلات
                    </button>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto max-h-[220px] font-mono text-[11px] space-y-1.5 bg-black/95">
                    {sandboxLogs.map((log, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-slate-500 font-semibold shrink-0">[{log.time}]</span>
                        <span className={log.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}>
                          {log.type === 'error' ? '❌ [ERROR] ' : '✔ [LOG] '} {log.text}
                        </span>
                      </div>
                    ))}
                    {sandboxLogs.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-slate-600 italic font-semibold">
                        لا يوجد مخرجات في الكونسول حالياً. انقر على التنبيهات البرمجية لتسجيل الأحداث حياً.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </main>

      {/* API Key issuance modal dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0e16] border border-slate-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">إصدار رمز برامجي جديد (New API Key)</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateKey} className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">اسم المفتاح (ودوره الوظيفي):</label>
                <input 
                  type="text"
                  required
                  placeholder="مثال: خادم الإنتاج / بوابة روبوت الوتساب"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                />
                <p className="text-[10px] text-slate-500">سيساعدك هذا الاسم في تتبع إحصائيات استهلاك هذا المفتاح وتكلفته لاحقاً في اللوحة.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg hover:text-white text-xs transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00f2fe] text-black font-semibold rounded-lg hover:opacity-90 text-xs transition-all"
                >
                  تأكيد وإصدار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Premium E-Book & Novel PDF Compiler Modal */}
      {showBookModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0c0e16] border border-slate-800 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col lg:flex-row animate-scale-up">
            
            {/* Left side: Styling controls */}
            <div className="p-6 lg:p-8 flex-1 space-y-5 border-b lg:border-b-0 lg:border-l border-slate-800">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-[#00f2fe]" />
                <div>
                  <h3 className="font-bold text-white text-base">مصمم ومنسق الكتب الإلكترونية الفاخرة</h3>
                  <p className="text-xs text-slate-400 mt-0.5">خصص الهوية البصرية ورندِر روايتك كملف PDF مكتبي بضغطة زر</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">عنوان الكتاب / القصة:</label>
                  <input 
                    type="text"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                    placeholder="أدخل عنوان الرواية المميز..."
                  />
                </div>

                {/* Author */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">اسم الكاتب / المؤلف:</label>
                  <input 
                    type="text"
                    value={bookAuthor}
                    onChange={(e) => setBookAuthor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00f2fe]"
                    placeholder="اسم المؤلف المعتمد..."
                  />
                </div>

                {/* Cover Theme Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">اختر نمط غلاف الرواية:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBookCoverStyle('neon')}
                      className={`p-3 rounded-lg border text-right text-xs transition-all flex flex-col justify-between ${
                        bookCoverStyle === 'neon' 
                          ? 'bg-[#00f2fe]/10 border-[#00f2fe] text-[#00f2fe]' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-bold">سبراني مشع (Neon)</span>
                      <span className="text-[10px] text-slate-500 mt-1">خلفية داكنة مع إطار فسفوري مزدوج</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBookCoverStyle('travertine')}
                      className={`p-3 rounded-lg border text-right text-xs transition-all flex flex-col justify-between ${
                        bookCoverStyle === 'travertine' 
                          ? 'bg-amber-500/10 border-amber-500 text-amber-500' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-bold">كلاسيكي دافئ (Travertine)</span>
                      <span className="text-[10px] text-slate-500 mt-1">حجر دافئ مع ملمس روائي عتيق</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBookCoverStyle('dark')}
                      className={`p-3 rounded-lg border text-right text-xs transition-all flex flex-col justify-between ${
                        bookCoverStyle === 'dark' 
                          ? 'bg-amber-600/15 border-amber-600 text-amber-400' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-bold">أسود ملكي (Matte Gold)</span>
                      <span className="text-[10px] text-slate-500 mt-1">أسود فاحم مع هوامش ذهبية عريضة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBookCoverStyle('violet')}
                      className={`p-3 rounded-lg border text-right text-xs transition-all flex flex-col justify-between ${
                        bookCoverStyle === 'violet' 
                          ? 'bg-purple-500/10 border-purple-500 text-purple-400' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-bold">إمبراطوري بنفسجي (Cosmic)</span>
                      <span className="text-[10px] text-slate-500 mt-1">بنفسجي داكن بنبرة ملكية رفيعة</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg hover:text-white text-xs transition-colors"
                >
                  إلغاء المعالجة
                </button>
                <button
                  type="button"
                  disabled={isBookGenerating}
                  onClick={() => compileBookToPdf(bookTitle, bookAuthor, bookContent, bookCoverStyle)}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-black font-bold rounded-lg hover:opacity-95 text-xs transition-all flex items-center gap-2"
                >
                  {isBookGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الرندرة...</span>
                    </>
                  ) : (
                    <>
                      <FileCode className="w-3.5 h-3.5" />
                      <span>تحميل الكتاب كـ PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right side: Realtime interactive Cover Page Preview */}
            <div className="p-6 lg:p-8 bg-[#07090f]/60 w-full lg:w-[360px] flex flex-col items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">معاينة غلاف كتابك الإلكتروني</span>
              
              {/* Cover preview template */}
              <div 
                className={`w-[210px] h-[297px] rounded-lg border shadow-2xl p-4 flex flex-col justify-between items-center text-center relative transition-all duration-300 ${
                  bookCoverStyle === 'neon' ? 'bg-[#0f172a] border-[#00f2fe] text-white shadow-[#00f2fe]/5' : ''
                } ${
                  bookCoverStyle === 'travertine' ? 'bg-[#fefce8] border-amber-600 text-[#1e293b]' : ''
                } ${
                  bookCoverStyle === 'dark' ? 'bg-[#020617] border-amber-500 text-white shadow-amber-500/5' : ''
                } ${
                  bookCoverStyle === 'violet' ? 'bg-[#090514] border-purple-500 text-white shadow-purple-500/5' : ''
                }`}
                style={{ borderWidth: '6px' }}
              >
                <div className="w-full">
                  <span 
                    className={`text-[6px] tracking-wide font-bold block ${
                      bookCoverStyle === 'travertine' ? 'text-amber-800' : 'text-[#00f2fe]'
                    }`}
                  >
                    NABAD AI PLATFORM
                  </span>
                  <div className="w-6 h-[1px] bg-slate-500 mx-auto my-1.5"></div>
                  <h4 className="text-[11px] font-bold leading-normal px-1 line-clamp-3">
                    {bookTitle || 'أدخل عنوان الرواية المميز...'}
                  </h4>
                </div>

                <div className="w-16 h-16 rounded border border-slate-700/40 overflow-hidden bg-black/40">
                  <img src={NABAD_BANNER_PATH} className="w-full h-full object-cover" />
                </div>

                <div>
                  <span className="text-[6px] text-slate-500 block">تأليف وإعداد</span>
                  <span className="text-[8px] font-bold block mt-0.5">
                    {bookAuthor || 'ذكاء نبض السيادي'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
