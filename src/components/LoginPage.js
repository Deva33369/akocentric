export default function LoginPage({
  brandName,
  loginRole,
  setLoginRole,
  loginForm,
  setLoginForm,
  handleLogin,
  forgotPasswordOpen,
  forgotPasswordEmail,
  setForgotPasswordEmail,
  openForgotPassword,
  closeForgotPassword,
  handleForgotPassword,
  createAccountOpen,
  createAccountForm,
  setCreateAccountForm,
  openCreateAccount,
  closeCreateAccount,
  handleCreateAccount,
}) {
  return (
    <main className="login-page">
      <section className="login-card" aria-label="Login page">
        <div className="login-card__intro">
          <div className="brand brand--login">
            <div className="orb">AC</div>
            <div>
              <p className="eyebrow">{brandName}</p>
            </div>
          </div>
          <h1>Welcome!</h1>
          <p className="muted">
            Sign in first to access the booking tabs, classroom calendar, and profile tools.
          </p>
        </div>
        <form className="login-panel" onSubmit={handleLogin}>
          <fieldset className="role-picker">
            <legend>Login as</legend>
            <label className="role-option">
              <input
                type="radio"
                name="login-role"
                value="admin"
                checked={loginRole === 'admin'}
                onChange={(e) => setLoginRole(e.target.value)}
              />
              <span>Admin</span>
            </label>
            <label className="role-option">
              <input
                type="radio"
                name="login-role"
                value="trainer"
                checked={loginRole === 'trainer'}
                onChange={(e) => setLoginRole(e.target.value)}
              />
              <span>Trainer</span>
            </label>
            <label className="role-option">
              <input
                type="radio"
                name="login-role"
                value="eduPartners"
                checked={loginRole === 'eduPartners'}
                onChange={(e) => setLoginRole(e.target.value)}
              />
              <span>Edu Partners</span>
            </label>
          </fieldset>
          <label>
            Email address
            <input
              type="email"
              placeholder="work email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              placeholder="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              required
            />
          </label>
          <div className="login-panel__actions">
            <button type="button" className="text-button" onClick={openCreateAccount}>
              Create account
            </button>
            <button type="button" className="text-button" onClick={openForgotPassword}>
              Forgot password?
            </button>
          </div>
          <button type="submit" className="primary">Login</button>
        </form>
      </section>

      {forgotPasswordOpen ? (
        <div className="modal-overlay" role="presentation" onClick={closeForgotPassword}>
          <section
            className="modal-card forgot-password-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-password-title"
            onClick={(evt) => evt.stopPropagation()}
          >
            <div className="modal-card__header">
              <div>
                <p className="eyebrow">Account Recovery</p>
                <h3 id="forgot-password-title">Forgot Password</h3>
              </div>
              <button type="button" className="ghost" onClick={closeForgotPassword}>Close</button>
            </div>
            <form className="forgot-password-form" onSubmit={handleForgotPassword}>
              <p className="muted">
                Enter your email address and we will send a password reset link.
              </p>
              <label>
                Email address
                <input
                  type="email"
                  placeholder="work email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  required
                />
              </label>
              <div className="cta-row forgot-password-form__actions">
                <button type="button" className="ghost" onClick={closeForgotPassword}>Cancel</button>
                <button type="submit" className="primary">Send reset link</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {createAccountOpen ? (
        <div className="modal-overlay" role="presentation" onClick={closeCreateAccount}>
          <section
            className="modal-card forgot-password-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-account-title"
            onClick={(evt) => evt.stopPropagation()}
          >
            <div className="modal-card__header">
              <div>
                <p className="eyebrow">New User Setup</p>
                <h3 id="create-account-title">Create Account</h3>
              </div>
              <button type="button" className="ghost" onClick={closeCreateAccount}>Close</button>
            </div>
            <form className="forgot-password-form" onSubmit={handleCreateAccount}>
              <p className="muted">
                Request a new admin, trainer, or edu partners account. The request is sent to kumar.devadharshini@gmail.com for approval before login is allowed.
              </p>
              <label>
                Full name
                <input
                  type="text"
                  placeholder="Full name"
                  value={createAccountForm.name}
                  onChange={(e) => setCreateAccountForm({ ...createAccountForm, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Email address
                <input
                  type="email"
                  placeholder="work email"
                  value={createAccountForm.email}
                  onChange={(e) => setCreateAccountForm({ ...createAccountForm, email: e.target.value })}
                  required
                />
              </label>
              <fieldset className="role-picker role-picker--stacked">
                <legend>Account role</legend>
                <label className="role-option">
                  <input
                    type="radio"
                    name="create-account-role"
                    value="admin"
                    checked={createAccountForm.role === 'admin'}
                    onChange={(e) => setCreateAccountForm({ ...createAccountForm, role: e.target.value })}
                  />
                  <span>Admin</span>
                </label>
                <label className="role-option">
                  <input
                    type="radio"
                    name="create-account-role"
                    value="trainer"
                    checked={createAccountForm.role === 'trainer'}
                    onChange={(e) => setCreateAccountForm({ ...createAccountForm, role: e.target.value })}
                  />
                  <span>Trainer</span>
                </label>
                <label className="role-option">
                  <input
                    type="radio"
                    name="create-account-role"
                    value="eduPartners"
                    checked={createAccountForm.role === 'eduPartners'}
                    onChange={(e) => setCreateAccountForm({ ...createAccountForm, role: e.target.value })}
                  />
                  <span>Edu Partners</span>
                </label>
              </fieldset>
              <label>
                Password
                <input
                  type="password"
                  placeholder="password"
                  value={createAccountForm.password}
                  onChange={(e) => setCreateAccountForm({ ...createAccountForm, password: e.target.value })}
                  required
                />
              </label>
              <label>
                Confirm password
                <input
                  type="password"
                  placeholder="confirm password"
                  value={createAccountForm.confirmPassword}
                  onChange={(e) => setCreateAccountForm({ ...createAccountForm, confirmPassword: e.target.value })}
                  required
                />
              </label>
              <div className="cta-row forgot-password-form__actions">
                <button type="button" className="ghost" onClick={closeCreateAccount}>Cancel</button>
                <button type="submit" className="primary">Request approval</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
