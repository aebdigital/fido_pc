import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../context/LanguageContext'
import { useDarkMode } from '../context/DarkModeContext'
import { useAuth } from '../context/AuthContext'
import logo from '../logo.png' // Import logo

const Login = () => {
  const { t } = useLanguage()
  const { isDarkMode } = useDarkMode()
  const [isSignUp, setIsSignUp] = useState(false)
  const { recoveryMode, setRecoveryMode } = useAuth()
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (recoveryMode) {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        setMessage(t('Password updated successfully. You can now sign in.'))
        setRecoveryMode(false)
        setPassword('')
      } else if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setMessage(t('Check your email for the password reset link'))
      } else if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            redirectTo: window.location.origin
          }
        })

        if (error) throw error

        if (data?.user?.identities?.length === 0) {
          setError(t('User already registered'))
        } else {
          setMessage(t('Check your email for the confirmation link'))
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setIsForgotPassword(false)
    setError(null)
    setMessage(null)
  }

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword)
    setIsSignUp(false)
    setError(null)
    setMessage(null)
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`max-w-md w-full mx-4 p-8 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src={isDarkMode ? '/dark-logo.jpg' : logo}
            alt="Fido"
            className="h-20 w-auto" // Adjusted styling for logo image
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              {t('Email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={recoveryMode}
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} ${recoveryMode ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder={t('Enter your email')}
            />
          </div>

          {!isForgotPassword && (
            <div>
              <label
                htmlFor="password"
                className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
              >
                {t('Password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={`w-full px-4 py-2 pr-12 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                  placeholder={recoveryMode ? t('Enter new password') : t('Enter your password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {isSignUp && (
                <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('Password must be at least 6 characters')}
                </p>
              )}
              {!isSignUp && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={toggleForgotPassword}
                    className={`text-xs font-medium transition-colors ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                  >
                    {t('Forgot password?')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className={`p-3 rounded-lg border animate-in fade-in slide-in-from-top-1 duration-200 ${isDarkMode ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className={`p-3 rounded-lg border animate-in fade-in slide-in-from-top-1 duration-200 ${isDarkMode ? 'bg-green-900/30 border-green-800' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{message}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${loading
              ? 'bg-gray-400 cursor-not-allowed'
              : isDarkMode ? 'bg-white text-gray-900 hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
          >
            {loading ? t('Loading...') : recoveryMode ? t('Update Password') : isForgotPassword ? t('Reset Password') : isSignUp ? t('Sign Up') : t('Sign In')}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={isForgotPassword ? toggleForgotPassword : toggleMode}
            className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {isForgotPassword
              ? t('Back to Sign In')
              : isSignUp
                ? t('Already have an account? Sign in')
                : t("Don't have an account? Sign up")
            }
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login
