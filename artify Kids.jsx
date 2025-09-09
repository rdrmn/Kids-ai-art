import React, { useState } from 'react';
import { getFirestore, collection, addDoc, getDocs, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

// Firebase configuration and other global variables
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const __app_id = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Creative image transformation application
const App = () => {
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [transformedImage, setTransformedImage] = useState('');
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState('');
  const [creativityLevel, setCreativityLevel] = useState(50);
  const [isTransforming, setIsTransforming] = useState(false);


  React.useEffect(() => {
    // Authenticate user with the provided token
    const authenticateUser = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Firebase authentication failed:", e);
      }
    };

    authenticateUser();

    // Track user login status
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handles file upload event
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImageUrl(URL.createObjectURL(selectedFile));
      setTransformedImage('');
    }
  };

  // Initiates the image transformation process with the AI
  const transformImageWithAI = async () => {
    if (!file) {
      setError("Please upload an image.");
      return;
    }

    setIsTransforming(true);
    setError('');
    setTransformedImage('');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64ImageData = reader.result.split(',')[1];
        
        // Create a base prompt based on the creativity level
        let creativityPrompt = '';
        if (creativityLevel <= 20) {
            creativityPrompt = "Apply subtle, high-quality enhancements. Improve the colors and details while staying very true to the original drawing's style and content.";
        } else if (creativityLevel <= 80) {
            creativityPrompt = "Transform this image with a blend of creativity and realism, maintaining the core elements of the original drawing.";
        } else {
            creativityPrompt = "Completely reimagine this image in a highly creative and stylized way, with low resemblance to the original.";
        }

        // Combine the prompts with black area removal, selected theme, and user input
        let combinedPrompt = `Completely transform this image. Please remove any black or empty areas from the original image and fill them with new content.`;
        if (selectedTheme) {
            combinedPrompt += `Redraw the entire image in the style of '${selectedTheme}'. `;
        }
        
        combinedPrompt += creativityPrompt;
        
        if (prompt.trim()) {
            combinedPrompt += ` Additionally, follow this creative direction: ${prompt}`;
        }
        
        const payload = {
          contents: [{
            parts: [
              { text: combinedPrompt }, 
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64ImageData
                }
              }
            ]
          }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
          }
        };

        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;

        let response;
        for (let i = 0; i < 3; i++) {
          try {
            response = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            if (response.ok) break;
            if (response.status === 429) {
              await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, i)));
            } else {
              throw new Error(`API error: ${response.statusText}`);
            }
          } catch (e) {
            if (i === 2) throw e;
          }
        }

        const result = await response.json();
        const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

        if (base64Data) {
          setTransformedImage(`data:${file.type};base64,${base64Data}`);
        } else {
          setError('Image transformation failed. Please try a different prompt.');
        }
      };
    } catch (err) {
      console.error(err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsTransforming(false);
    }
  };

  // Define themes
  const themes = [
    { name: 'Cartoon Network' },
    { name: 'Disney' },
    { name: 'Brawl Stars' },
    { name: 'Warner Bros' },
    { name: 'Simpsons' },
    { name: 'Bluey' } // Added Bluey theme
  ];

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = transformedImage;
    link.download = 'donusturulmus_resim.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-rose-50 p-4 font-sans">
      <div className="w-full max-w-4xl bg-white p-8 rounded-3xl shadow-2xl border-t-8 border-rose-500">
        <h1 className="text-4xl font-black text-center text-rose-700 mb-2">Artify Kids</h1>
        <p className="text-center text-gray-500 mb-6 font-medium">Upload your child's drawings and transform them with AI magic!</p>
        
        {userId && (
          <div className="text-center text-sm text-gray-400 mb-4 font-mono">
            User ID: {userId}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="flex flex-col items-center p-6 bg-yellow-50 rounded-2xl border-4 border-dashed border-yellow-200">
            <h2 className="text-2xl font-semibold text-rose-600 mb-4">Upload an Image</h2>
            <div className="w-full max-w-sm h-72 border-2 border-yellow-400 border-dashed rounded-xl flex items-center justify-center overflow-hidden bg-white hover:bg-yellow-100 transition-colors cursor-pointer">
              {!imageUrl && (
                <label className="text-center text-gray-500 text-lg font-medium">
                  Click to Upload
                  <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                </label>
              )}
              {imageUrl && (
                <img src={imageUrl} alt="Uploaded" className="object-contain max-h-full max-w-full rounded-xl" />
              )}
            </div>
          </div>

          <div className="flex flex-col items-center p-6 bg-purple-50 rounded-2xl border-4 border-dashed border-purple-200">
            <h2 className="text-2xl font-semibold text-rose-600 mb-4">Transformed Image</h2>
            <div className="w-full max-w-sm h-72 border-2 border-purple-400 border-dashed rounded-xl flex items-center justify-center overflow-hidden bg-white">
              {isTransforming && (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-500"></div>
                  <p className="mt-4 text-purple-600 font-medium">Transforming...</p>
                </div>
              )}
              {transformedImage && (
                <img src={transformedImage} alt="Transformed" className="object-contain max-h-full max-w-full rounded-xl" />
              )}
              {!transformedImage && !isTransforming && (
                <p className="text-center text-gray-500 text-lg font-medium">Transformed image will appear here.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-rose-600 mb-4 text-center">Select a Theme:</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {themes.map(theme => (
              <button
                key={theme.name}
                onClick={() => setSelectedTheme(theme.name)}
                className={`py-3 px-6 rounded-full text-lg font-bold transition-all duration-300 flex items-center justify-center
                  ${selectedTheme === theme.name ? 'bg-indigo-500 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-indigo-400 hover:text-white'}`}
              >
                <span>{theme.name}</span>
              </button>
            ))}
             <button
                onClick={() => setSelectedTheme('')}
                className={`py-3 px-6 rounded-full text-lg font-bold transition-all duration-300 flex items-center justify-center
                  ${selectedTheme === '' ? 'bg-indigo-500 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-indigo-400 hover:text-white'}`}
              >
                None
              </button>
          </div>
        </div>
        
        <div className="mb-8">
            <label htmlFor="creativity-slider" className="block text-rose-600 font-semibold mb-3 text-center text-lg">
                Creativity Level: <span className="text-indigo-500 font-bold">{creativityLevel}%</span>
            </label>
            <input
                id="creativity-slider"
                type="range"
                min="0"
                max="100"
                value={creativityLevel}
                onChange={(e) => setCreativityLevel(e.target.value)}
                className="w-full h-3 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(90deg, #6366f1 ${creativityLevel}%, #e0e7ff ${creativityLevel}%)`
                }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2 font-medium">
                <span>Less Creative</span>
                <span>Balanced</span>
                <span>More Creative</span>
            </div>
        </div>

        <div className="mb-8">
          <label htmlFor="prompt" className="block text-rose-600 font-semibold mb-3 text-center text-lg">Additional Creative Command (Optional):</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows="3"
            placeholder="e.g., 'Add a magical dragon to the image' or 'Fill the background with colorful balloons'..."
            className="w-full p-4 border border-purple-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-300 transition-colors"
          ></textarea>
        </div>
        
        <button
          onClick={transformImageWithAI}
          disabled={isTransforming || !file}
          className={`w-full py-4 rounded-full text-xl font-bold transition-all duration-300 ${
            (isTransforming || !file) ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-teal-500 text-white hover:bg-teal-600 shadow-lg hover:shadow-xl transform hover:-translate-y-1'
          }`}
        >
          {isTransforming ? 'Transforming...' : 'Unleash Creativity'}
        </button>
        
        {transformedImage && (
            <div className="mt-6 flex flex-col items-center">
                <button
                    onClick={handleDownload}
                    className="w-full py-4 rounded-full text-xl font-bold transition-all duration-300 bg-green-500 text-white mb-4 hover:bg-green-600 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                    Download Image
                </button>
            </div>
        )}
        
        {error && (
          <div className="mt-6 p-4 bg-red-100 text-red-700 rounded-xl text-center font-medium">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
