import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { TOKEN_KEY } from './authUtils'

type AuthContextValue = {
  token: string | null
  login: (t: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function clearTokenStorage() {
  localStorage.removeItem(TOKEN_KEY)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))

  const login = useCallback((t: string) => {
    setToken(t)
    localStorage.setItem(TOKEN_KEY, t)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    localStorage.removeItem(TOKEN_KEY)
  }, [])

  useEffect(() => {
    const handleLeave = () => {
      clearTokenStorage()
    }
    window.addEventListener('beforeunload', handleLeave)
    window.addEventListener('pagehide', handleLeave)
    return () => {
      window.removeEventListener('beforeunload', handleLeave)
      window.removeEventListener('pagehide', handleLeave)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
