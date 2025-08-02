
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { marked } from 'marked';

// Add this to fix TypeScript errors for SpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

// Configure marked for rich text rendering
marked.setOptions({
  breaks: true, // Convert '\n' in paragraphs into <br>
  gfm: true,    // Use GitHub Flavored Markdown
});

// --- TYPE DEFINITIONS ---
interface StudyPlan {
  plan: string[];
}

interface QuizItem {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

// Refactored to store strings, not React nodes, for better state management
type ConversationMessage = {
  id: number;
  role: 'user' | 'model' | 'system';
  content: string; 
  topic?: string;
  imageUrls?: string[];
  isThinking?: boolean;
  isTopicExplanation?: boolean;
};

type SetupStep = 'askAiName' | 'askUserName' | 'complete';

type BadgeId = 'first_step' | 'curious_mind' | 'halfway' | 'master' | 'challenge_master' | 'quiz_champion';

type Badge = {
    id: BadgeId;
    name: string;
    description: string;
    icon: string;
};


// --- SVG Icons ---
const MicIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line>
    </svg>
);
const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"></path>
    </svg>
);
const PauseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>
    </svg>
);
const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
);
const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
);
const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5"></path>
        <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
);
const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
);
const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);
const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
);
const TrophyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
);
const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);
const SummarizeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"></line>
        <line x1="8" y1="12" x2="21" y2="12"></line>
        <line x1="8" y1="18" x2="21" y2="18"></line>
        <line x1="3" y1="6" x2="3.01" y2="6"></line>
        <line x1="3" y1="12" x2="3.01" y2="12"></line>
        <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
);
const AnalogyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path>
    </svg>
);
const ExampleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a7 7 0 0 0-7 7c0 3.04 1.63 5.58 4 6.67V17a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1.33c2.37-1.09 4-3.63 4-6.67a7 7 0 0 0-7-7z"></path>
        <path d="M9 21h6"></path>
    </svg>
);


const allBadges: Badge[] = [
    { id: 'first_step', name: 'İlk Adım', description: 'İlk konuyu tamamladın.', icon: '🚀' },
    { id: 'curious_mind', name: 'Meraklı Zihin', description: '3 farklı konuyu tamamladın.', icon: '🧠' },
    { id: 'halfway', name: 'Yolun Yarısı', description: 'Konuların %50\'sini tamamladın.', icon: '🚩' },
    { id: 'master', name: 'Konu Hakimi', description: 'Tüm konuları tamamladın.', icon: '👑' },
    { id: 'challenge_master', name: 'Meydan Okuma Ustası', description: 'Meydan okuma modunu kullandın.', icon: '⚔️' },
    { id: 'quiz_champion', name: 'Sınav Şampiyonu', description: 'Tekrar testinde 100% başarı elde ettin.', icon: '🏆' },
];

const SetupScreen = ({ setupStep, aiName, onAiNameSubmit, onUserNameSubmit }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (setupStep === 'askAiName') {
            onAiNameSubmit(name);
        } else {
            onUserNameSubmit(name);
        }
        setName('');
    };
    
    const title = setupStep === 'askAiName' ? 'Yapay zeka arkadaşına bir isim ver' : `Harika! ${aiName} ile tanış. Peki, ${aiName} sana nasıl hitap etsin?`;
    const placeholder = setupStep === 'askAiName' ? 'Asistan adı...' : 'Senin adın...';
    const buttonText = 'Devam';

    return (
        <div className="name-entry-container">
            <h2>{title}</h2>
            <form onSubmit={handleSubmit} className="topic-form">
                 <div className="input-wrapper">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={placeholder}
                        className="topic-input"
                        autoFocus
                    />
                 </div>
                <button type="submit" className="btn" disabled={!name.trim()}>{buttonText}</button>
            </form>
        </div>
    );
};


const App = () => {
  const [ai, setAi] = useState<GoogleGenAI | null>(null);
  const [aiName, setAiName] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [setupStep, setSetupStep] = useState<SetupStep>('askAiName');
  const [topic, setTopic] = useState('');
  const [studyPlan, setStudyPlan] = useState<string[] | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  
  // Gamification state
  const [completedTopics, setCompletedTopics] = useState<Set<string>>(new Set());
  const [allTopicsUnlocked, setAllTopicsUnlocked] = useState(false);
  const [unlockedBadges, setUnlockedBadges] = useState<Set<BadgeId>>(new Set());
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  
  // Quiz state
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [finalQuizQuestions, setFinalQuizQuestions] = useState<QuizItem[]>([]);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizCorrectionSummary, setQuizCorrectionSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [explanations, setExplanations] = useState<{ [key: number]: string }>({});
  const [explanationLoadingState, setExplanationLoadingState] = useState<{ [key: number]: boolean }>({});


  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | string | null>(null);
  const recognitionRef = useRef<any | null>(null);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const conversationEndRef = useRef<HTMLDivElement | null>(null);

  // --- Effects ---
  useEffect(() => {
    // API Key check
    //const apiKey = process.env.API_KEY;
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey) {
      console.error("API key is missing. Please set the API_KEY environment variable.");
      return;
    }
    setAi(new GoogleGenAI({ apiKey }));
    
    // Load theme
    const savedTheme = localStorage.getItem('aiStudyBuddyTheme') as 'light' | 'dark' | null;
    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
    }

    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'tr-TR';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCurrentQuestion(transcript);
      };
      recognitionRef.current = recognition;
    } else {
      console.warn("Speech Recognition not supported by this browser.");
    }
  }, []);
  
   // Load user names and check for existing study plan
  useEffect(() => {
    if (!userName) return; // Only run after user name is set
    
    const savedPlanData = localStorage.getItem('studyPlanData');
    if (savedPlanData) {
        const { topic: savedTopic, plan: savedPlan, completed: savedCompleted, allUnlocked: savedAllUnlocked, badges: savedBadges } = JSON.parse(savedPlanData);
        setTopic(savedTopic);
        setStudyPlan(savedPlan);
        setCompletedTopics(new Set(savedCompleted));
        setAllTopicsUnlocked(savedAllUnlocked || false);
        setUnlockedBadges(new Set(savedBadges || []));
        
        const welcomeBackMessage = `Tekrar hoş geldin, ${userName}! "${savedTopic}" konusundaki çalışmana kaldığın yerden devam edebilirsin.`;
        addMessage('system', welcomeBackMessage);
    }
  }, [userName]);


  useEffect(() => {
      // Load user/ai names
    const savedAiName = localStorage.getItem('aiStudyBuddyName');
    const savedUserName = localStorage.getItem('aiStudyBuddyUserName');
    if (savedAiName && savedUserName) {
      setAiName(savedAiName);
      setUserName(savedUserName);
      setSetupStep('complete');
    } else if (savedAiName) {
      setAiName(savedAiName);
      setSetupStep('askUserName');
    }
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aiStudyBuddyTheme', theme);
  }, [theme]);

  // Persist study progress and badges
  useEffect(() => {
      if (studyPlan && studyPlan.length > 0) {
          const dataToSave = {
              topic: topic,
              plan: studyPlan,
              completed: Array.from(completedTopics),
              allUnlocked: allTopicsUnlocked,
              badges: Array.from(unlockedBadges),
          };
          localStorage.setItem('studyPlanData', JSON.stringify(dataToSave));
      }
  }, [completedTopics, studyPlan, topic, allTopicsUnlocked, unlockedBadges]);

  // Check for badge unlocks based on progress
    useEffect(() => {
        if (!studyPlan || studyPlan.length === 0) return;

        const newBadges = new Set<BadgeId>();
        if (completedTopics.size >= 1) newBadges.add('first_step');
        if (completedTopics.size >= 3) newBadges.add('curious_mind');
        if (studyPlan.length > 0 && (completedTopics.size / studyPlan.length) >= 0.5) newBadges.add('halfway');
        if (studyPlan.length > 0 && completedTopics.size === studyPlan.length) newBadges.add('master');

        if (newBadges.size > 0) {
            setUnlockedBadges(prev => {
                const updatedBadges = new Set(prev);
                let hasChanged = false;
                newBadges.forEach(b => {
                    if (!updatedBadges.has(b)) {
                        updatedBadges.add(b);
                        hasChanged = true;
                    }
                });
                return hasChanged ? updatedBadges : prev;
            });
        }
    }, [completedTopics, studyPlan]);
  
  // --- Core Functions ---
  const stopSpeech = () => {
      if (window.speechSynthesis?.speaking) {
          window.speechSynthesis.cancel();
      }
      setSpeakingMessageId(null);
  };

  const handleToggleSpeech = (id: number | string, text: string) => {
      if (speakingMessageId === id) {
          stopSpeech();
      } else {
          stopSpeech(); // Stop any currently playing speech first
          if (!window.speechSynthesis || !text) return;
          
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'tr-TR';
          utterance.onend = () => setSpeakingMessageId(null);
          utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
              if (e.error !== 'interrupted' && e.error !== 'canceled') {
                console.error("Speech synthesis error:", e.error);
              }
              setSpeakingMessageId(null);
          };
          
          setSpeakingMessageId(id);
          window.speechSynthesis.speak(utterance);
      }
  };
  
  const addMessage = (role: 'user' | 'model' | 'system', content: string, topic?: string) => {
    const newMessage: ConversationMessage = { id: Date.now(), role, content, topic, imageUrls: [] };
    setConversation(prev => [...prev, newMessage]);
  };
  
  const handleToggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  // --- Event Handlers ---
  const handleAiNameSubmit = (name: string) => {
    if (name.trim()) {
        localStorage.setItem('aiStudyBuddyName', name.trim());
        setAiName(name.trim());
        setSetupStep('askUserName');
    }
  };
  
  const handleUserNameSubmit = (name: string) => {
    if (name.trim()) {
        localStorage.setItem('aiStudyBuddyUserName', name.trim());
        setUserName(name.trim());
        setSetupStep('complete');
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !ai) return;

    stopSpeech();
    setIsPlanLoading(true);
    setStudyPlan(null);
    setCompletedTopics(new Set());
    setActiveTopic(null);
    setConversation([]);
    setAllTopicsUnlocked(false);
    setUnlockedBadges(new Set());
    localStorage.removeItem('studyPlanData'); // Clear old plan

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Benim adım ${aiName} ve ben bir yapay zeka çalışma arkadaşıyım. Kullanıcım ${userName}'in öğrenmek istediği konu: "${topic}". Bu konu için kısa ve öz bir çalışma planı oluştur. Konuyu 5 ila 7 temel alt başlığa ayır. Cevabı Türkçe olarak ver.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              plan: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      });
      const data: StudyPlan = JSON.parse(response.text);
      setStudyPlan(data.plan);
      setCompletedTopics(new Set()); // Reset progress for new plan
      const systemMessage = `Harika, ${userName}! ${aiName} olarak senin için bir çalışma planı hazırladım. Başlamak için soldaki öğrenme yolundan bir konu seç.`;
      addMessage('system', systemMessage);
    } catch (error) {
      console.error("Failed to create study plan:", error);
      addMessage('system', `Üzgünüm, bir çalışma planı oluşturamadım. Lütfen başka bir konu deneyin.`);
    } finally {
      setIsPlanLoading(false);
    }
  };

  const handleSelectTopic = async (selectedTopic: string) => {
    if (!ai || isLoading) return;

    stopSpeech();
    setActiveTopic(selectedTopic);
    setIsLoading(true);

    const placeholderId = Date.now();
    const placeholderMessage: ConversationMessage = {
        id: placeholderId,
        role: 'model',
        content: `${aiName} düşünüyor...`,
        isThinking: true,
        imageUrls: [],
    };
    setConversation([placeholderMessage]);

    try {
        const explanationResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Benim adım ${aiName}. Kullanıcım ${userName}'e "${topic}" genel başlığı altındaki "${selectedTopic}" kavramını açıkla. Yeni başlayan birinin anlayabileceği şekilde açık, kısa ve net olsun. Vurgu yapmak için markdown (**kalın** veya *italik*) ve listeler için madde imleri kullan. Okunabilirlik için paragraflar kullan.

Ayrıca, bu konuyu görselleştirmek için bir resim oluşturma istemi (image prompt) oluştur. Bu istem, konunun özünü yansıtan, metin, harf veya sayı içermeyen, minimalist, sembolik ve sanatsal bir görseli tanımlamalıdır.

Cevabını, "explanation" (açıklama metnini içeren string) ve "imagePrompt" (resim istemini içeren string) olmak üzere iki anahtar içeren tek bir JSON nesnesi olarak döndür. JSON nesnesi dışında başka hiçbir metin ekleme. Sadece JSON döndür. Cevabın Türkçe olmalı.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        explanation: { type: Type.STRING, description: "Konunun açıklaması." },
                        imagePrompt: { type: Type.STRING, description: "Görsel oluşturmak için kullanılacak istem." }
                    }
                }
            }
        });
        
        const data: { explanation: string; imagePrompt: string } = JSON.parse(explanationResponse.text);

        let imageUrls: string[] = [];
        if (data.imagePrompt) {
            try {
                const imageResponse = await ai.models.generateImages({
                    model: 'imagen-3.0-generate-002',
                    prompt: data.imagePrompt,
                    config: {
                      numberOfImages: 1,
                      outputMimeType: 'image/jpeg',
                      aspectRatio: '1:1',
                    }
                });
                
                const base64ImageBytes = imageResponse.generatedImages[0]?.image?.imageBytes;
                if (base64ImageBytes) {
                    imageUrls.push(`data:image/jpeg;base64,${base64ImageBytes}`);
                }
            } catch (imageError) {
                console.error("Failed to generate image:", imageError);
            }
        }
        
        const finalMessage: ConversationMessage = {
            id: placeholderId,
            role: 'model',
            content: data.explanation,
            topic: selectedTopic,
            imageUrls: imageUrls,
            isThinking: false,
            isTopicExplanation: true,
        };

        setConversation([finalMessage]);
        
        // Mark topic as completed
        setCompletedTopics(prev => {
            const newCompleted = new Set(prev);
            newCompleted.add(selectedTopic);
            return newCompleted;
        });

    } catch (error) {
        console.error("Failed to generate topic explanation:", error);
        const errorMessage: ConversationMessage = {
            id: placeholderId,
            role: 'model',
            content: 'Konuyla ilgili açıklama alınırken bir hata oluştu. Lütfen tekrar deneyin.',
            isThinking: false,
            imageUrls: [],
        };
        setConversation([errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleAskQuestion = async (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    if (!currentQuestion.trim() || !ai || isLoading) return;

    stopSpeech();
    const question = currentQuestion;
    addMessage('user', question);
    setCurrentQuestion('');
    setIsLoading(true);

    try {
      const lastModelMessage = conversation.filter(m => m.role === 'model' && !m.isThinking && m.content).pop()?.content;

      const promptContext = lastModelMessage
        ? `Konuşmadaki son yanıtım şuydu: "${lastModelMessage}". Şimdi kullanıcının yeni mesajı bu bağlamda değerlendirilecek.`
        : `Bu, konuşmanın başlangıcı.`;

      const fullPrompt = `Benim adım ${aiName} ve kullanıcım ${userName}'e yardımcı oluyorum. Genel konumuz "${topic}". ${promptContext} Kullanıcının mesajı: "${question}". Bu mesaja uygun, yardımcı ve samimi bir şekilde yanıt ver. Gerekirse markdown kullan. Cevabı Türkçe olarak ver.`;
      
      const result = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
      });

      let fullText = '';
      const messageId = Date.now();
      setConversation(prev => [...prev, { id: messageId, role: 'model', content: '', imageUrls: [] }]);
      
      for await (const chunk of result) {
        fullText += chunk.text;
        setConversation(prev => prev.map(m => m.id === messageId ? { ...m, content: fullText } : m));
      }
    } catch (error) {
      console.error("Failed to ask question:", error);
      addMessage('model', 'Sorunuzu yanıtlarken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      stopSpeech();
      setCurrentQuestion('');
      recognitionRef.current.start();
    }
  };

  const handleDeeperLearningRequest = async (originalMessage: ConversationMessage, requestType: 'summarize' | 'analogy' | 'example') => {
    if (!ai || isLoading) return;

    stopSpeech();

    let userPromptText = '';
    let aiPromptInstruction = '';
    
    // Use the sub-topic if available, otherwise create a generic reference.
    const subjectText = originalMessage.topic ? `"${originalMessage.topic}" konusunu` : 'bu yanıtı';
    const contextDescription = originalMessage.topic 
        ? `Kullanıcım, "${topic}" genel konusu bağlamında "${originalMessage.topic}" alt konusunu öğreniyor.`
        : `Kullanıcım, "${topic}" genel konusu hakkında sohbet ediyor ve az önce şu yanıtı aldı:`;

    switch (requestType) {
        case 'summarize':
            userPromptText = `${subjectText} benim için özetler misin?`;
            aiPromptInstruction = `Az önceki yanıtı ${userName} için özetle.`;
            break;
        case 'analogy':
            userPromptText = `${subjectText} bir analoji ile anlatabilir misin?`;
            aiPromptInstruction = `Az önceki yanıtı basit bir analoji kullanarak ${userName} için yeniden anlat.`;
            break;
        case 'example':
            userPromptText = `${subjectText} için gerçek hayattan bir örnek verebilir misin?`;
            aiPromptInstruction = `Az önceki yanıtla ilgili gerçek hayattan somut bir örnek ver.`;
            break;
    }
    
    addMessage('user', userPromptText);
    setIsLoading(true);

    try {
        const fullPrompt = `Benim adım ${aiName} ve kullanıcım ${userName}'e yardımcı oluyorum. ${contextDescription}
Orijinal metin şuydu: "${originalMessage.content}"
Kullanıcının isteği: "${aiPromptInstruction}"
Lütfen bu isteği, orijinal metni temel alarak ama yeni ve özgün bir şekilde yanıtla. Cevabı Türkçe olarak ver ve markdown kullan.`;

        const result = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
        });

        let fullText = '';
        const messageId = Date.now();
        setConversation(prev => [...prev, { id: messageId, role: 'model', content: '', imageUrls: [] }]);
        
        for await (const chunk of result) {
            fullText += chunk.text;
            setConversation(prev => prev.map(m => m.id === messageId ? { ...m, content: fullText } : m));
        }

    } catch (error) {
        console.error("Deeper learning request failed:", error);
        addMessage('model', 'İsteğinizi yanıtlarken bir hata oluştu.');
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleStartFinalQuiz = async () => {
    if (!ai || !studyPlan) return;
    stopSpeech();
    setIsQuizLoading(true);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Kullanıcım ${userName} için, "${topic}" ana konusu ve "${studyPlan.join(', ')}" alt başlıklarını kapsayan, çoktan seçmeli 10 soruluk bir test oluştur. Her sorunun 4 seçeneği olmalı ve sadece biri doğru olmalı. Cevabı Türkçe olarak ver.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        quiz: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    question: { type: Type.STRING },
                                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    correctAnswerIndex: { type: Type.INTEGER }
                                }
                            }
                        }
                    }
                }
            }
        });
        const data: { quiz: QuizItem[] } = JSON.parse(response.text);
        if (data.quiz && data.quiz.length > 0) {
            setFinalQuizQuestions(data.quiz);
            setUserAnswers(new Array(data.quiz.length).fill(null));
            setCurrentQuizIndex(0);
            setIsQuizActive(true);
            setIsQuizFinished(false);
            setQuizCorrectionSummary(null);
            setExplanations({});
            setExplanationLoadingState({});
        }
    } catch (error) {
        console.error("Failed to create final quiz:", error);
        alert("Üzgünüm, genel tekrar testi oluşturulurken bir hata oluştu.");
    } finally {
        setIsQuizLoading(false);
    }
  };

  const generateIncorrectAnswerExplanation = async (questionIndex: number, selectedOptionIndex: number) => {
    if (!ai) return;

    const questionItem = finalQuizQuestions[questionIndex];
    if (!questionItem || explanations[questionIndex]) return;

    setExplanationLoadingState(prev => ({ ...prev, [questionIndex]: true }));

    const prompt = `Ben bir öğrenme asistanıyım. Kullanıcım ${userName}, "${topic}" konusuyla ilgili bir soruyu yanlış cevapladı.
    Soru: "${questionItem.question}"
    Kullanıcının yanlış cevabı: "${questionItem.options[selectedOptionIndex]}"
    Doğru cevap: "${questionItem.options[questionItem.correctAnswerIndex]}"

    Lütfen bu yanlışın nedenini çok kısa ve öz bir şekilde, öğrenmeyi pekiştirecek biçimde açıkla. Sadece açıklamayı ver, başka bir şey ekleme. Cevabı Türkçe olarak ver.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        setExplanations(prev => ({ ...prev, [questionIndex]: response.text }));
    } catch (error) {
        console.error("Error generating incorrect answer explanation:", error);
        setExplanations(prev => ({ ...prev, [questionIndex]: "Açıklama getirilirken bir hata oluştu." }));
    } finally {
        setExplanationLoadingState(prev => ({ ...prev, [questionIndex]: false }));
    }
  };

  const handleSelectAnswer = async (questionIndex: number, optionIndex: number) => {
    if (userAnswers[questionIndex] !== null) return;
    
    setUserAnswers(prev => {
        const newAnswers = [...prev];
        newAnswers[questionIndex] = optionIndex;
        return newAnswers;
    });

    const isCorrect = finalQuizQuestions[questionIndex]?.correctAnswerIndex === optionIndex;
    if (!isCorrect) {
        await generateIncorrectAnswerExplanation(questionIndex, optionIndex);
    }
  };

  const generateCorrectionsSummary = async () => {
    if (!ai) return;

    const incorrectAnswers = finalQuizQuestions.map((q, i) => ({ q, i }))
        .filter(({ q, i }) => userAnswers[i] !== null && userAnswers[i] !== q.correctAnswerIndex);

    let summary = '';
    if (incorrectAnswers.length === 0) {
        summary = `Harika iş, ${userName}! Tüm soruları doğru bildin. Konuyu çok iyi kavramışsın.`;
        setQuizCorrectionSummary(summary);
        return;
    }

    setIsSummaryLoading(true);
    const prompt = `Benim adım ${aiName}. Kullanıcım ${userName}'e yardımcı oluyorum. ${userName}, "${topic}" konusuyla ilgili girdiği testte aşağıdaki sorularda hata yaptı. Her bir sorunun doğru cevabını, neden doğru olduğunu açıklayarak özetle. Açıklamaları ${userName}'in anlayacağı şekilde net, anlaşılır ve öğrenmeyi pekiştirici bir dille yap. Cevabı Türkçe olarak ver ve markdown kullan. Sorular:\n\n${incorrectAnswers.map(({ q, i }) => `- Soru: "${q.question}" (${userName}'in Yanlış Cevabı: "${q.options[userAnswers[i] as number]}", Doğru Cevap: "${q.options[q.correctAnswerIndex]}")`).join('\n')}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        summary = response.text;
        setQuizCorrectionSummary(summary);
    } catch (error) {
        console.error("Error generating corrections summary:", error);
        summary = "Yanlışların için açıklamaları oluştururken bir hata oluştu.";
        setQuizCorrectionSummary(summary);
    } finally {
        setIsSummaryLoading(false);
    }
  };

  const handleFinishQuiz = () => {
      stopSpeech();
      const correctAnswers = userAnswers.filter((a, i) => a === finalQuizQuestions[i].correctAnswerIndex).length;
      if (finalQuizQuestions.length > 0 && correctAnswers === finalQuizQuestions.length) {
          if (!unlockedBadges.has('quiz_champion')) {
              setUnlockedBadges(prev => new Set(prev).add('quiz_champion'));
          }
      }
      setIsQuizActive(false);
      setIsQuizFinished(true);
      generateCorrectionsSummary();
  };
  
  const handleCloseResults = () => {
      stopSpeech();
      setIsQuizFinished(false);
      setFinalQuizQuestions([]);
      setUserAnswers([]);
      setCurrentQuizIndex(0);
      setQuizCorrectionSummary(null);
      setExplanations({});
      setExplanationLoadingState({});
  }

  const handleExitQuiz = () => {
    stopSpeech();
    setIsQuizActive(false);
    setFinalQuizQuestions([]);
    setUserAnswers([]);
    setCurrentQuizIndex(0);
    setQuizCorrectionSummary(null);
    setExplanations({});
    setExplanationLoadingState({});
  };

  const handleReturnToMainMenu = () => {
    stopSpeech();
    setStudyPlan(null);
    setTopic('');
    setConversation([]);
    setActiveTopic(null);
    setIsQuizActive(false);
    setIsQuizFinished(false);
    setFinalQuizQuestions([]);
    setQuizCorrectionSummary(null);
    setCompletedTopics(new Set());
    setAllTopicsUnlocked(false);
    setUnlockedBadges(new Set());
    setExplanations({});
    setExplanationLoadingState({});
    localStorage.removeItem('studyPlanData');
  };

  const handleUnlockAll = () => {
    setAllTopicsUnlocked(true);
    addMessage('system', `Harika! Tüm konu kilitleri açıldı. Şimdi istediğin konuyu seçebilirsin, ${userName}.`);
  };

  const handleExportNotes = () => {
    if (!studyPlan) return;
    
    stopSpeech();

    const modelMessages = conversation.filter(
      (msg) => msg.role === 'model' && !msg.isThinking && msg.content
    );

    if (modelMessages.length === 0) {
      alert("Dışa aktarılacak bir not bulunmuyor.");
      return;
    }

    let htmlContent = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <title>Ders Notları: ${topic}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; color: #333; }
          h1 { color: #111; }
          h2 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 8px; margin-top: 2rem; }
          img { max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .message { margin-bottom: 2.5rem; }
          code { background-color: #f4f4f4; padding: 2px 5px; border-radius: 4px; }
          pre { background-color: #f4f4f4; padding: 1rem; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; }
        </style>
      </head>
      <body>
        <h1>Ders Notları: ${topic}</h1>
    `;

    modelMessages.forEach(msg => {
      htmlContent += '<div class="message">';
      if (msg.topic) {
        htmlContent += `<h2>${msg.topic}</h2>`;
      }
      if (msg.imageUrls && msg.imageUrls.length > 0) {
        msg.imageUrls.forEach(url => {
          htmlContent += `<img src="${url}" alt="${msg.topic || 'görsel'}">`;
        });
      }
      htmlContent += marked(msg.content);
      htmlContent += '</div>';
    });

    htmlContent += `</body></html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ders-notlari-${topic.replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleChallengeMe = async () => {
    if (!ai || isLoading || completedTopics.size === 0) return;

    stopSpeech();
    setIsLoading(true);

    try {
        const completedArray = Array.from(completedTopics);
        const randomTopic = completedArray[Math.floor(Math.random() * completedArray.length)];

        addMessage('system', `Haydi bakalım, ${userName}! "${randomTopic}" konusunu ne kadar hatırlıyorsun?`);
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Benim adım ${aiName}. Kullanıcım ${userName}'e daha önce çalıştığı "${randomTopic}" konusuyla ilgili, onun bilgisini test edecek kısa ve net bir soru sor. Cevabın sadece soruyu içersin, başka bir metin ekleme.`,
        });

        addMessage('model', response.text);

        if (!unlockedBadges.has('challenge_master')) {
            setUnlockedBadges(prev => new Set(prev).add('challenge_master'));
        }

    } catch (error) {
        console.error("Challenge Me failed:", error);
        addMessage('model', 'Sana meydan okurken bir hata oluştu. Lütfen tekrar dene.');
    } finally {
        setIsLoading(false);
    }
  };


  // --- Render Logic ---
  if (!ai) {
    return <div className="loading-container">API Anahtarı Yükleniyor veya Bulunamadı. Lütfen konsolu kontrol edin.</div>;
  }
  
  if (setupStep !== 'complete') {
    return (
        <div className="setup-container">
            <SetupScreen
                setupStep={setupStep}
                aiName={aiName}
                onAiNameSubmit={handleAiNameSubmit}
                onUserNameSubmit={handleUserNameSubmit}
            />
        </div>
    );
  }
  
  return (
    <div className="app">
      <header className="header">
        <h1>Yapay Zeka Asistanın: {aiName}</h1>
        <button 
            onClick={handleToggleTheme} 
            className="btn-icon theme-toggle-btn" 
            aria-label={`Temayı değiştir, geçerli tema: ${theme === 'light' ? 'Açık' : 'Koyu'}`}
        >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>
      </header>
      <main className="main-content">
        {!studyPlan && !isPlanLoading && (
          <div className="topic-entry-container">
            <h2>Merhaba {userName}, bugün ne öğrenmek istersin?</h2>
            <form id="topic-form" className="topic-form" onSubmit={handleCreatePlan}>
              <div className="input-wrapper">
                <input
                  type="text"
                  className="topic-input"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Bir konu yazın..."
                  aria-label="Öğrenilecek Konu"
                />
              </div>
              <button type="submit" className="btn" disabled={!topic.trim()}>Plan Oluştur</button>
            </form>
          </div>
        )}

        {isPlanLoading && <div className="loading-spinner"></div>}

        {studyPlan && (
          <div className="study-layout">
            <aside className="sidebar">
              <div className="sidebar-header">
                <h2>Öğrenme Yolculuğu</h2>
                <div className="sidebar-header-actions">
                    <button onClick={() => setIsProgressModalOpen(true)} className="btn-icon" aria-label="Gelişimimi Göster">
                        <TrophyIcon />
                    </button>
                    <button onClick={handleExportNotes} className="btn-icon" aria-label="Notları Dışa Aktar">
                        <DownloadIcon />
                    </button>
                    <button onClick={handleReturnToMainMenu} className="btn-icon btn-back" aria-label="Ana Menüye Dön">
                        <BackIcon />
                    </button>
                </div>
              </div>
              <p className="sidebar-topic">{topic}</p>
              {studyPlan && !allTopicsUnlocked && (
                 <button onClick={handleUnlockAll} className="btn btn-secondary btn-unlock-all">
                    Tüm Kilitleri Aç
                 </button>
              )}
               {completedTopics.size > 0 && (
                    <button onClick={handleChallengeMe} className="btn btn-secondary btn-full-width btn-challenge" disabled={isLoading}>
                        Bana Meydan Oku
                    </button>
               )}
               <div className="learning-journey">
                {studyPlan.map((item, index) => {
                  const isCompleted = completedTopics.has(item);
                  const isUnlocked = allTopicsUnlocked || index === 0 || completedTopics.has(studyPlan[index - 1]);
                  const isNextUncompleted = !isCompleted && isUnlocked;

                  return (
                    <div
                      key={index}
                      className={`journey-step ${isCompleted ? 'completed' : ''} ${!isUnlocked ? 'locked' : ''} ${activeTopic === item ? 'active' : ''} ${isNextUncompleted ? 'next' : ''}`}
                      onClick={() => isUnlocked && handleSelectTopic(item)}
                      aria-disabled={!isUnlocked}
                    >
                      <div className="step-icon">
                        {isCompleted ? <CheckIcon /> : (isUnlocked ? <span className="step-number">{index + 1}</span> : <LockIcon />)}
                      </div>
                      <span className="step-label">{item}</span>
                    </div>
                  );
                })}
              </div>
              {studyPlan.length > 0 && (completedTopics.size === studyPlan.length || allTopicsUnlocked) && (
                 <button className="btn btn-secondary btn-full-width" onClick={handleStartFinalQuiz} disabled={isQuizLoading}>
                    {isQuizLoading ? 'Test Hazırlanıyor...' : 'Genel Tekrar Testi Başlat'}
                 </button>
              )}
            </aside>
            <div className="content-panel">
                <div className="conversation-container">
                    {conversation.map((msg) => (
                        <div key={msg.id} className={`message ${msg.role}`}>
                            <div className="message-content">
                                {msg.isThinking ? (
                                    <div className="thinking-placeholder">
                                        <div className="loading-spinner-small"></div>
                                        <span>{msg.content}</span>
                                    </div>
                                ) : (
                                    <>
                                        {msg.imageUrls && msg.imageUrls.map((url, index) => (
                                            <img key={index} src={url} alt={`${msg.topic || 'görsel'} ${index + 1}`} className="message-image" />
                                        ))}
                                        {msg.content && <div className="message-text" dangerouslySetInnerHTML={{ __html: marked(msg.content) as string }}></div>}
                                    </>
                                )}
                            </div>
                           
                            {msg.role === 'model' && !msg.isThinking && msg.content && (
                                <div className="message-actions-toolbar">
                                    <button
                                        onClick={() => handleToggleSpeech(msg.id, msg.content)}
                                        className="btn-icon"
                                        title={speakingMessageId === msg.id ? "Okumayı durdur" : "Mesajı oku"}
                                        aria-label={speakingMessageId === msg.id ? "Okumayı durdur" : "Mesajı oku"}
                                    >
                                        {speakingMessageId === msg.id ? <PauseIcon /> : <PlayIcon />}
                                    </button>
                                    <button onClick={() => handleDeeperLearningRequest(msg, 'summarize')} className="btn-icon" title="Özetle" disabled={isLoading} aria-label="Özetle">
                                        <SummarizeIcon />
                                    </button>
                                    <button onClick={() => handleDeeperLearningRequest(msg, 'analogy')} className="btn-icon" title="Analoji ile Anlat" disabled={isLoading} aria-label="Analoji ile Anlat">
                                        <AnalogyIcon />
                                    </button>
                                    <button onClick={() => handleDeeperLearningRequest(msg, 'example')} className="btn-icon" title="Örnek Ver" disabled={isLoading} aria-label="Örnek Ver">
                                        <ExampleIcon />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    <div ref={conversationEndRef} />
                </div>
                {activeTopic && (
                    <div className="chat-form-container">
                        <form className="chat-form" onSubmit={handleAskQuestion}>
                            <div className="input-wrapper chat-input-wrapper">
                                <input
                                    type="text"
                                    className="chat-input"
                                    value={currentQuestion}
                                    onChange={(e) => setCurrentQuestion(e.target.value)}
                                    placeholder="Konuyla ilgili bir soru sorun..."
                                    disabled={isLoading}
                                    aria-label="Konuyla ilgili soru"
                                />
                                <button
                                    type="button"
                                    className={`btn-icon btn-mic ${isListening ? 'is-listening' : ''}`}
                                    onClick={handleVoiceInput}
                                    disabled={isLoading}
                                    aria-label="Sesli giriş"
                                >
                                    <MicIcon />
                                </button>
                            </div>
                            <button type="submit" className="btn" disabled={isLoading || !currentQuestion.trim()}>Gönder</button>
                        </form>
                    </div>
                )}
            </div>
          </div>
        )}
      </main>
      {isQuizActive && (
          <div className="modal-overlay">
              <div className="modal-content quiz-modal">
                  <div className="quiz-header">
                      <h2>Genel Tekrar Testi</h2>
                      <span className="quiz-progress">{currentQuizIndex + 1} / {finalQuizQuestions.length}</span>
                  </div>
                  <div className="quiz-body">
                      {finalQuizQuestions.length > 0 && (() => {
                          const currentQuizItem = finalQuizQuestions[currentQuizIndex];
                          const hasAnswered = userAnswers[currentQuizIndex] !== null;

                          return (
                              <>
                                  <p className="quiz-question">{currentQuizItem.question}</p>
                                  <div className="quiz-options">
                                      {currentQuizItem.options.map((option, index) => {
                                          let classes = 'quiz-option';
                                          if (hasAnswered) {
                                              classes += ' answered';
                                              if (index === currentQuizItem.correctAnswerIndex) {
                                                  classes += ' correct';
                                              } else if (index === userAnswers[currentQuizIndex]) {
                                                  classes += ' incorrect';
                                              }
                                          }
                                          return (
                                              <div
                                                  key={index}
                                                  className={classes}
                                                  onClick={() => handleSelectAnswer(currentQuizIndex, index)}
                                              >
                                                  {option}
                                              </div>
                                          );
                                      })}
                                  </div>
                                  <div className="explanation-container">
                                    {explanationLoadingState[currentQuizIndex] && (
                                        <div className="loading-spinner-small"></div>
                                    )}
                                    {explanations[currentQuizIndex] && !explanationLoadingState[currentQuizIndex] && (
                                        <div 
                                            className="quiz-explanation"
                                            dangerouslySetInnerHTML={{ __html: marked(explanations[currentQuizIndex]) as string }}
                                        ></div>
                                    )}
                                  </div>
                              </>
                          );
                      })()}
                  </div>
                   <div className="quiz-footer">
                        <button className="btn btn-exit" onClick={handleExitQuiz}>
                            Testten Çık
                        </button>
                        <div className="quiz-navigation-buttons">
                            <button className="btn btn-secondary" onClick={() => setCurrentQuizIndex(prev => Math.max(0, prev - 1))} disabled={currentQuizIndex === 0}>
                                Geri
                            </button>
                            {currentQuizIndex < finalQuizQuestions.length - 1 ? (
                                <button className="btn" onClick={() => setCurrentQuizIndex(prev => Math.min(finalQuizQuestions.length - 1, prev + 1))} disabled={userAnswers[currentQuizIndex] === null}>
                                    İleri
                                </button>
                            ) : (
                                <button className="btn" onClick={handleFinishQuiz} disabled={userAnswers[currentQuizIndex] === null}>
                                    Testi Bitir
                                </button>
                            )}
                        </div>
                    </div>
              </div>
          </div>
      )}

       {isQuizFinished && (
            <div className="modal-overlay">
                <div className="modal-content results-modal">
                    <div className="results-header">
                        <h2>Test Sonuçları</h2>
                        <p className="results-summary">
                            {finalQuizQuestions.length} sorudan {userAnswers.filter((a, i) => a === finalQuizQuestions[i].correctAnswerIndex).length} doğru!
                        </p>
                    </div>
                    <div className="results-body">
                        {isSummaryLoading ? (
                            <div className="loading-spinner"></div>
                        ) : quizCorrectionSummary && (
                            <div className="results-corrections">
                                <h3>Yanlışlarının analizi:</h3>
                                <div className="summary-content-wrapper">
                                     <div className="message-text" dangerouslySetInnerHTML={{ __html: marked(quizCorrectionSummary) as string }}></div>
                                     <button 
                                        onClick={() => handleToggleSpeech('summary', quizCorrectionSummary)}
                                        className="btn-icon btn-speech-toggle" 
                                        aria-label={speakingMessageId === 'summary' ? "Okumayı durdur" : "Açıklamayı oku"}
                                    >
                                        {speakingMessageId === 'summary' ? <PauseIcon /> : <PlayIcon />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="results-footer">
                        <button className="btn" onClick={handleCloseResults}>Kapat</button>
                    </div>
                </div>
            </div>
        )}

      {isProgressModalOpen && studyPlan && (
            <div className="modal-overlay">
                <div className="modal-content progress-modal">
                    <div className="progress-header">
                        <h2>Gelişimim</h2>
                        <button onClick={() => setIsProgressModalOpen(false)} className="btn-icon" aria-label="Kapat">
                            <CloseIcon />
                        </button>
                    </div>
                    <div className="progress-body">
                        <div className="progress-stats">
                            <h3>{topic}</h3>
                            <div className="progress-bar-container">
                                <div className="progress-bar" style={{ width: `${(completedTopics.size / studyPlan.length) * 100}%` }}></div>
                            </div>
                            <p>{completedTopics.size} / {studyPlan.length} alt başlık tamamlandı (%{Math.round((completedTopics.size / studyPlan.length) * 100)})</p>
                        </div>
                        <div className="badges-section">
                            <h3>Başarı Rozetleri</h3>
                            <div className="badges-grid">
                                {allBadges.map(badge => (
                                    <div key={badge.id} className={`badge-card ${unlockedBadges.has(badge.id) ? 'unlocked' : ''}`} title={badge.description}>
                                        <div className="badge-icon">{badge.icon}</div>
                                        <div className="badge-info">
                                            <h4>{badge.name}</h4>
                                            <p>{badge.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
      )}

    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
