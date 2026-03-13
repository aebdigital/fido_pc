import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

const AUTH_URL_KEYS = [
  'type',
  'token_hash',
  'access_token',
  'refresh_token',
  'expires_in',
  'expires_at',
  'provider_token',
  'provider_refresh_token'
]

const getRecoveryUrlParams = () => {
  const searchParams = new URLSearchParams(window.location.search || '')
  const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''))
  return {
    type: searchParams.get('type') || hashParams.get('type'),
    tokenHash: searchParams.get('token_hash') || hashParams.get('token_hash')
  }
}

const clearAuthParamsFromUrl = () => {
  const searchParams = new URLSearchParams(window.location.search || '')
  AUTH_URL_KEYS.forEach((key) => searchParams.delete(key))
  const query = searchParams.toString()
  const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ''}`
  window.history.replaceState({}, document.title, cleanUrl)
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recoveryMode, setRecoveryMode] = useState(false)

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      const { type, tokenHash } = getRecoveryUrlParams()
      const isRecoveryLink = type === 'recovery'

      // iOS/opened-email links may come as token_hash query params and won't always emit PASSWORD_RECOVERY automatically.
      if (isRecoveryLink && tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          type: 'recovery',
          token_hash: tokenHash
        })
        if (error) {
          console.warn('Recovery token verification warning:', error.message)
        }
      }

      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.warn('Session restore error, will retry:', error.message)
        // Don't immediately log out - the onAuthStateChange listener
        // will handle recovery via TOKEN_REFRESHED event
      }

      if (!isMounted) return

      setUser(session?.user ?? null)
      if (isRecoveryLink) {
        setRecoveryMode(true)
        clearAuthParamsFromUrl()
      } else if (!session?.user) {
        setRecoveryMode(false)
      }
      setLoading(false)
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
      } else if (event === 'SIGNED_OUT') {
        setRecoveryMode(false)
      }

      // Only clear user on explicit sign out, not on transient errors
      if (event === 'SIGNED_OUT') {
        setUser(null)
      } else if (session?.user) {
        setUser(session.user)
      }
      setLoading(false)
    })

    // Refresh session when app regains focus (e.g., user switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            setUser(session.user)
          }
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    loading,
    recoveryMode,
    setRecoveryMode,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
