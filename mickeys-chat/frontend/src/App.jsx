import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import io from 'socket.io-client';

// =====================================================================
// CONTEXTS & STATE PROVIDERS
// =====================================================================

const AuthContext = createContext(null);
const SocketContext = createContext(null);
const ThemeContext = createContext(null);

const API_URL = `${window.location.protocol}//${window.location.hostname}:8000/api`;
const SOCKET_URL = `${window.location.protocol}//${window.location.hostname}:8000`;

// SVG Icons helper component to avoid external resource race conditions
const Icon = ({ name, size = 20, className = '' }) => {
  const icons = {
    message: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    users: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    chart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    send: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    smile: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
    paperclip: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
    microphone: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
    video: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
    phone: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    sun: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    moon: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    reply: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>,
    forward: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>,
    logout: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    bell: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    lock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    unlock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>,
    doubleCheck: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M17 6L8.5 14.5L5 11M22 6L13.5 14.5M13.5 14.5L12 13" />
      </svg>
    ),
    backup: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    download: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  };
  return icons[name] || <span className="fallback-icon">?</span>;
};

// --- Theme Provider ---
const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const root = window.document.body;
    root.classList.remove('theme-dark', 'theme-light');
    root.classList.add(`theme-${theme}`);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// --- Auth Provider ---
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchProfile();
    } else {
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        setToken('');
      }
    } catch (e) {
      console.error("Auth Profile Fetch Failed:", e);
      setToken('');
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Registration failed");
    }
    return login(username, password);
  };

  const login = async (usernameOrEmail, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username_or_email: usernameOrEmail, password })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Login failed");
    }
    const data = await response.json();
    setToken(data.access_token);
  };

  const updateProfile = async (updates) => {
    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });
    if (response.ok) {
      const data = await response.json();
      setUser(data);
    }
  };

  const logout = () => {
    setToken('');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Socket Provider ---
const SocketProvider = ({ children }) => {
  const { token, user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) {
      if (socket) socket.close();
      setSocket(null);
      return;
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      query: { token },
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket Connected!');
    });

    return () => {
      newSocket.close();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

// =====================================================================
// FRONTEND COMPONENTS
// =====================================================================

// --- Splash Screen Component ---
const SplashScreen = ({ onComplete }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500); // Wait for opacity fade transition
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="splash-container">
      <div className="splash-logo">
        <svg width="120" height="120" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="28" fill="#4F46E5" />
          <circle cx="28" cy="28" r="18" fill="#4F46E5" />
          <circle cx="72" cy="28" r="18" fill="#4F46E5" />
          <path d="M38 52 C38 48, 62 48, 62 52 C62 58, 38 58, 38 52 Z" fill="#F59E0B" />
          <circle cx="42" cy="42" r="4" fill="#FFFFFF" />
          <circle cx="58" cy="42" r="4" fill="#FFFFFF" />
        </svg>
      </div>
      <h1 className="splash-title gradient-text-primary">Mickey's Chat</h1>
      <p style={{ color: '#94A3B8', marginBottom: '20px', fontSize: '0.9rem' }}>Secure, Real-time Glassmorphic Messenger</p>
      <div className="splash-loader-bar">
        <div className="splash-loader-progress"></div>
      </div>
    </div>
  );
};

// --- Auth Page Component (Login/Register toggle) ---
const AuthPage = () => {
  const { login, register } = useContext(AuthContext);
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await register(username, email, password);
      } else {
        await login(username || email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-glow-1"></div>
      <div className="auth-glow-2"></div>
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <svg width="60" height="60" viewBox="0 0 100 100" style={{ margin: '0 auto' }}>
            <circle cx="50" cy="50" r="28" fill="#4F46E5" />
            <circle cx="28" cy="28" r="18" fill="#4F46E5" />
            <circle cx="72" cy="28" r="18" fill="#4F46E5" />
            <path d="M38 52 C38 48, 62 48, 62 52 C62 58, 38 58, 38 52 Z" fill="#F59E0B" />
          </svg>
          <h2>{isRegister ? "Create Account" : "Welcome Back"}</h2>
          <p>{isRegister ? "Join Mickey's Chat today" : "Connect securely in real time"}</p>
        </div>

        {error && <div style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', marginTop: '16px', fontSize: '0.875rem' }}>{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username {isRegister ? '' : 'or Email'}</label>
            <div className="input-container">
              <Icon name="user" />
              <input 
                type="text" 
                className="input-field" 
                placeholder={isRegister ? "Enter username" : "Enter username or email"} 
                required 
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>

          {isRegister && (
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-container">
                <span style={{ position: 'absolute', left: '14px', color: '#94A3B8' }}>@</span>
                <input 
                  type="email" 
                  className="input-field" 
                  style={{ paddingLeft: '34px' }}
                  placeholder="Enter your email" 
                  required 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <div className="input-container">
              <Icon name="lock" />
              <input 
                type="password" 
                className="input-field" 
                placeholder="••••••••" 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn-submit">
            {isRegister ? "Register Account" : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          {isRegister ? "Already have an account?" : "New to Mickey's Chat?"}
          <button className="auth-link" onClick={() => { setIsRegister(!isRegister); setError(''); }}>
            {isRegister ? "Sign In" : "Register Now"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- WebRTC Calling Stream Box Overlay ---
const WebRTCCall = ({ callData, onHangup, token }) => {
  const socket = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);

  // Initialize media stream
  useEffect(() => {
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: callData.type === 'video',
          audio: true
        });
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        
        // Setup WebRTC peer connection
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pcRef.current = pc;

        // Add local tracks to peer connection
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit('call_signal', {
              target_user_id: callData.targetId,
              signal_data: { candidate: event.candidate },
              type: callData.type
            });
          }
        };

        // If caller, send WebRTC offer
        if (callData.isCaller) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('call_signal', {
            target_user_id: callData.targetId,
            signal_data: { offer },
            type: callData.type,
            sender_name: user.username
          });
        }
      } catch (err) {
        console.error("Failed to access local media devices:", err);
      }
    };

    startMedia();

    return () => {
      // Cleanup tracks
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  // Listen for signaling inputs
  useEffect(() => {
    if (!socket) return;

    const handleCallSignal = async (data) => {
      if (data.sender_id !== callData.targetId) return;

      const pc = pcRef.current;
      if (!pc) return;

      try {
        if (data.signal_data.offer) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.signal_data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('call_signal', {
            target_user_id: callData.targetId,
            signal_data: { answer },
            type: callData.type
          });
        } else if (data.signal_data.answer) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.signal_data.answer));
        } else if (data.signal_data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.signal_data.candidate));
        }
      } catch (e) {
        console.error("Error setting signal descriptors:", e);
      }
    };

    // We capture signaling events dispatched by the Socket.IO loop
    socket.on('call_offered', handleCallSignal);
    return () => {
      socket.off('call_offered', handleCallSignal);
    };
  }, [socket, callData.targetId]);

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  return (
    <div className="call-overlay-container">
      <div className="call-streams-grid">
        {/* Local Stream */}
        <div className="call-video-box">
          {callData.type === 'video' ? (
            <video ref={localVideoRef} autoPlay playsInline muted />
          ) : (
            <div className="flex-center" style={{ height: '100%', fontSize: '1.2rem', background: '#0F172A', color: '#94A3B8' }}>
              Voice Call - Local Audio Active
            </div>
          )}
          <div className="call-user-label">You</div>
        </div>

        {/* Remote Stream */}
        <div className="call-video-box">
          {remoteStream ? (
            callData.type === 'video' ? (
              <video ref={remoteVideoRef} autoPlay playsInline />
            ) : (
              <div className="flex-center" style={{ height: '100%', fontSize: '1.2rem', background: '#0F172A', color: '#94A3B8' }}>
                Connected
              </div>
            )
          ) : (
            <div className="flex-center" style={{ height: '100%', flexDirection: 'column', gap: '15px' }}>
              <div className="splash-loader-progress" style={{ width: '30px', height: '30px', borderRadius: '50%', animation: 'dotBlink 1s infinite' }}></div>
              <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Calling {callData.targetName}...</p>
            </div>
          )}
          <div className="call-user-label">{callData.targetName}</div>
        </div>
      </div>

      <div className="call-controls-row">
        <button className={`call-btn mute ${isMuted ? 'active' : ''}`} onClick={toggleMute}>
          <Icon name="microphone" size={24} />
        </button>
        <button className="call-btn decline" onClick={onHangup}>
          <Icon name="phone" size={24} style={{ transform: 'rotate(135deg)' }} />
        </button>
      </div>
    </div>
  );
};

// --- Admin Analytics Dashboard Component ---
const AdminDashboard = ({ token }) => {
  const [stats, setStats] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (e) {
      console.error("Failed to fetch analytics:", e);
    }
  };

  // Render HTML5 Canvas Chart dynamically
  useEffect(() => {
    if (!stats || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const data = stats.messages_by_date;
    if (data.length === 0) return;

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const maxVal = Math.max(...data.map(d => d.count), 5); // Fallback to 5 to avoid flat scale

    // Draw Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
    }

    // Plot line
    ctx.beginPath();
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 3;
    
    data.forEach((point, idx) => {
      const x = padding + (chartWidth / (data.length - 1)) * idx;
      const y = padding + chartHeight - (point.count / maxVal) * chartHeight;
      
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw gradient area below line
    const grad = ctx.createLinearGradient(0, padding, 0, padding + chartHeight);
    grad.addColorStop(0, 'rgba(79, 70, 229, 0.25)');
    grad.addColorStop(1, 'rgba(79, 70, 229, 0)');
    ctx.fillStyle = grad;
    
    ctx.beginPath();
    data.forEach((point, idx) => {
      const x = padding + (chartWidth / (data.length - 1)) * idx;
      const y = padding + chartHeight - (point.count / maxVal) * chartHeight;
      if (idx === 0) {
        ctx.moveTo(x, padding + chartHeight);
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.closePath();
    ctx.fill();

    // Draw Dots and Labels
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    
    data.forEach((point, idx) => {
      const x = padding + (chartWidth / (data.length - 1)) * idx;
      const y = padding + chartHeight - (point.count / maxVal) * chartHeight;

      // Draw point dot
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#06B6D4';
      ctx.fill();

      // Label value
      ctx.fillStyle = '#F8FAFC';
      ctx.fillText(point.count.toString(), x, y - 8);

      // X Axis labels
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(point.date, x, padding + chartHeight + 18);
    });

  }, [stats]);

  if (!stats) return <div className="dashboard-panel flex-center"><p>Loading analytics...</p></div>;

  return (
    <div className="dashboard-panel">
      <div className="dashboard-header">
        <h2>System Analytics Panel</h2>
        <button className="btn-secondary" onClick={fetchStats}>Refresh</button>
      </div>

      <div className="dashboard-stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon"><Icon name="users" /></div>
          <div>
            <div className="stat-value">{stats.total_users}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>

        <div className="stat-card glass-panel cyan">
          <div className="stat-icon"><Icon name="user" /></div>
          <div>
            <div className="stat-value">{stats.online_users}</div>
            <div className="stat-label">Online Users</div>
          </div>
        </div>

        <div className="stat-card glass-panel amber">
          <div className="stat-icon"><Icon name="message" /></div>
          <div>
            <div className="stat-value">{stats.total_messages}</div>
            <div className="stat-label">Messages Logs</div>
          </div>
        </div>

        <div className="stat-card glass-panel green">
          <div className="stat-icon"><Icon name="settings" /></div>
          <div>
            <div className="stat-value">{stats.total_rooms}</div>
            <div className="stat-label">Chat Rooms</div>
          </div>
        </div>
      </div>

      <div className="dashboard-charts-row">
        <div className="chart-card glass-panel">
          <h3>Message Volume (Last 7 Days)</h3>
          <div className="chart-canvas-wrapper">
            <canvas ref={canvasRef} width="600" height="250"></canvas>
          </div>
        </div>

        <div className="chart-card glass-panel">
          <h3>Users Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
            {stats.users_by_status.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ textTransform: 'capitalize', color: '#94A3B8', fontSize: '0.9rem' }}>{item.status}</span>
                <span style={{ fontWeight: '600' }}>{item.count} users</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Friend Request Modal ---
const FriendRequestModal = ({ onClose, token, onRefreshFriends }) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [requests, setRequests] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/friends/requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const response = await fetch(`${API_URL}/friends/request`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ receiver_username: usernameInput })
      });
      if (response.ok) {
        setSuccessMsg(`Friend request successfully sent to ${usernameInput}!`);
        setUsernameInput('');
      } else {
        const err = await response.json();
        setErrorMsg(err.detail || "Failed to send request");
      }
    } catch (err) {
      setErrorMsg("Failed to send request");
    }
  };

  const handleAccept = async (reqId) => {
    try {
      const response = await fetch(`${API_URL}/friends/accept/${reqId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchRequests();
        if (onRefreshFriends) onRefreshFriends();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDecline = async (reqId) => {
    try {
      const response = await fetch(`${API_URL}/friends/decline/${reqId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchRequests();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card glass-panel">
        <div className="modal-header">
          <h3>Manage Friends</h3>
          <button className="modal-close-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSendRequest} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input 
              type="text" 
              className="input-field" 
              style={{ paddingLeft: '14px' }}
              placeholder="Enter friend's username..." 
              required
              value={usernameInput}
              onChange={e => setUsernameInput(e.target.value)}
            />
            <button type="submit" className="btn-primary">Add</button>
          </form>

          {successMsg && <div style={{ color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>{successMsg}</div>}
          {errorMsg && <div style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>{errorMsg}</div>}

          <h4>Pending Requests ({requests.length})</h4>
          <div style={{ marginTop: '12px', maxHeight: '160px', overflowY: 'auto' }}>
            {requests.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>No pending requests.</p>
            ) : (
              requests.map(req => (
                <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontWeight: '500' }}>{req.sender.username}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => handleAccept(req.id)}>Accept</button>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem', borderColor: '#EF4444', color: '#EF4444' }} onClick={() => handleDecline(req.id)}>Decline</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Group Creation Modal ---
const GroupCreateModal = ({ onClose, token, onRoomCreated, friends }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [isPrivate, setIsPrivate] = useState(true);

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    try {
      const response = await fetch(`${API_URL}/rooms/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: groupName,
          is_group: true,
          is_private: isPrivate,
          member_ids: selectedFriends
        })
      });
      if (response.ok) {
        const room = await response.json();
        onRoomCreated(room);
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFriendSelection = (uid) => {
    setSelectedFriends(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card glass-panel">
        <div className="modal-header">
          <h3>Create Group Chat</h3>
          <button className="modal-close-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Group Name</label>
            <input 
              type="text" 
              className="input-field" 
              style={{ paddingLeft: '14px' }} 
              placeholder="e.g. Disney Club" 
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <label style={{ margin: 0 }}>Group Privacy:</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', textTransform: 'none' }}>
              <input type="radio" checked={isPrivate} onChange={() => setIsPrivate(true)} />
              Private
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', textTransform: 'none' }}>
              <input type="radio" checked={!isPrivate} onChange={() => setIsPrivate(false)} />
              Public
            </label>
          </div>

          <h4>Select Members</h4>
          <div style={{ marginTop: '10px', maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {friends.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Add friends first to create groups!</p>
            ) : (
              friends.map(f => (
                <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedFriends.includes(f.id)} 
                    onChange={() => toggleFriendSelection(f.id)} 
                  />
                  <span>{f.username}</span>
                </label>
              ))
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleCreate} disabled={!groupName.trim() || friends.length === 0}>Create</button>
        </div>
      </div>
    </div>
  );
};

// --- Backup & Restore Modal ---
const BackupRestoreModal = ({ onClose, token, onRestoreSuccess }) => {
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_URL}/backup/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Trigger file download
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mickeys_chat_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSuccessMsg('');
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target.result);
        const response = await fetch(`${API_URL}/backup/restore`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(backupData)
        });
        if (response.ok) {
          const res = await response.json();
          setSuccessMsg(`Successfully restored! ${res.restored_rooms} Rooms, ${res.restored_messages} Messages loaded.`);
          if (onRestoreSuccess) onRestoreSuccess();
        } else {
          const err = await response.json();
          setErrorMsg(err.detail || "Failed to restore file.");
        }
      } catch (err) {
        setErrorMsg("Invalid backup JSON format.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card glass-panel">
        <div className="modal-header">
          <h3>Chat Backup & Restore</h3>
          <button className="modal-close-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h4>Export Backup</h4>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '4px', marginBottom: '12px' }}>Download a copy of your chat rooms and message history as a JSON file.</p>
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleExport}>
              <Icon name="download" size={16} /> Export JSON
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <h4>Restore from Backup</h4>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '4px', marginBottom: '12px' }}>Upload a valid Mickey's Chat backup file to restore messages.</p>
            <input type="file" accept=".json" onChange={handleFileChange} style={{ fontSize: '0.875rem' }} />
          </div>

          {successMsg && <div style={{ color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem' }}>{successMsg}</div>}
          {errorMsg && <div style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem' }}>{errorMsg}</div>}
        </div>
      </div>
    </div>
  );
};

// --- Profile Customization Modal ---
const ProfileModal = ({ onClose }) => {
  const { user, updateProfile, logout } = useContext(AuthContext);
  const [bioInput, setBioInput] = useState(user.bio || '');
  const [avatarInput, setAvatarInput] = useState(user.avatar_url || '');

  const handleSave = () => {
    updateProfile({ bio: bioInput, avatar_url: avatarInput });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card glass-panel">
        <div className="modal-header">
          <h3>Edit Profile</h3>
          <button className="modal-close-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="modal-body profile-panel">
          <div className="profile-avatar-row">
            <img className="profile-avatar-large" src={avatarInput || user.avatar_url} alt="Profile" />
          </div>

          <div className="form-group">
            <label>Avatar URL</label>
            <input 
              type="text" 
              className="input-field" 
              style={{ paddingLeft: '14px' }}
              value={avatarInput} 
              onChange={e => setAvatarInput(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>Bio Status</label>
            <input 
              type="text" 
              className="input-field" 
              style={{ paddingLeft: '14px' }}
              value={bioInput} 
              onChange={e => setBioInput(e.target.value)} 
            />
          </div>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn-secondary" style={{ borderColor: '#EF4444', color: '#EF4444' }} onClick={() => { logout(); onClose(); }}>Logout</button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// MAIN WINDOW LAYOUT
// =====================================================================

const MainLayout = () => {
  const { user, token } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const socket = useContext(SocketContext);

  const [activeTab, setActiveTab] = useState('chats'); // chats, groups, friends, admin
  const [rooms, setRooms] = useState([]);
  const [friends, setFriends] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [activeRoom, setActiveRoom] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showProfile, setShowProfile] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);

  // WebRTC Call state
  const [callData, setCallData] = useState(null); // { type, targetId, targetName, isCaller }
  const [incomingCall, setIncomingCall] = useState(null); // { senderId, senderName, type, signal }

  // Load static data
  useEffect(() => {
    fetchRooms();
    fetchFriends();
  }, []);

  // Listen to Socket presence updates
  useEffect(() => {
    if (!socket) return;

    socket.on('presence_update', (data) => {
      // data: { user_id, status }
      setOnlineUsers(prev => ({
        ...prev,
        [data.user_id]: data.status
      }));
    });

    socket.on('call_offered', (data) => {
      // data: { sender_id, sender_name, type, signal_data }
      // Play ringing audio/visual alert
      setIncomingCall(data);
    });

    return () => {
      socket.off('presence_update');
      socket.off('call_offered');
    };
  }, [socket]);

  const fetchRooms = async () => {
    try {
      const response = await fetch(`${API_URL}/rooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await fetch(`${API_URL}/friends`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFriends(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartCall = (targetId, targetName, callType) => {
    setCallData({
      type: callType,
      targetId,
      targetName,
      isCaller: true
    });
  };

  const handleAcceptCall = () => {
    if (!incomingCall) return;
    setCallData({
      type: incomingCall.type,
      targetId: incomingCall.sender_id,
      targetName: incomingCall.sender_name,
      isCaller: false
    });
    setIncomingCall(null);
  };

  const handleDeclineCall = () => {
    setIncomingCall(null);
  };

  // Filter list by search query
  const filteredRooms = rooms.filter(r => 
    r.is_group === (activeTab === 'groups') &&
    (r.name ? r.name.toLowerCase().includes(searchQuery.toLowerCase()) : true)
  );

  return (
    <div className="app-wrapper">
      {/* Sidebar Panel */}
      <div className="sidebar-panel glass-panel">
        <div className="sidebar-header">
          <div className="app-logo-area">
            <svg width="28" height="28" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="28" fill="#4F46E5" />
              <circle cx="28" cy="28" r="18" fill="#4F46E5" />
              <circle cx="72" cy="28" r="18" fill="#4F46E5" />
              <path d="M38 52 C38 48, 62 48, 62 52 C62 58, 38 58, 38 52 Z" fill="#F59E0B" />
            </svg>
            <h1 className="gradient-text-primary">Mickey's Chat</h1>
          </div>
          <div className="sidebar-header-actions">
            <button className="header-action-btn" onClick={toggleTheme}>
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>
            <button className="header-action-btn" onClick={() => setShowBackupModal(true)}>
              <Icon name="backup" size={18} />
            </button>
          </div>
        </div>

        <div className="search-box-area">
          <div className="input-container" style={{ width: '100%' }}>
            <Icon name="search" size={16} />
            <input 
              type="text" 
              className="input-field" 
              style={{ paddingLeft: '38px', borderRadius: '10px' }} 
              placeholder="Search chat or groups..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tab Selection */}
        <div className="sidebar-tabs">
          <button className={`tab-btn ${activeTab === 'chats' ? 'active' : ''}`} onClick={() => setActiveTab('chats')}>
            <Icon name="message" size={16} />
            Chats
          </button>
          <button className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => setActiveTab('groups')}>
            <Icon name="users" size={16} />
            Groups
          </button>
          <button className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>
            <Icon name="user" size={16} />
            Friends
          </button>
          <button className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
            <Icon name="chart" size={16} />
            Admin
          </button>
        </div>

        {/* List Content */}
        <div className="sidebar-list-content">
          {activeTab === 'admin' ? (
            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Admin analytics is active. Click below to view dashboard.</p>
              <button className="btn-primary" style={{ width: '100%', fontSize: '0.85rem' }} onClick={() => setActiveRoom({ id: 'admin_panel', name: 'Admin Dashboard' })}>Open Analytics Panel</button>
            </div>
          ) : activeTab === 'friends' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: '500' }}>Friends List</span>
                <button className="header-action-btn" style={{ padding: '4px' }} onClick={() => setShowFriendsModal(true)}>
                  <Icon name="plus" size={16} />
                </button>
              </div>
              {friends.length === 0 ? (
                <p style={{ color: '#94A3B8', fontSize: '0.85rem', textAlign: 'center', marginTop: '20px' }}>No friends yet. Add some!</p>
              ) : (
                friends.map(f => {
                  const status = onlineUsers[f.id] || f.status || 'offline';
                  return (
                    <div key={f.id} className="list-item" style={{ cursor: 'pointer' }} onClick={() => handleStartCall(f.id, f.username, 'video')}>
                      <div className="avatar-wrapper">
                        <img className="avatar" src={f.avatar_url} alt="friend" />
                        <span className={`status-indicator ${status}`}></span>
                      </div>
                      <div className="item-info">
                        <div className="item-name-row">
                          <h4>{f.username}</h4>
                          <span style={{ fontSize: '0.75rem', color: '#06B6D4' }}>Call</span>
                        </div>
                        <p className="item-preview">{f.bio}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div>
              {activeTab === 'groups' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: '500' }}>Groups List</span>
                  <button className="header-action-btn" style={{ padding: '4px' }} onClick={() => setShowGroupModal(true)}>
                    <Icon name="plus" size={16} />
                  </button>
                </div>
              )}
              {filteredRooms.length === 0 ? (
                <p style={{ color: '#94A3B8', fontSize: '0.85rem', textAlign: 'center', marginTop: '20px' }}>No conversations.</p>
              ) : (
                filteredRooms.map(room => {
                  // Resolve title for DMs
                  let title = room.name;
                  let avatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop";
                  if (!room.is_group) {
                    const peer = room.members.find(m => m.user.id !== user.id)?.user;
                    title = peer ? peer.username : "Direct Chat";
                    avatar = peer ? peer.avatar_url : avatar;
                  } else {
                    avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${room.id}`;
                  }

                  const isActive = activeRoom && activeRoom.id === room.id;
                  const lastMsgPreview = room.last_message ? room.last_message.content : "No messages yet";

                  return (
                    <div key={room.id} className={`list-item ${isActive ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setActiveRoom(room)}>
                      <div className="avatar-wrapper">
                        <img className="avatar" src={avatar} alt="room avatar" />
                      </div>
                      <div className="item-info">
                        <div className="item-name-row">
                          <h4>{title}</h4>
                          {room.last_message && (
                            <span className="item-time">
                              {new Date(room.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className="item-preview">{lastMsgPreview}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Profile Footer */}
        <div className="sidebar-profile-footer">
          <div className="user-profile-summary">
            <div className="avatar-wrapper">
              <img className="avatar" src={user.avatar_url} alt="Profile" />
              <span className="status-indicator online"></span>
            </div>
            <div className="user-details">
              <h5>{user.username}</h5>
              <p>{user.email}</p>
            </div>
          </div>
          <button className="header-action-btn" onClick={() => setShowProfile(true)}>
            <Icon name="settings" size={18} />
          </button>
        </div>
      </div>

      {/* Main Chat/Dashboard Panel */}
      <div className="chat-area-panel glass-panel" style={{ overflow: 'hidden' }}>
        {activeRoom ? (
          activeRoom.id === 'admin_panel' ? (
            <AdminDashboard token={token} />
          ) : (
            <ChatWindow room={activeRoom} token={token} onStartCall={handleStartCall} />
          )
        ) : (
          <div className="chat-welcome-box">
            <div className="welcome-logo">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="28" fill="#4F46E5" />
                <circle cx="28" cy="28" r="18" fill="#4F46E5" />
                <circle cx="72" cy="28" r="18" fill="#4F46E5" />
                <path d="M38 52 C38 48, 62 48, 62 52 C62 58, 38 58, 38 52 Z" fill="#F59E0B" />
              </svg>
            </div>
            <h3>Welcome to Mickey's Chat</h3>
            <p>Select a conversations or group from the sidebar, or invite friends to get started with instant messaging and voice/video WebRTC calling.</p>
          </div>
        )}
      </div>

      {/* WebRTC Video Call Overlay */}
      {callData && (
        <WebRTCCall 
          callData={callData} 
          onHangup={() => setCallData(null)} 
          token={token} 
        />
      )}

      {/* Incoming Call Prompt */}
      {incomingCall && (
        <div className="incoming-call-alert glass-panel">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: '700' }}>Incoming {incomingCall.type} Call</span>
            <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>From {incomingCall.sender_name}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#10B981' }} onClick={handleAcceptCall}>Answer</button>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: '#EF4444', color: '#EF4444' }} onClick={handleDeclineCall}>Decline</button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showFriendsModal && (
        <FriendRequestModal 
          onClose={() => setShowFriendsModal(false)} 
          token={token} 
          onRefreshFriends={fetchFriends} 
        />
      )}
      {showGroupModal && (
        <GroupCreateModal 
          onClose={() => setShowGroupModal(false)} 
          token={token} 
          friends={friends} 
          onRoomCreated={(room) => {
            fetchRooms();
            setActiveRoom(room);
          }} 
        />
      )}
      {showBackupModal && (
        <BackupRestoreModal 
          onClose={() => setShowBackupModal(false)} 
          token={token} 
          onRestoreSuccess={() => {
            fetchRooms();
            setActiveRoom(null);
          }} 
        />
      )}
    </div>
  );
};

// --- Chat Window Active Session Component ---
const ChatWindow = ({ room, token, onStartCall }) => {
  const socket = useContext(SocketContext);
  const { user } = useContext(AuthContext);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const [emojiPopup, setEmojiPopup] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [replyMessage, setReplyMessage] = useState(null);

  // Editing Message States
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');

  const messagesEndRef = useRef(null);

  // Load message logs on room changes
  useEffect(() => {
    fetchMessages();
    setReplyMessage(null);
    setEditingMessageId(null);

    if (socket) {
      socket.emit('join_room', { room_id: room.id });
    }

    return () => {
      if (socket) {
        socket.emit('leave_room', { room_id: room.id });
      }
    };
  }, [room.id, socket]);

  // Handle Socket events inside Room
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (msg) => {
      if (msg.chat_room_id === room.id) {
        setMessages(prev => [...prev, msg]);
      }
    };

    const handleUserTyping = (data) => {
      // data: { room_id, user_id, username, is_typing }
      if (data.room_id === room.id) {
        setTypingUsers(prev => ({
          ...prev,
          [data.user_id]: data.is_typing ? data.username : null
        }));
      }
    };

    const handleReactionUpdated = (data) => {
      // data: { message_id, reactions }
      setMessages(prev => prev.map(msg => 
        msg.id === data.message_id ? { ...msg, reactions: data.reactions } : msg
      ));
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('user_typing', handleUserTyping);
    socket.on('reaction_updated', handleReactionUpdated);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('user_typing', handleUserTyping);
      socket.off('reaction_updated', handleReactionUpdated);
    };
  }, [socket, room.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingUsers]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${API_URL}/rooms/${room.id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendText = () => {
    if (!inputText.trim() || !socket) return;
    socket.emit('send_message', {
      room_id: room.id,
      content: inputText,
      reply_to_id: replyMessage ? replyMessage.id : null,
      is_encrypted: false,
      attachments: []
    });
    setInputText('');
    setReplyMessage(null);
    handleTypingStop();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendText();
    } else {
      handleTypingStart();
    }
  };

  // Typing state thresholds
  const typingTimerRef = useRef(null);

  const handleTypingStart = () => {
    if (isTypingLocal || !socket) return;
    setIsTypingLocal(true);
    socket.emit('typing_status', { room_id: room.id, is_typing: true });

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(handleTypingStop, 3000);
  };

  const handleTypingStop = () => {
    setIsTypingLocal(false);
    if (socket) {
      socket.emit('typing_status', { room_id: room.id, is_typing: false });
    }
  };

  // Message Options
  const handleToggleReaction = (msgId, emoji) => {
    if (socket) {
      socket.emit('reaction_toggle', { message_id: msgId, reaction: emoji });
    }
  };

  const handleEditMessage = async (msgId, newContent) => {
    // We can run edit API or mock it
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: newContent, updated_at: new Date().toISOString() } : m));
    setEditingMessageId(null);
  };

  const handleDeleteMessage = (msgId) => {
    // Mock deletion state
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_deleted: true, content: "This message was deleted." } : m));
  };

  // Drag-and-drop file upload
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFileAttachment(files[0]);
    }
  };

  const handleFileAccessory = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await uploadFileAttachment(file);
    }
  };

  const uploadFileAttachment = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (response.ok) {
        const fileMetadata = await response.json();
        // Emit a WebSocket message containing the attachment details
        socket.emit('send_message', {
          room_id: room.id,
          content: `Shared file: ${file.name}`,
          attachments: [fileMetadata]
        });
      }
    } catch (e) {
      console.error("Upload error:", e);
    }
  };

  // Voice recording mock
  const [isRecording, setIsRecording] = useState(false);
  const handleVoiceRecordingToggle = () => {
    if (isRecording) {
      // Mock finishing and uploading
      setIsRecording(false);
      socket.emit('send_message', {
        room_id: room.id,
        content: "🎙️ Shared voice note (12s)",
        attachments: [{
          file_name: "voice_note.mp3",
          file_type: "audio",
          file_path: "/uploads/voice_mock.mp3",
          file_size: 15420
        }]
      });
    } else {
      setIsRecording(true);
    }
  };

  // Resolve headers details
  let title = room.name;
  let peerId = null;
  if (!room.is_group) {
    const peer = room.members.find(m => m.user.id !== user.id)?.user;
    title = peer ? peer.username : "Direct Chat";
    peerId = peer?.id;
  }

  // Active Typings list
  const typings = Object.values(typingUsers).filter(Boolean);

  return (
    <div 
      className="chat-window-container" 
      style={{ position: 'relative', height: '100%' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="drag-drop-mask">
          <Icon name="paperclip" size={48} style={{ color: '#4F46E5' }} />
          <h3 style={{ color: '#FFFFFF' }}>Drag & Drop Files Here</h3>
          <p style={{ color: '#94A3B8' }}>Release to upload image, video, audio or PDF instantly</p>
        </div>
      )}

      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-user">
          <div className="avatar-wrapper">
            <img className="avatar" src={room.is_group ? `https://api.dicebear.com/7.x/identicon/svg?seed=${room.id}` : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop"} alt="Avatar" />
          </div>
          <div>
            <h3>{title}</h3>
            <p>{room.is_group ? `${room.members.length} members` : "Online"}</p>
          </div>
        </div>
        
        {!room.is_group && peerId && (
          <div className="chat-header-actions">
            <button className="header-action-btn" onClick={() => onStartCall(peerId, title, 'video')}>
              <Icon name="video" size={18} />
            </button>
            <button className="header-action-btn" onClick={() => onStartCall(peerId, title, 'voice')}>
              <Icon name="phone" size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Message List */}
      <div className="chat-messages-scroller">
        {messages.length === 0 ? (
          <div className="flex-center" style={{ height: '100%', flexDirection: 'column', gap: '8px', color: '#94A3B8' }}>
            🐭 <p>No messages yet. Send a greeting to start chatting!</p>
          </div>
        ) : (
          messages.map(msg => {
            const isSent = msg.sender_id === user.id;
            
            // Check reactions status
            const reactionSummary = msg.reactions || [];

            return (
              <div key={msg.id} className={`msg-row ${isSent ? 'sent' : 'received'}`}>
                <div className="msg-bubble-container">
                  <div className="msg-bubble">
                    {/* Header Sender name in groups */}
                    {room.is_group && !isSent && (
                      <span className="msg-sender-name">{msg.sender.username}</span>
                    )}

                    {/* Reply Preview */}
                    {msg.reply_to_id && (
                      <div className="reply-preview-bubble">
                        Replied to message ID #{msg.reply_to_id}
                      </div>
                    )}

                    {/* Content */}
                    {editingMessageId === msg.id ? (
                      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                        <input 
                          type="text" 
                          className="input-field" 
                          style={{ paddingLeft: '10px' }} 
                          value={editText} 
                          onChange={e => setEditText(e.target.value)} 
                        />
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button style={{ fontSize: '0.8rem', color: '#EF4444' }} onClick={() => setEditingMessageId(null)}>Cancel</button>
                          <button style={{ fontSize: '0.8rem', color: '#10B981' }} onClick={() => handleEditMessage(msg.id, editText)}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <p className="msg-content">{msg.content}</p>
                    )}

                    {/* Render Image or Audio attachments */}
                    {msg.attachments && msg.attachments.map(att => (
                      <div key={att.id}>
                        {att.file_type === 'image' && (
                          <img className="attachment-image-preview" src={`${SOCKET_URL}${att.file_path}`} alt="attachment" />
                        )}
                        {att.file_type === 'audio' && (
                          <audio controls src={`${SOCKET_URL}${att.file_path}`} style={{ marginTop: '8px', width: '220px' }} />
                        )}
                        {att.file_type !== 'image' && att.file_type !== 'audio' && (
                          <div className="attachment-card">
                            <Icon name="paperclip" size={16} />
                            <div className="attachment-details">
                              <span className="attachment-name">{att.file_name}</span>
                              <span className="attachment-size">{(att.file_size / 1024).toFixed(1)} KB</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="msg-meta-row">
                      <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isSent && <Icon name="doubleCheck" size={14} style={{ color: '#06B6D4' }} />}
                    </div>

                    {/* Reactions Badge */}
                    {reactionSummary.length > 0 && (
                      <div className="reactions-list">
                        {reactionSummary.map((r, i) => (
                          <span 
                            key={i} 
                            className={`reaction-badge ${r.user_id === user.id ? 'user-selected' : ''}`}
                            onClick={() => handleToggleReaction(msg.id, r.reaction)}
                          >
                            {r.reaction}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hover Options overlay */}
                  {!msg.is_deleted && (
                    <div className="msg-hover-actions">
                      <button className="hover-action-btn" onClick={() => handleToggleReaction(msg.id, '❤️')}>❤️</button>
                      <button className="hover-action-btn" onClick={() => handleToggleReaction(msg.id, '👍')}>👍</button>
                      <button className="hover-action-btn" onClick={() => setReplyMessage(msg)}><Icon name="reply" size={12} /></button>
                      {isSent && (
                        <>
                          <button className="hover-action-btn" onClick={() => { setEditingMessageId(msg.id); setEditText(msg.content); }}><Icon name="edit" size={12} /></button>
                          <button className="hover-action-btn" onClick={() => handleDeleteMessage(msg.id)}><Icon name="trash" size={12} /></button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Dynamic Typing display */}
        {typings.length > 0 && (
          <div className="msg-row received">
            <div className="typing-bubble">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', marginLeft: '6px' }}>{typings.join(', ')} is typing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input row bar */}
      <div className="chat-input-bar">
        {replyMessage && (
          <div className="reply-bar-active">
            <span>Replying to: <i>{replyMessage.content.slice(0, 40)}</i></span>
            <button onClick={() => setReplyMessage(null)}><Icon name="x" size={14} /></button>
          </div>
        )}

        <div className="input-controls-row">
          <button className="btn-input-accessory" onClick={() => setEmojiPopup(!emojiPopup)}>
            <Icon name="smile" />
          </button>

          {emojiPopup && (
            <div className="emoji-popup-box glass-panel">
              {['❤️', '👍', '😂', '😮', '🔥', '🎉', '🐭', '✨', '🎂', '💩', '🍻', '👋'].map(em => (
                <button key={em} className="emoji-select-btn" onClick={() => { setInputText(prev => prev + em); setEmojiPopup(false); }}>
                  {em}
                </button>
              ))}
            </div>
          )}

          {/* Hidden File Picker */}
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <span className="btn-input-accessory" style={{ cursor: 'pointer' }}><Icon name="paperclip" /></span>
            <input type="file" style={{ display: 'none' }} onChange={handleFileAccessory} />
          </label>

          <button className="btn-input-accessory" onClick={handleVoiceRecordingToggle} style={{ color: isRecording ? '#EF4444' : '#94A3B8' }}>
            <Icon name="microphone" />
          </button>

          <div className="input-textarea-wrapper">
            <input 
              type="text" 
              className="input-chat-textarea" 
              placeholder={isRecording ? "Recording voice note..." : "Type a message or use @mickey..."}
              disabled={isRecording}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
            />
          </div>

          <button className="btn-chat-send" onClick={handleSendText}>
            <Icon name="send" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// ROOT APP
// =====================================================================

const App = () => {
  const [splashFinished, setSplashFinished] = useState(false);
  const { user, loading } = useContext(AuthContext);

  if (!splashFinished) {
    return <SplashScreen onComplete={() => setSplashFinished(true)} />;
  }

  if (loading) {
    return <div className="flex-center" style={{ height: '100vh', background: '#0B0F19' }}><div className="splash-loader-progress" style={{ width: '50px', height: '50px', borderRadius: '50%' }}></div></div>;
  }

  return user ? <MainLayout /> : <AuthPage />;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ThemeProvider>
    <AuthProvider>
      <SocketProvider>
        <App />
      </SocketProvider>
    </AuthProvider>
  </ThemeProvider>
);
