import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, User, Lock, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedId = userId.trim();
    const trimmedPass = password.trim();

    if (!trimmedId) {
      setError('Please enter your User ID or Username.');
      return;
    }
    if (!trimmedPass) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await login(trimmedId, trimmedPass);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid User ID or Password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div 
      className="min-vh-100 vw-100 d-flex align-items-center justify-content-center p-3 position-relative"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(20, 5, 8, 0.72) 0%, rgba(60, 15, 22, 0.55) 50%, rgba(15, 3, 6, 0.78) 100%), url('/login-bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#1E080C'
      }}
    >
      {/* Decorative Golden Ambient Aura */}
      <div 
        className="position-absolute rounded-circle"
        style={{
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(212, 139, 40, 0.22) 0%, rgba(212, 139, 40, 0) 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none'
        }}
      />

      <div 
        className="card border-0 shadow-lg text-center p-4 p-md-5 position-relative"
        style={{
          maxWidth: '440px',
          width: '100%',
          borderRadius: '24px',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(212, 139, 40, 0.2)',
          border: '1px solid rgba(212, 139, 40, 0.35)'
        }}
      >
        {/* Brand Circular Logo with Gold & Maroon Double Ring */}
        <div className="d-flex justify-content-center mb-3">
          <div 
            className="rounded-circle d-flex align-items-center justify-content-center bg-white shadow"
            style={{
              width: '112px',
              height: '112px',
              border: '3px solid #D48B28',
              padding: '3px',
              boxShadow: '0 4px 15px rgba(122, 27, 40, 0.25)'
            }}
          >
            <img
              src="/logo.jpg"
              alt="Bhatigal Bhanu"
              className="w-100 h-100 rounded-circle object-fit-cover"
            />
          </div>
        </div>

        {/* Title & Authentic Tagline */}
        <h3 
          className="fw-bold mb-1" 
          style={{ 
            color: 'var(--brand-maroon, #7A1B28)', 
            fontSize: '1.65rem', 
            letterSpacing: '0.01em' 
          }}
        >
          Bhatigal Bhanu
        </h3>
        
        <p 
          className="small fw-semibold mb-1" 
          style={{ color: 'var(--brand-gold-dark, #A86616)', fontSize: '0.9rem' }}
        >
          ...ભાવ, ભજન અને ભોજનનો ત્રિવેણી સંગમ...
        </p>

        <p 
          className="small text-muted mb-4" 
          style={{ fontSize: '0.78rem' }}
        >
          Restaurant Management ERP Portal
        </p>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 small rounded-3 mb-3 text-start">
            <AlertCircle size={16} className="flex-shrink-0 text-danger" />
            <span style={{ fontSize: '0.82rem' }}>{error}</span>
          </div>
        )}

        {/* User ID & Password Form */}
        <form onSubmit={handleSubmit} className="text-start d-flex flex-column gap-3">
          {/* User ID / Username Input */}
          <div>
            <label 
              className="form-label small fw-bold mb-1" 
              style={{ color: '#4A151D', fontSize: '0.85rem' }}
            >
              User ID / Username
            </label>
            <div className="input-group">
              <span 
                className="input-group-text border-end-0 bg-light text-muted"
                style={{ borderColor: '#E8DCCF', paddingLeft: '14px' }}
              >
                <User size={17} style={{ color: 'var(--brand-maroon, #7A1B28)' }} />
              </span>
              <input
                type="text"
                className="form-control form-control-lg border-start-0 border rounded-end-3"
                placeholder="Enter User ID or username..."
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                autoFocus
                style={{
                  borderColor: '#E8DCCF',
                  fontSize: '0.92rem',
                  padding: '11px 14px',
                  backgroundColor: '#FAFAFA'
                }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label 
              className="form-label small fw-bold mb-1" 
              style={{ color: '#4A151D', fontSize: '0.85rem' }}
            >
              Password
            </label>
            <div className="input-group">
              <span 
                className="input-group-text border-end-0 bg-light text-muted"
                style={{ borderColor: '#E8DCCF', paddingLeft: '14px' }}
              >
                <Lock size={17} style={{ color: 'var(--brand-maroon, #7A1B28)' }} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control form-control-lg border-start-0 border-end-0 border hide-password-toggle"
                placeholder="Enter your password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  borderColor: '#E8DCCF',
                  fontSize: '0.92rem',
                  padding: '11px 14px',
                  backgroundColor: '#FAFAFA'
                }}
              />
              <button
                type="button"
                className="input-group-text border-start-0 bg-light text-muted border rounded-end-3"
                style={{ borderColor: '#E8DCCF', cursor: 'pointer' }}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn w-100 py-3 text-white fw-bold shadow d-flex align-items-center justify-content-center gap-2"
              style={{
                backgroundColor: 'var(--brand-maroon, #7A1B28)',
                borderColor: 'var(--brand-maroon-dark, #56101B)',
                borderRadius: '12px',
                fontSize: '1rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(122, 27, 40, 0.3)'
              }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

