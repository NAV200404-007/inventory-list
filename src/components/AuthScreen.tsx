import { Bell, Building2, LockKeyhole, Plus } from 'lucide-react'
import type { PortalMode } from '../types'

type AuthScreenProps = {
  authView: 'login' | 'register'
  employerSetupComplete: boolean
  loginEmail: string
  loginError: string
  loginPassword: string
  loginPortal: PortalMode
  registerEmail: string
  registerError: string
  registerName: string
  registerPassword: string
  registerPortal: PortalMode
  registerSuccess: string
  themeMode: 'light' | 'dark'
  onAuthViewChange: (view: 'login' | 'register') => void
  onLogin: () => void
  onLoginEmailChange: (value: string) => void
  onLoginPasswordChange: (value: string) => void
  onLoginPortalChange: (portal: PortalMode) => void
  onRegister: () => void
  onRegisterEmailChange: (value: string) => void
  onRegisterNameChange: (value: string) => void
  onRegisterPasswordChange: (value: string) => void
  onRegisterPortalChange: (portal: PortalMode) => void
}

export function AuthLoadingScreen({ themeMode }: Pick<AuthScreenProps, 'themeMode'>) {
  return (
    <main className={`login-shell ${themeMode === 'dark' ? 'dark-mode' : ''}`}>
      <section className="login-panel"><p className="login-copy">Connecting securely...</p></section>
    </main>
  )
}

export function AuthScreen(props: AuthScreenProps) {
  const {
    authView,
    employerSetupComplete,
    loginEmail,
    loginError,
    loginPassword,
    loginPortal,
    registerEmail,
    registerError,
    registerName,
    registerPassword,
    registerPortal,
    registerSuccess,
    themeMode,
    onAuthViewChange,
    onLogin,
    onLoginEmailChange,
    onLoginPasswordChange,
    onLoginPortalChange,
    onRegister,
    onRegisterEmailChange,
    onRegisterNameChange,
    onRegisterPasswordChange,
    onRegisterPortalChange,
  } = props

  return (
    <main className={`login-shell ${themeMode === 'dark' ? 'dark-mode' : ''}`}>
      <section className="login-panel">
        <div className="brand login-brand">
          <img alt="Future Ready Academy Inventory" className="brand-logo" src="/app-logo.png" />
        </div>

        <div>
          <span className="eyebrow">Role-based access</span>
          <h1>Sign in to continue</h1>
          <p className="login-copy">
            Employer users can create and assign events. Employee users see assigned tasks,
            notifications, packing lists, and returns.
          </p>
        </div>

        <div className="auth-mode-switcher" aria-label="Login or create account">
          <button className={authView === 'login' ? 'active' : ''} onClick={() => onAuthViewChange('login')} type="button">Login</button>
          <button className={authView === 'register' ? 'active' : ''} onClick={() => onAuthViewChange('register')} type="button">Create account</button>
        </div>

        {authView === 'login' && (
          <>
            <div className="login-role-switcher">
              <button className={loginPortal === 'employer' ? 'active' : ''} onClick={() => onLoginPortalChange('employer')} type="button">
                <Building2 size={17} aria-hidden="true" />Employer
              </button>
              <button className={loginPortal === 'employee' ? 'active' : ''} onClick={() => onLoginPortalChange('employee')} type="button">
                <Bell size={17} aria-hidden="true" />Employee
              </button>
            </div>

            <form className="login-form" onSubmit={(event) => { event.preventDefault(); onLogin() }}>
              <label>Email<input autoComplete="email" placeholder="name@company.com" type="email" value={loginEmail} onChange={(event) => onLoginEmailChange(event.target.value)} /></label>
              <label>Password<input autoComplete="current-password" minLength={6} placeholder="Enter password" type="password" value={loginPassword} onChange={(event) => onLoginPasswordChange(event.target.value)} /></label>
              {loginError && <p className="login-error">{loginError}</p>}
              {registerSuccess && <p className="login-success">{registerSuccess}</p>}
              <button className="primary-action" type="submit"><LockKeyhole size={18} aria-hidden="true" />Login to {loginPortal === 'employer' ? 'Employer' : 'Employee'} portal</button>
            </form>
          </>
        )}

        {authView === 'register' && (
          <form className="login-form" onSubmit={(event) => { event.preventDefault(); onRegister() }}>
            <div className="login-role-switcher">
              <button className={registerPortal === 'employer' ? 'active' : ''} disabled={employerSetupComplete} onClick={() => onRegisterPortalChange('employer')} type="button">
                <Building2 size={17} aria-hidden="true" />{employerSetupComplete ? 'Employer set up' : 'First employer'}
              </button>
              <button className={registerPortal === 'employee' ? 'active' : ''} onClick={() => onRegisterPortalChange('employee')} type="button">
                <Bell size={17} aria-hidden="true" />New employee
              </button>
            </div>
            {employerSetupComplete && <p className="login-helper">New users register as employees. An employer can promote them from Home.</p>}
            <label>Name<input autoComplete="name" placeholder="Enter full name" value={registerName} onChange={(event) => onRegisterNameChange(event.target.value)} /></label>
            <label>Email<input autoComplete="email" placeholder="name@company.com" type="email" value={registerEmail} onChange={(event) => onRegisterEmailChange(event.target.value)} /></label>
            <label>Password<input autoComplete="new-password" minLength={6} placeholder="Create password" type="password" value={registerPassword} onChange={(event) => onRegisterPasswordChange(event.target.value)} /></label>
            <p className="field-hint">Use at least 6 characters. Avoid spaces at the start or end.</p>
            {registerError && <p className="login-error">{registerError}</p>}
            <button className="primary-action" type="submit"><Plus size={18} aria-hidden="true" />Add {registerPortal === 'employer' ? 'employer' : 'employee'}</button>
          </form>
        )}

        <div className="login-hint"><strong>For testing:</strong><span>Accounts and shared inventory are securely synchronized through Supabase.</span></div>
      </section>
    </main>
  )
}
