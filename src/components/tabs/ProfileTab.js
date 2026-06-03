export default function ProfileTab({
  profile,
  theme,
  setTheme,
  isLoggedIn,
  handleLogout,
  handleAvatarChange,
}) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Profile</p>
          <h2>Your settings</h2>
        </div>
      </div>
      <div className="profile">
        <div className="profile__avatar">
          {profile.avatar ? (
            <img src={profile.avatar} alt="Avatar" />
          ) : (
            <div className="avatar-placeholder">{profile.name[0]}</div>
          )}
          <label className="ghost">
            Update photo
            <input type="file" accept="image/*" onChange={handleAvatarChange} hidden />
          </label>
        </div>
        <div className="profile__details">
          <div className="detail">
            <span className="muted">Name</span>
            <strong>{profile.name}</strong>
          </div>
          <div className="detail">
            <span className="muted">Role</span>
            <strong>{profile.role}</strong>
          </div>
          <div className="detail switches">
            <div>
              <span className="muted">Theme</span>
              <strong>{theme === 'light' ? 'Light' : 'Dark'} mode</strong>
            </div>
            <button className="ghost" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              Toggle theme
            </button>
          </div>
          <div className="detail switches">
            <div>
              <span className="muted">Session</span>
              <strong>{isLoggedIn ? 'Signed in' : 'Signed out'}</strong>
            </div>
            <button className="ghost" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
