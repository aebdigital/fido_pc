import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../context/LanguageContext'
import logo from '../logo.png' // Import logo

const Login = () => {
  const { t } = useLanguage()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  // Force light mode on this page
  React.useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
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
    setError(null)
    setMessage(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4 p-8 rounded-2xl border bg-white border-gray-200 shadow-sm">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src={logo}
            alt="Fido"
            className="h-20 w-auto" // Adjusted styling for logo image
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-2 text-gray-700"
            >
              {t('Email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg border bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              placeholder={t('Enter your email')}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-2 text-gray-700"
            >
              {t('Password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 rounded-lg border bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              placeholder={t('Enter your password')}
            />
            {isSignUp && (
              <p className="mt-1 text-xs text-gray-500">
                {t('Password must be at least 6 characters')}
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 animate-in fade-in slide-in-from-top-1 duration-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 animate-in fade-in slide-in-from-top-1 duration-200">
              <p className="text-sm text-green-600">{message}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
          >
            {loading ? t('Loading...') : isSignUp ? t('Sign Up') : t('Sign In')}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            {isSignUp
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
