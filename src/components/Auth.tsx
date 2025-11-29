import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UtensilsCrossed, Mail, Lock, User, Hash, ArrowLeft } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'forgot-password';
type VerificationMode = 'signup-verify' | 'password-reset-verify' | null;

export const Auth = () => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [verificationMode, setVerificationMode] = useState<VerificationMode>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [otp, setOtp] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUpWithOTP, verifyOTPAndCreateAccount, sendPasswordResetOTP, resetPasswordWithOTP } = useAuth();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!email.endsWith('@indorama.com')) {
        setError('Only @indorama.com email addresses are allowed');
        setLoading(false);
        return;
      }

      await signUpWithOTP(email, fullName, employeeId);
      setSuccess('OTP sent to your email! Please check your inbox and enter the code below.');
      setVerificationMode('signup-verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      await verifyOTPAndCreateAccount(email, otp, password, fullName, employeeId);
      setSuccess('Account created successfully! Please sign in.');

      setTimeout(() => {
        setMode('signin');
        setVerificationMode(null);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
        setEmployeeId('');
        setOtp('');
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!email.endsWith('@indorama.com')) {
        setError('Only @indorama.com email addresses are allowed');
        setLoading(false);
        return;
      }

      await sendPasswordResetOTP(email);
      setSuccess('OTP sent to your email! Please check your inbox and enter the code below.');
      setVerificationMode('password-reset-verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      await resetPasswordWithOTP(email, otp, password);
      setSuccess('Password reset successfully! Please sign in with your new password.');

      setTimeout(() => {
        setMode('signin');
        setVerificationMode(null);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setOtp('');
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setEmployeeId('');
    setOtp('');
    setError('');
    setSuccess('');
    setVerificationMode(null);
  };

  const getTitle = () => {
    if (verificationMode === 'signup-verify') return 'Verify Your Email';
    if (verificationMode === 'password-reset-verify') return 'Verify OTP & Reset Password';
    if (mode === 'signin') return 'Welcome Back';
    if (mode === 'signup') return 'Create Your Account';
    if (mode === 'forgot-password') return 'Reset Password';
    return 'Indorama Canteen';
  };

  const getSubtitle = () => {
    if (verificationMode === 'signup-verify') return 'Enter the OTP sent to your email and set your password';
    if (verificationMode === 'password-reset-verify') return 'Enter the OTP and your new password';
    if (mode === 'signin') return 'Sign in to order your meals';
    if (mode === 'signup') return "We'll send you an OTP to verify your email";
    if (mode === 'forgot-password') return "We'll send you an OTP to reset your password";
    return '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <UtensilsCrossed className="w-12 h-12 text-orange-600" />
        </div>
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Indorama Canteen
        </h1>
        <p className="text-center text-gray-600 mb-2 font-semibold">{getTitle()}</p>
        <p className="text-center text-gray-500 text-sm mb-6">{getSubtitle()}</p>

        {mode === 'signin' && !verificationMode && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
                placeholder="your.name@indorama.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Lock className="w-4 h-4 inline mr-1" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-600 px-4 py-2 rounded-lg text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => {
                  setMode('forgot-password');
                  resetForm();
                }}
                className="text-orange-600 hover:text-orange-700 text-sm font-medium block w-full"
              >
                Forgot Password?
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  resetForm();
                }}
                className="text-orange-600 hover:text-orange-700 text-sm font-medium"
              >
                Don't have an account? Sign Up
              </button>
            </div>
          </form>
        )}

        {mode === 'signup' && !verificationMode && (
          <form onSubmit={handleSignUpRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Hash className="w-4 h-4 inline mr-1" />
                Employee ID
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-4 h-4 inline mr-1" />
                Email <span className="text-xs text-gray-500">(must end with @indorama.com)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
                placeholder="your.name@indorama.com"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-600 px-4 py-2 rounded-lg text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signin');
                resetForm();
              }}
              className="w-full text-orange-600 hover:text-orange-700 text-sm font-medium"
            >
              Already have an account? Sign In
            </button>
          </form>
        )}

        {verificationMode === 'signup-verify' && (
          <form onSubmit={handleVerifySignUp} className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-4 border-2 border-blue-200">
              <p className="font-semibold mb-2">📧 Check Your Email</p>
              <p className="mb-2"><strong>Sent to:</strong> {email}</p>
              <div className="bg-white p-2 rounded mt-2 text-xs">
                <p className="font-semibold text-blue-900 mb-1">Look for the 6-digit code in the email:</p>
                <p className="text-gray-700">• The code appears in the email body</p>
                <p className="text-gray-700">• Check spam folder if not received</p>
                <p className="text-gray-700">• Code expires in 60 minutes</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Hash className="w-4 h-4 inline mr-1" />
                Enter 6-Digit OTP Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center text-2xl tracking-widest"
                required
                placeholder="000000"
                maxLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Lock className="w-4 h-4 inline mr-1" />
                Set Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Lock className="w-4 h-4 inline mr-1" />
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
                minLength={6}
                placeholder="Re-enter password"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-600 px-4 py-2 rounded-lg text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <button
              type="button"
              onClick={() => {
                setVerificationMode(null);
                setOtp('');
                setPassword('');
                setConfirmPassword('');
                setError('');
              }}
              className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </form>
        )}

        {mode === 'forgot-password' && !verificationMode && (
          <form onSubmit={handlePasswordResetRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-4 h-4 inline mr-1" />
                Email <span className="text-xs text-gray-500">(must end with @indorama.com)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
                placeholder="your.name@indorama.com"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-600 px-4 py-2 rounded-lg text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signin');
                resetForm();
              }}
              className="w-full text-orange-600 hover:text-orange-700 text-sm font-medium"
            >
              Back to Sign In
            </button>
          </form>
        )}

        {verificationMode === 'password-reset-verify' && (
          <form onSubmit={handleVerifyPasswordReset} className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-4 border-2 border-blue-200">
              <p className="font-semibold mb-2">📧 Check Your Email</p>
              <p className="mb-2"><strong>Sent to:</strong> {email}</p>
              <div className="bg-white p-2 rounded mt-2 text-xs">
                <p className="font-semibold text-blue-900 mb-1">Look for the 6-digit code in the email:</p>
                <p className="text-gray-700">• The code appears in the email body</p>
                <p className="text-gray-700">• Check spam folder if not received</p>
                <p className="text-gray-700">• Code expires in 60 minutes</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Hash className="w-4 h-4 inline mr-1" />
                Enter 6-Digit OTP Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center text-2xl tracking-widest"
                required
                placeholder="000000"
                maxLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Lock className="w-4 h-4 inline mr-1" />
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Lock className="w-4 h-4 inline mr-1" />
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
                minLength={6}
                placeholder="Re-enter password"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-600 px-4 py-2 rounded-lg text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>

            <button
              type="button"
              onClick={() => {
                setVerificationMode(null);
                setOtp('');
                setPassword('');
                setConfirmPassword('');
                setError('');
              }}
              className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
