import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../context/LanguageContext'
import { useDarkMode } from '../context/DarkModeContext'
import { useAuth } from '../context/AuthContext'
import logo from '../logo.png'

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

  const heading = recoveryMode
    ? t('Create New Password')
    : isForgotPassword
      ? t('Reset Your Password')
      : isSignUp
        ? t('Create Account')
        : t('Sign In')

  const submitLabel = loading
    ? t('Loading...')
    : recoveryMode
      ? t('Update Password')
      : isForgotPassword
        ? t('Reset Password')
        : isSignUp
          ? t('Create Account')
          : t('Sign In')

  return (
    <div className={`min-h-screen flex items-center justify-center px-5 py-10 ${isDarkMode ? 'bg-gray-900' : 'bg-[#F9FAFB]'}`}>
      <div className="w-full max-w-[420px]">
        <div className="flex justify-center mb-7">
          <img
            src={isDarkMode ? '/dark-logo.jpg' : logo}
            alt="Fido"
            className="h-20 w-auto max-w-[220px] object-contain shadow-[0_10px_26px_rgba(0,0,0,0.14)]"
          />
        </div>

        <div className="text-center mb-6">
          <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{heading}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
              {t('Email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={recoveryMode}
              className={`w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#51A2F7] ${isDarkMode ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' : 'border-gray-300 bg-gray-100 text-gray-900 placeholder-gray-500'} ${recoveryMode ? 'opacity-60 cursor-not-allowed' : ''}`}
              placeholder={t('Enter your email')}
            />
          </div>

          {!isForgotPassword && (
            <div className="space-y-2">
              <label htmlFor="password" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {t('Password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={`w-full rounded-xl border px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-[#51A2F7] ${isDarkMode ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' : 'border-gray-300 bg-gray-100 text-gray-900 placeholder-gray-500'}`}
                  placeholder={recoveryMode ? t('Enter new password') : t('Enter your password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-0 bg-transparent border-none ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {isSignUp && (
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('Password must be at least 6 characters')}</p>
              )}
              {!isSignUp && !recoveryMode && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={toggleForgotPassword}
                    className={`text-sm bg-transparent border-none ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {t('Forgot password?')}
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-red-900 bg-red-950/50 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {error}
            </div>
          )}

          {message && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-green-900 bg-green-950/50 text-green-300' : 'border-green-200 bg-green-50 text-green-700'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-xl py-3.5 text-base font-semibold text-white transition-colors ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#51A2F7] hover:bg-[#3C95F5]'}`}
          >
            {submitLabel}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={isForgotPassword ? toggleForgotPassword : toggleMode}
            className="inline-flex items-center gap-1 text-[15px] bg-transparent border-none"
          >
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
              {isForgotPassword
                ? t('Back to Sign In')
                : isSignUp
                  ? t('Already have an account?')
                  : t("Don't have an account?")}
            </span>
            {!isForgotPassword && (
              <span className="font-medium text-[#51A2F7]">
                {isSignUp ? t('Sign In') : t('Sign Up')}
              </span>
            )}
          </button>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-5">
          <div className={`w-full max-w-xs rounded-2xl shadow-[0_10px_28px_rgba(0,0,0,0.18)] p-6 text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="mx-auto mb-3 h-8 w-8 rounded-full border-4 border-[#51A2F7]/25 border-t-[#51A2F7] animate-spin" />
            <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('Please wait...')}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
