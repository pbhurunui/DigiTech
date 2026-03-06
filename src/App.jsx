import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, onSnapshot, serverTimestamp } from 'firebase/firestore'; 

// --- Foundational Coding Pre-Test Questions ---
const initialQuestions = [
  {
    id: 1,
    question: "Which step is generally considered the first in the problem-solving process known as the computational thinking cycle?",
    options: ['Pattern recognition to find similarities in previous problems.', 'Abstraction by focusing only on the non-essential details.', 'Decomposing the problem into smaller, manageable parts.', 'Writing the complete code without any planning.'],
    correctAnswer: "Decomposing the problem into smaller, manageable parts.",
    topic: "Computational Thinking"
  },
  {
    id: 2,
    question: "In Python, which of the following is an invalid variable name?",
    options: ['user_name_1', 'totalValue', '2nd_number', '_temp_variable'],
    correctAnswer: "2nd_number",
    topic: "Python Fundamentals"
  },
  {
    id: 3,
    question: "Which pair of HTML tags is used to define the primary block-level structural division and fundamental text content of a webpage's body?",
    options: ['<footer> and <header>', '<div> and <p>', '<link> and <meta>', '<h1> and <a>'],
    correctAnswer: "<div> and <p>",
    topic: "HTML Structure"
  },
  {
    id: 4,
    question: "What is the correct Python syntax for checking if the variable 'score' is greater than or equal to 90?",
    options: ['if score >= 90', 'if score > 90 or =:', 'if score >!= 90:', 'if score >= 90:'],
    correctAnswer: "if score >= 90:",
    topic: "Python Conditionals"
  },
  {
    id: 5,
    question: "If a 'for' loop is set to iterate from 0 up to (but not including) 5, how many times will the code block inside the loop execute?",
    options: ['4', '5', '6', 'Depends on the loop\'s step value.'],
    correctAnswer: "5",
    topic: "Programming Logic"
  },
  {
    id: 6,
    question: "Which JavaScript method is used to retrieve an HTML element based on its unique 'id' attribute?",
    options: ['document.findId(\'elementId\')', 'document.getElementsByTagName(\'div\')', 'document.getElementById(\'elementId\')', 'document.getByClass(\'className\')'],
    correctAnswer: "document.getElementById('elementId')",
    topic: "JavaScript DOM"
  },
  {
    id: 7,
    question: "To make a website layout respond appropriately to different screen sizes, which CSS feature is primarily used?",
    options: ['The z-index property', 'CSS Variables', 'Media Queries', 'The float property'],
    correctAnswer: "Media Queries",
    topic: "CSS Responsive Design"
  },
  {
    id: 8,
    question: "In Python, what type of data structure is used to store multiple items in a single variable where the order is maintained and items can be changed after creation?",
    options: ['Tuple', 'Dictionary', 'String', 'List'],
    correctAnswer: "List",
    topic: "Python Data Structures"
  },
  {
    id: 9,
    question: "In a JavaScript function linked to a form submission button, what is the primary purpose of the 'event.preventDefault()' method?",
    options: ['To stop a loop from running indefinitely.', 'To clear all input variables used within the function.', 'To stop the default action of an element, such as a form submission refreshing the page.', 'To hide the button element from the user interface.'],
    correctAnswer: "To stop the default action of an element, such as a form submission refreshing the page.",
    topic: "JavaScript Events"
  },
  {
    id: 10,
    question: "According to HTML best practices for responsive web design, the viewport meta tag should include which two essential settings?",
    options: ['content=CSS and style=full', 'user-scalable=false and height=100%', 'max-zoom=2 and min-zoom=0.5', 'width=device-width and initial-scale=1.0'],
    correctAnswer: "width=device-width and initial-scale=1.0",
    topic: "HTML Responsive Design"
  }
];

// --- SECURITY CONFIGURATION ---
// IMPORTANT: Replace the placeholder UUID with your actual Firebase User ID 
// (which is displayed as 'SESSION HASH / STUDENT ID' on the quiz screen) 
// to enable access to the secured Admin Dashboard.
const ADMIN_UIDS = [
    "replace-with-your-admin-user-id-to-enable-dashboard-access", 
    // Add more admin UIDs here if needed
];

// --- GEMINI API Configuration ---
const apiKey = "";
const apiUrlText = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
const apiUrlTTS = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

// Utility function for exponential backoff (retry logic for API calls)
const exponentialBackoff = async (fn, maxRetries = 5, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      // Do not log retries as errors in the console
    }
  }
};

// Helper to convert base64 audio data to ArrayBuffer
const base64ToArrayBuffer = (base64) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

// Helper to convert PCM 16-bit audio data to a WAV Blob
const pcmToWav = (pcm16, sampleRate = 24000) => {
    const buffer = new ArrayBuffer(44 + pcm16.byteLength);
    const view = new DataView(buffer);

    // RIFF identifier 'RIFF'
    view.setUint32(0, 0x46464952, false);
    // file length
    view.setUint32(4, 36 + pcm16.byteLength, true);
    // RIFF type 'WAVE'
    view.setUint32(8, 0x45564157, false);
    // format chunk identifier 'fmt '
    view.setUint32(12, 0x20746d66, false);
    // format chunk length 
    view.setUint32(16, 16, true);
    // sample format (1 = PCM)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, 1, true); 
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2, true); 
    // block align (channels * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier 'data'
    view.setUint32(36, 0x61746164, false);
    // data chunk length
    view.setUint32(40, pcm16.byteLength, true);

    // Write PCM data
    const pcmView = new Int16Array(buffer, 44);
    pcmView.set(pcm16);

    return new Blob([buffer], { type: 'audio/wav' });
};


// Hook to check if the current user is an admin
const useAdminCheck = (userId, isAuthReady) => {
    return useMemo(() => {
        if (!isAuthReady || !userId) return false;
        return ADMIN_UIDS.includes(userId);
    }, [userId, isAuthReady]);
};

const App = () => {
  // --- State for Firebase/Auth ---
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [firebaseError, setFirebaseError] = useState(null);
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  
  // --- Security Check ---
  const isAdmin = useAdminCheck(userId, isAuthReady);

  // --- State for Application Flow ---
  // Possible values: 'enrollment', 'quiz', 'results', 'dashboard'
  const [currentPage, setCurrentPage] = useState('enrollment');
  const [isEnrolled, setIsEnrolled] = useState(false);

  // --- State for Student/Quiz Data ---
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState(Array(initialQuestions.length).fill(null));
  const [timer, setTimer] = useState(0);
  
  // --- State for Admin Access ---
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [quizResults, setQuizResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  // --- State for Gemini LLM Features ---
  const [feedbackReport, setFeedbackReport] = useState('');
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState(null);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);

  // Mandatory Firebase Initialization and Authentication
  useEffect(() => {
    const initFirebase = async () => {
      try {
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;

        if (!firebaseConfig) {
            setFirebaseError("Firebase configuration is missing.");
            return;
        }

        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const firebaseAuth = getAuth(app);

        setDb(firestore);
        setAuth(firebaseAuth);

        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        // Sign in with custom token or anonymously
        if (token) {
          await exponentialBackoff(() => signInWithCustomToken(firebaseAuth, token));
        } else {
          await exponentialBackoff(() => signInAnonymously(firebaseAuth));
        }

        // Set up auth state change listener
        firebaseAuth.onAuthStateChanged((user) => {
          if (user) {
            setUserId(user.uid);
          } else {
            setUserId(crypto.randomUUID()); 
          }
          setIsAuthReady(true);
        });

      } catch (error) {
        setFirebaseError("Failed to initialize authentication.");
        setIsAuthReady(true);
      }
    };

    initFirebase();
  }, []); // Run once on mount

  // Timer Effect
  useEffect(() => {
      let timerInterval = null;
      if (currentPage === 'quiz') {
          timerInterval = setInterval(() => {
              setTimer(prevTime => prevTime + 1);
          }, 1000);
      } else {
          clearInterval(timerInterval);
      }
      return () => clearInterval(timerInterval);
  }, [currentPage]);

  // Firebase results listener for Dashboard (Only runs if user is an admin)
  useEffect(() => {
      if (currentPage === 'dashboard' && db && isAdmin) {
          setResultsLoading(true);
          // Public collection path for quiz results
          const resultsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'quiz_results');
          
          const resultsQuery = query(resultsCollectionRef); 

          const unsubscribe = onSnapshot(resultsQuery, (snapshot) => {
              const resultsList = snapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
              }));
              // Sort by timestamp client-side (most recent first)
              resultsList.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
              setQuizResults(resultsList);
              setResultsLoading(false);
          }, (error) => {
              console.error("Error fetching quiz results:", error);
              setResultsLoading(false);
          });

          return () => unsubscribe();
      }
  }, [currentPage, db, appId, isAdmin]);

  // Function to calculate the score
  const calculateScore = useCallback(() => {
    return userAnswers.reduce((score, answer, index) => {
      if (answer === initialQuestions[index].correctAnswer) {
        return score + 1;
      }
      return score;
    }, 0);
  }, [userAnswers]);

  // LLM Feature 1: Generate Personalized Feedback Report
  const generatePersonalizedFeedback = async (quizScore, totalQuestions, detailedAnswers) => {
      if (isGeneratingFeedback) return;

      setIsGeneratingFeedback(true);
      setFeedbackReport('');
      setTtsAudioUrl(null); // Reset TTS audio

      // Calculate performance by topic
      const topicPerformance = detailedAnswers.reduce((acc, answer) => {
          const topic = answer.topic;
          if (!acc[topic]) {
              acc[topic] = { total: 0, correct: 0 };
          }
          acc[topic].total += 1;
          if (answer.isCorrect) {
              acc[topic].correct += 1;
          }
          return acc;
      }, {});

      // Convert performance to an easy-to-read list for the prompt
      const performanceList = Object.entries(topicPerformance)
          .map(([topic, data]) => `${topic}: ${data.correct}/${data.total} correct.`)
          .join('\n');

      const systemPrompt = "You are an expert, encouraging coding mentor and educational advisor. Analyze the student's pre-test results provided below. Generate a concise, three-paragraph personalized report: 1. Acknowledgment and overall score summary. 2. Identification of 2-3 weakest topics with specific, actionable study recommendations for foundational concepts (e.g., recommend reviewing conditional logic, CSS layout models, or specific data structure types). 3. A concluding encouragement and next steps.";

      const userQuery = `Student Name: ${studentName}. Quiz Score: ${quizScore}/${totalQuestions}. Performance by Topic:\n${performanceList}`;

      const payload = {
          contents: [{ parts: [{ text: userQuery }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
      };

      try {
          const response = await exponentialBackoff(() => 
              fetch(apiUrlText, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
              })
          );
          const result = await response.json();
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "Error: Could not generate personalized feedback.";
          setFeedbackReport(text);
      } catch (error) {
          console.error("Gemini API Error for Text Generation:", error);
          setFeedbackReport("Error: Failed to connect to the mentoring system. Please check your connection.");
      } finally {
          setIsGeneratingFeedback(false);
      }
  };
  
  // LLM Feature 2: Generate TTS Audio
  const generateTTS = async (text) => {
      if (isPlayingTTS || !text) return;

      setIsPlayingTTS(true);
      
      const payload = {
          contents: [{ parts: [{ text: text }] }],
          generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                  voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: "Kore" } // Firm and clear voice
                  }
              }
          },
          model: "gemini-2.5-flash-preview-tts"
      };

      try {
          const response = await exponentialBackoff(() =>
              fetch(apiUrlTTS, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
              })
          );
          const result = await response.json();
          const part = result?.candidates?.[0]?.content?.parts?.[0];
          const audioData = part?.inlineData?.data;

          if (audioData) {
              // API returns signed PCM16 audio data.
              const pcmData = base64ToArrayBuffer(audioData);
              const pcm16 = new Int16Array(pcmData);
              const wavBlob = pcmToWav(pcm16, 24000); // 24000 is the default sample rate
              const audioUrl = URL.createObjectURL(wavBlob);
              setTtsAudioUrl(audioUrl);
              
              const audio = new Audio(audioUrl);
              audio.play();
              audio.onended = () => setIsPlayingTTS(false);
              
          } else {
              console.error("TTS generation failed: No audio data received.");
              setIsPlayingTTS(false);
          }
      } catch (error) {
          console.error("Gemini API Error for TTS Generation:", error);
          setIsPlayingTTS(false);
      }
  };


  // Handler for enrollment submission
  const handleEnrollment = (name, email) => {
      setStudentName(name);
      setStudentEmail(email);
      setIsEnrolled(true);
      setCurrentPage('quiz');
  };

  // Handler for submitting the quiz
  const handleSubmit = async () => {
    const finalScore = calculateScore();
    const finalTime = timer;
    
    // Detailed answers for review
    const detailedAnswers = initialQuestions.map((q, index) => ({
        questionId: q.id,
        topic: q.topic,
        question: q.question,
        selected: userAnswers[index],
        correct: q.correctAnswer,
        isCorrect: userAnswers[index] === q.correctAnswer,
    }));
    
    if (db && userId) {
        try {
            const resultsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'quiz_results');
            await exponentialBackoff(() => addDoc(resultsCollectionRef, {
                userId: userId,
                name: studentName,
                email: studentEmail,
                score: finalScore,
                totalQuestions: initialQuestions.length,
                timeSeconds: finalTime,
                timestamp: serverTimestamp(),
                answers: detailedAnswers,
            }));
        } catch (error) {
            console.error("Error saving quiz results to Firestore:", error);
            setFirebaseError("Failed to save results.");
        }
    }
    
    // Transition to results screen
    setCurrentPage('results');
  };

  // Handler for selecting an answer option
  const handleAnswerSelect = (selectedOption) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = selectedOption;
    setUserAnswers(newAnswers);
  };

  // Handler for navigation
  const handleNext = () => {
    if (currentQuestionIndex < initialQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleReset = () => {
    setStudentName('');
    setStudentEmail('');
    setIsEnrolled(false);
    setCurrentQuestionIndex(0);
    setUserAnswers(Array(initialQuestions.length).fill(null));
    setTimer(0);
    setFeedbackReport(''); // Reset LLM state
    setTtsAudioUrl(null); // Reset LLM state
    setIsGeneratingFeedback(false); // Reset LLM state
    setIsPlayingTTS(false); // Reset LLM state
    setCurrentPage('enrollment');
  };

  // Utility to format seconds into MM:SS
  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}`;
  };
  
  // --- UI Components ---

  const EnrollmentScreen = ({ onEnroll, onAdminAccess, isAdmin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

    const handleStart = (e) => {
        e.preventDefault();
        setError('');

        if (!name.trim() || !email.trim()) {
            setError('ACCESS DENIED: Name and Email fields are required.');
            return;
        }

        if (!validateEmail(email)) {
            setError('ACCESS DENIED: Invalid email format detected.');
            return;
        }

        onEnroll(name.trim(), email.trim());
    };
    
    // Message box for non-admin users attempting access
    const [showAdminDenied, setShowAdminDenied] = useState(false);
    
    const handleAdminClick = () => {
        if (isAdmin) {
            onAdminAccess();
        } else {
            setShowAdminDenied(true);
            setTimeout(() => setShowAdminDenied(false), 3000);
        }
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 font-mono">
            <div className="w-full max-w-xl">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-lime-400 border-b-2 border-lime-400/50 pb-2">
                        &gt; CODE CREATORS PRE-TEST // ACCESS POINT
                    </h1>
                    <p className="text-md mt-2 text-gray-300">[[ STUDENT ENROLLMENT PROTOCOL ]]</p>
                </header>
                <form onSubmit={handleStart} className="bg-gray-900 p-8 rounded-none border-4 border-lime-400 shadow-2xl shadow-lime-400/30">
                    <h2 className="text-2xl font-bold text-gray-100 mb-6 border-b border-gray-700 pb-2">
                        // SECURE LOGIN INITIATION
                    </h2>

                    {/* Name Input */}
                    <div className="mb-6">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-2">
                            STUDENT NAME:
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 bg-gray-800 border-2 border-gray-700 text-lime-400 focus:border-lime-400 focus:ring-lime-400/50 outline-none rounded-none placeholder-gray-500"
                            placeholder="Enter full name..."
                            required
                        />
                    </div>

                    {/* Email Input */}
                    <div className="mb-8">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
                            EMAIL ADDRESS (CONTACT):
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 bg-gray-800 border-2 border-gray-700 text-lime-400 focus:border-lime-400 focus:ring-lime-400/50 outline-none rounded-none placeholder-gray-500"
                            placeholder="Enter valid email..."
                            required
                        />
                    </div>
                    
                    {/* Error Message */}
                    {error && (
                        <p className="text-red-500 bg-red-900/30 border border-red-500 p-3 mb-6 rounded-none text-center text-sm font-bold animate-pulse">
                            {error}
                        </p>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full py-4 font-extrabold text-lg rounded-none transition-colors border-2 border-green-600
                                 bg-green-600 text-gray-900 hover:bg-green-500 shadow-lg shadow-green-400/50 disabled:opacity-50"
                        disabled={!name || !email}
                    >
                        [[ INITIATE PRE-TEST // START ACCESS ]]
                    </button>
                    
                    {/* Admin Access Button */}
                    <button
                        type="button"
                        onClick={handleAdminClick}
                        className={`mt-4 w-full py-2 text-xs font-extrabold rounded-none transition-colors border border-yellow-500 shadow-md shadow-yellow-500/50 
                            ${isAdmin ? 'bg-yellow-700 hover:bg-yellow-600 text-gray-900' : 'bg-gray-800 hover:bg-gray-700 text-yellow-500'}`}
                    >
                        [[ ADMIN: ACCESS DASHBOARD {isAdmin ? ' - ENABLED' : ' - UNAUTHORIZED'} ]]
                    </button>
                    
                    {/* Admin Access Denied Message */}
                    {showAdminDenied && (
                        <p className="text-sm text-red-500 bg-red-900/30 border border-red-500 p-2 mt-4 rounded-none text-center">
                            ACCESS DENIED. USER ID MUST BE REGISTERED AS ADMIN.
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
  };
  
  const AccessPanelHeader = ({ currentQuestionIndex, totalQuestions, timer, userId, firebaseError, toggleAdminPanel, studentName }) => (
    <div className="mb-6 p-4 bg-gray-900 border-t-2 border-b-2 border-lime-400 shadow-2xl shadow-lime-400/20 sticky top-0 z-10">
        <div className="flex justify-between items-start flex-wrap gap-2 text-sm md:text-md">
            {/* Left Column: User Status */}
            <div className="flex flex-col">
                <span className="text-gray-500">[[ SESSION HASH / STUDENT ID ]]</span>
                {/* Displaying User ID is crucial for the admin to copy and add themselves to the ADMIN_UDS list */}
                <span className="text-lime-400 font-bold break-all">{userId || 'LOADING...'}</span>
            </div>

            {/* Center Column: Student Info */}
            <div className="flex flex-col items-center">
                <span className="text-gray-500">[[ ENROLLED USER ]]</span>
                <span className={`font-extrabold text-gray-300`}>
                    {studentName || 'N/A'}
                </span>
            </div>
            
            {/* Right Column: Time & Progress */}
            <div className="flex flex-col items-end">
                <span className="text-gray-500">[[ TIME/PROGRESS ]]</span>
                <span className="text-lime-400 font-bold">
                    T: {formatTime(timer)} | Q: {currentQuestionIndex + 1}/{totalQuestions}
                </span>
            </div>
        </div>
        
        {/* Admin Access Button (Solution Log) */}
        <button
            onClick={toggleAdminPanel}
            className="mt-4 w-full py-2 text-xs font-extrabold rounded-none bg-yellow-700 text-gray-900 hover:bg-yellow-600 transition-colors border border-yellow-500 shadow-md shadow-yellow-500/50"
        >
            [[ ADMIN ACCESS: TOGGLE SOLUTION LOG ]]
        </button>

        {firebaseError && (
             <p className="text-xs text-yellow-500 mt-2 text-center p-1 bg-gray-800 rounded-none border border-yellow-500/50">
                 ⚠️ WARNING: DATABASE CONNECTIVITY FLAG {firebaseError}
             </p>
         )}
    </div>
  );
  
  const AdminAccessPanel = ({ questions, onClose }) => {
      return (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-95 backdrop-blur-sm p-6 z-20 overflow-y-auto font-mono">
              <div className="bg-gray-950 p-6 md:p-8 rounded-none border-4 border-red-500 shadow-2xl shadow-red-500/50 max-w-3xl mx-auto">
                  <h2 className="text-3xl font-extrabold text-red-500 mb-4 text-center border-b border-red-500/50 pb-2">
                      [[ EMERGENCY ACCESS: SOLUTION OVERRIDE ]]
                  </h2>
                  <p className="text-sm text-gray-400 mb-6 text-center">
                      DISPLAYING CORE KNOWLEDGE BASE. DO NOT SHARE THIS DATA.
                  </p>
                  
                  <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                      {questions.map((q, index) => (
                          <div key={q.id} className="p-4 bg-gray-800 border-2 border-red-500/70 shadow-lg shadow-red-500/20">
                              <p className="text-sm text-gray-500 uppercase">{q.topic}</p>
                              <p className="font-semibold text-gray-200 mt-1">
                                  [{index + 1}] QUESTION: {q.question}
                              </p>
                              <p className="text-sm mt-2">
                                  <span className="text-red-500 font-bold">[[ CORRECT RESPONSE ]]</span>: 
                                  <span className="text-lime-400 ml-2">{q.correctAnswer}</span>
                              </p>
                          </div>
                      ))}
                  </div>

                  <button
                      onClick={onClose}
                      className="mt-8 w-full py-3 px-6 bg-red-600 text-gray-900 font-extrabold rounded-none shadow-lg shadow-red-500/50 hover:bg-red-500 transition-colors border border-red-400"
                  >
                      [[ CLOSE PORT: EXIT ADMIN MODE ]]
                  </button>
              </div>
          </div>
      );
  };

  const DashboardScreen = ({ results, isLoading, onBack, isAdmin }) => {
      // Security Check: If not admin, show access denied message
      if (!isAdmin) {
          return (
              <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 font-mono">
                  <div className="bg-gray-950 p-10 rounded-none border-4 border-red-500 shadow-2xl shadow-red-500/50 max-w-xl mx-auto text-center">
                      <h2 className="text-3xl font-extrabold text-red-500 mb-4">
                          // UNAUTHORIZED ACCESS ATTEMPT //
                      </h2>
                      <p className="text-lg text-gray-300 mb-6">
                          ERROR 403: You do not have the required security credentials to view this panel.
                      </p>
                      <p className="text-sm text-gray-500 mb-8">
                          To gain access, register your `SESSION HASH / STUDENT ID` in the `ADMIN_UDS` list within the code.
                      </p>
                      <button
                          onClick={onBack}
                          className="py-3 px-6 bg-red-600 text-gray-900 font-extrabold rounded-none shadow-lg shadow-red-500/50 hover:bg-red-500 transition-colors border border-red-400"
                      >
                          [[ RETURN TO PUBLIC INTERFACE ]]
                      </button>
                  </div>
              </div>
          );
      }
      
      const [searchTerm, setSearchTerm] = useState('');
      const filteredResults = results.filter(r => 
          r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.userId.includes(searchTerm)
      );

      return (
          <div className="min-h-screen bg-gray-900 p-4 md:p-8 font-mono">
              <div className="w-full max-w-5xl mx-auto">
                  <header className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-red-500 border-b-2 border-red-500/50 pb-2">
                      &gt; ADMINISTRATIVE COMMAND CENTER
                    </h1>
                    <p className="text-md mt-2 text-gray-300">[[ LIVE QUIZ RESULT LOGS ]]</p>
                  </header>

                  <div className="flex justify-between items-center mb-6">
                      <button
                          onClick={onBack}
                          className="py-2 px-4 bg-gray-700 text-lime-400 font-extrabold rounded-none border border-gray-600 hover:bg-gray-600"
                      >
                          &lt; RETURN TO ENROLLMENT
                      </button>
                      <div className="text-gray-400">TOTAL RECORDS: <span className="text-lime-400 font-bold">{results.length}</span></div>
                  </div>

                  <div className="mb-6">
                      <input
                          type="text"
                          placeholder="Search by Name, Email, or ID..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full p-3 bg-gray-800 border-2 border-red-500 text-lime-400 focus:border-lime-400 outline-none rounded-none placeholder-gray-500"
                      />
                  </div>
                  
                  {isLoading ? (
                      <div className="text-center p-8 bg-gray-800 border border-red-500 text-red-500">
                          <div className="animate-spin inline-block w-6 h-6 border-4 rounded-full border-t-red-500 border-r-red-500 border-b-transparent" role="status"></div>
                          <p className="mt-4">FETCHING LIVE DATA STREAM...</p>
                      </div>
                  ) : filteredResults.length === 0 ? (
                      <div className="text-center p-8 bg-gray-800 border border-red-500 text-red-500 font-bold">
                          NO RECORDS FOUND. {results.length === 0 ? "START NEW QUIZ TO GENERATE DATA." : "ADJUST SEARCH FILTERS."}
                      </div>
                  ) : (
                      <div className="overflow-x-auto bg-gray-900 border-2 border-red-500 shadow-2xl shadow-red-500/20">
                          <table className="min-w-full text-sm text-gray-300">
                              <thead className="bg-gray-800 text-red-500 uppercase tracking-wider border-b border-red-500">
                                  <tr>
                                      <th className="py-3 px-4 text-left">TIME</th>
                                      <th className="py-3 px-4 text-left">NAME</th>
                                      <th className="py-3 px-4 text-left">EMAIL</th>
                                      <th className="py-3 px-4 text-center">SCORE</th>
                                      <th className="py-3 px-4 text-center">TIME (MM:SS)</th>
                                      <th className="py-3 px-4 text-left">STATUS</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {filteredResults.map((r) => {
                                      const passThreshold = Math.ceil(initialQuestions.length * 0.7);
                                      const isPassed = r.score >= passThreshold;
                                      const scoreColor = isPassed ? 'text-lime-400' : 'text-yellow-400';
                                      const statusText = isPassed ? 'PASS' : 'REVIEW';
                                      const rowBg = isPassed ? 'hover:bg-gray-800/50' : 'hover:bg-gray-800';

                                      return (
                                          <tr key={r.id} className={`border-b border-gray-800 transition-colors ${rowBg}`}>
                                              <td className="py-3 px-4 text-gray-500">
                                                  {new Date(r.timestamp?.seconds * 1000).toLocaleTimeString()}
                                              </td>
                                              <td className="py-3 px-4 text-gray-200 font-semibold">{r.name}</td>
                                              <td className="py-3 px-4 text-gray-400">{r.email}</td>
                                              <td className={`py-3 px-4 text-center font-extrabold ${scoreColor}`}>
                                                  {r.score}/{r.totalQuestions}
                                              </td>
                                              <td className="py-3 px-4 text-center text-gray-400">
                                                  {formatTime(r.timeSeconds)}
                                              </td>
                                              <td className={`py-3 px-4 font-bold ${isPassed ? 'text-lime-400' : 'text-red-500'}`}>
                                                  {statusText}
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  )}
              </div>
          </div>
      );
  };


  const QuestionCard = ({ questionData, index, selectedAnswer, onSelect }) => {
    // ... QuestionCard implementation remains the same
    return (
      <div className="bg-gray-900 p-6 md:p-8 rounded-none border border-lime-400 shadow-xl shadow-lime-400/30 transition-all duration-300">
        <div className="text-sm font-medium text-lime-400 mb-1 uppercase tracking-widest">{questionData.topic}</div>
        <div className="text-xl font-semibold text-gray-300 mb-6">
          <span className="text-lime-400">QUERY:</span> QUESTION {index + 1} OF {initialQuestions.length}
        </div>
        <h2 className="text-2xl font-bold text-gray-100 mb-8 leading-relaxed">
          &gt; {questionData.question}
        </h2>
        <div className="space-y-4">
          {questionData.options.map((option) => (
            <button
              key={option}
              onClick={() => onSelect(option)}
              className={`
                w-full text-left p-4 rounded-none border-2 font-mono transition-all duration-100
                shadow-md
                ${selectedAnswer === option
                  ? 'bg-lime-600 border-lime-400 text-gray-900 font-extrabold shadow-lime-400/50'
                  : 'bg-gray-800 border-gray-700 text-lime-400 hover:bg-gray-700 hover:border-lime-400'
                }
              `}
            >
              &gt; {option}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const ResultsScreen = ({ score, total, userAnswers, questions, studentName, studentEmail, onReset }) => {
    const percentage = ((score / total) * 100).toFixed(0);
    const passThreshold = Math.ceil(total * 0.7); // 70% threshold
    const hasPassed = score >= passThreshold;
    const scoreColor = hasPassed ? 'text-lime-400' : 'text-red-500';
    const scoreText = hasPassed ? 'ACCESS GRANTED' : 'ACCESS DENIED';
    const resultBorder = hasPassed ? 'border-lime-400 shadow-lime-400/50' : 'border-red-500 shadow-red-500/50';

    // Detailed answers for the LLM function
    const detailedAnswers = questions.map((q, index) => ({
        questionId: q.id,
        topic: q.topic,
        question: q.question,
        selected: userAnswers[index],
        correct: q.correctAnswer,
        isCorrect: userAnswers[index] === q.correctAnswer,
    }));
    
    // Handler for LLM Text Generation
    const handleGenerateFeedback = () => {
        generatePersonalizedFeedback(score, total, detailedAnswers);
    };
    
    // Handler for TTS Generation
    const handleGenerateTTS = () => {
        if (ttsAudioUrl) {
            // If already generated, just play it
            const audio = new Audio(ttsAudioUrl);
            audio.play();
            audio.onended = () => setIsPlayingTTS(false);
        } else {
            // Generate and play
            generateTTS(feedbackReport);
        }
    };


    return (
      <div className="bg-gray-900 p-6 md:p-8 rounded-none border-4 border-lime-400 shadow-2xl shadow-lime-400/30 font-mono">
        <h2 className="text-3xl font-extrabold text-lime-400 mb-4 text-center border-b border-lime-400/50 pb-2">
            [[ SYSTEM DIAGNOSTICS: PRE-TEST COMPLETE ]]
        </h2>
        
        <div className="text-center mb-6">
             <p className="text-lg font-medium text-gray-400 mb-1">STUDENT: <span className="text-gray-300">{studentName}</span></p>
             <p className="text-sm font-medium text-gray-500">EMAIL: <span className="text-gray-400">{studentEmail}</span></p>
        </div>


        <div className={`p-6 ${resultBorder} rounded-none mb-8 text-center border-2 shadow-inner`}>
            <p className="text-lg font-medium text-gray-400 mb-2">RESULT STATUS</p>
            <p className={`text-5xl font-black ${scoreColor} animate-pulse`}>
                {scoreText}
            </p>
            <p className={`text-4xl font-black ${scoreColor} mt-2`}>
                {score} / {total}
            </p>
            <p className="text-xl text-gray-300 mt-2">({percentage}% ACCURACY)</p>
            <p className="text-md text-gray-500 mt-4">PROCESS TIME: {formatTime(timer)}</p>
        </div>
        
        {/* --- GEMINI API INTEGRATION BLOCK --- */}
        <div className="p-4 bg-gray-950 border border-yellow-500 rounded-none mb-6">
            <h3 className="text-xl font-bold text-yellow-500 mb-3 border-b border-yellow-500/50 pb-2">
                [[ POST-MORTEM ANALYSIS: AI MENTOR ]]
            </h3>
            
            <button
                onClick={handleGenerateFeedback}
                disabled={isGeneratingFeedback}
                className="w-full py-3 px-4 mb-3 font-extrabold rounded-none transition-colors border-2 border-yellow-500
                         bg-yellow-700 text-gray-900 hover:bg-yellow-600 shadow-lg shadow-yellow-500/50 disabled:opacity-50 flex items-center justify-center"
            >
                {isGeneratingFeedback ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        GENERATING REPORT...
                    </>
                ) : (
                    <>✨ GENERATE PERSONALIZED STUDY PLAN & FEEDBACK</>
                )}
            </button>
            
            {feedbackReport && (
                <>
                    <div className="bg-gray-800 p-3 rounded-none border border-gray-700 whitespace-pre-wrap text-gray-300 text-sm mb-3">
                        {feedbackReport}
                    </div>
                    
                    <button
                        onClick={handleGenerateTTS}
                        disabled={isPlayingTTS}
                        className="w-full py-2 px-4 font-extrabold rounded-none transition-colors border-2 border-green-600
                                 bg-green-600 text-gray-900 hover:bg-green-500 shadow-lg shadow-green-400/50 disabled:opacity-50 flex items-center justify-center"
                    >
                         {isPlayingTTS ? (
                            <>
                                <svg className="animate-pulse -ml-1 mr-3 h-5 w-5 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-2 5a1 1 0 00-2 0 1 1 0 002 0zm4-5a1 1 0 11-2 0 1 1 0 012 0zm-2 5a1 1 0 00-2 0 1 1 0 002 0z" clipRule="evenodd"></path>
                                </svg>
                                SPEAKING...
                            </>
                        ) : (
                            <>🔊 READ FEEDBACK ALOUD</>
                        )}
                    </button>
                </>
            )}
        </div>
        {/* --- END GEMINI BLOCK --- */}


        <h3 className="text-xl font-bold text-lime-400 mb-4 border-b border-lime-400/50 pb-2">[[ LOG REVIEW ]]</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thumb-lime-400 scrollbar-track-gray-800">
            {questions.map((q, index) => {
                const isCorrect = userAnswers[index] === q.correctAnswer;
                const userChoice = userAnswers[index];
                const reviewText = isCorrect ? 'PASS' : 'FAIL';
                const reviewClass = isCorrect ? 'text-lime-400' : 'text-red-500';

                return (
                    <div key={q.id} className="p-3 bg-gray-800 border border-gray-700">
                        <p className="font-semibold text-gray-300 mb-1">
                            [{index + 1}] &gt; {q.question}
                        </p>
                        <p className="text-sm ml-4">
                            <span className="text-gray-500">USER INPUT: </span>
                            <span className={`${reviewClass}`}>{userChoice || "[[NO INPUT]]"}</span>
                        </p>
                        <p className="text-sm ml-4">
                            <span className="text-gray-500">CORRECT: </span>
                            <span className="text-lime-400">{q.correctAnswer}</span>
                        </p>
                        <p className={`text-sm font-bold ml-4 ${reviewClass}`}>
                            STATUS: {reviewText}
                        </p>
                    </div>
                );
            })}
        </div>
        <button
          onClick={onReset}
          className="mt-8 w-full py-3 px-6 bg-red-600 text-gray-900 font-extrabold rounded-none shadow-lg shadow-red-500/50 hover:bg-red-500 transition-colors border border-red-400"
        >
          [[ RE-INITIALIZE TEST PROTOCOL / NEW STUDENT ]]
        </button>
      </div>
    );
  };


  if (!isAuthReady) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 font-mono">
            <div className="text-center p-8 bg-gray-800 border border-lime-400 text-lime-400">
                <div className="animate-spin inline-block w-8 h-8 border-4 rounded-full border-t-lime-400 border-r-lime-400 border-b-transparent" role="status"></div>
                <p className="mt-4">INITIALIZING SYSTEM: PINGING FIREBASE AUTH...</p>
            </div>
        </div>
    );
  }
  
  // Conditional rendering based on currentPage
  if (currentPage === 'enrollment') {
    return (
        <EnrollmentScreen 
            onEnroll={handleEnrollment} 
            onAdminAccess={() => setCurrentPage('dashboard')}
            isAdmin={isAdmin}
        />
    );
  }

  if (currentPage === 'dashboard') {
    return (
        <DashboardScreen 
            results={quizResults} 
            isLoading={resultsLoading} 
            onBack={() => setCurrentPage('enrollment')}
            isAdmin={isAdmin}
        />
    );
  }

  // Quiz and Results View
  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8 flex items-center justify-center font-mono relative">
        
      {/* Admin Panel Overlay (Solution Log) */}
      {showAdminPanel && (
          <AdminAccessPanel 
              questions={initialQuestions} 
              onClose={() => setShowAdminPanel(false)} 
          />
      )}

      <div className="w-full max-w-3xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-lime-400 border-b-2 border-lime-400/50 pb-2">
            &gt; CODE CREATORS PRE-TEST // V1.0.1
          </h1>
          <p className="text-md mt-2 text-gray-300">[[ CORE KNOWLEDGE ACCESS PROTOCOL ]]</p>
        </header>

        {currentPage === 'results' ? (
          <ResultsScreen
            score={calculateScore()}
            total={initialQuestions.length}
            userAnswers={userAnswers}
            questions={initialQuestions}
            studentName={studentName}
            studentEmail={studentEmail}
            onReset={handleReset}
          />
        ) : (
          <>
            {/* The Quiz Interface (when currentPage === 'quiz') */}
            <AccessPanelHeader
                currentQuestionIndex={currentQuestionIndex}
                totalQuestions={initialQuestions.length}
                timer={timer}
                userId={userId}
                firebaseError={firebaseError}
                toggleAdminPanel={() => setShowAdminPanel(true)}
                studentName={studentName}
            />

            <QuestionCard
              questionData={initialQuestions[currentQuestionIndex]}
              index={currentQuestionIndex}
              selectedAnswer={userAnswers[currentQuestionIndex]}
              onSelect={handleAnswerSelect}
            />

            {/* Navigation and Submission Controls */}
            <div className="mt-6 flex justify-between space-x-4 p-4 bg-gray-900 rounded-none border-b-2 border-lime-400/50 shadow-lg shadow-lime-400/20">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="flex-1 py-3 px-4 font-extrabold rounded-none transition-colors border-2 border-gray-700
                           disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed
                           bg-gray-700 text-lime-400 hover:bg-gray-600 hover:border-lime-400"
              >
                &lt; PREV
              </button>

              {currentQuestionIndex < initialQuestions.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={!userAnswers[currentQuestionIndex]}
                  className="flex-1 py-3 px-4 font-extrabold rounded-none transition-colors border-2
                             disabled:bg-gray-400 disabled:opacity-70 disabled:cursor-not-allowed
                             bg-lime-400 text-gray-900 hover:bg-lime-500 shadow-lg shadow-lime-400/50"
                >
                  NEXT &gt;
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={userAnswers.some(answer => answer === null)}
                  className="flex-1 py-3 px-4 font-extrabold rounded-none transition-colors border-2 border-green-600
                             disabled:bg-gray-400 disabled:opacity-70 disabled:cursor-not-allowed
                             bg-green-600 text-gray-900 hover:bg-green-500 shadow-lg shadow-green-400/50"
                >
                  // EXECUTE SUBMIT //
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
