import { useState } from 'react';

const emptyForm = { name: '', email: '', password: '' };

export default function EduPartnersTab({
  eduPartners,
  handleAddEduPartner,
  handleDeleteEduPartner,
}) {
  const [form, setForm] = useState(emptyForm);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);

  const selectedPartner = eduPartners.find((p) => p.id === selectedPartnerId) || null;

  const filteredPartners = eduPartners.filter((p) => {
    const q = partnerSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    const ok = await handleAddEduPartner(form);
    if (ok) setForm(emptyForm);
  };

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Edu Partner management</h2>
        </div>
      </div>

      <div className="student-browser trainer-browser">
        <section className="schedule-box">
          <div className="section-heading">
            <h3>Approved Edu Partners</h3>
            <p className="muted">Accounts approved for edu partner login.</p>
          </div>
          <div className="roster-toolbar">
            <label>
              Search
              <input
                type="text"
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.target.value)}
                placeholder="Search by name or email"
              />
            </label>
          </div>

          {filteredPartners.length > 0 ? (
            <div className="trainer-roster" role="list" aria-label="Edu partner roster">
              {filteredPartners.map((partner) => (
                <button
                  type="button"
                  key={partner.id}
                  className={selectedPartnerId === partner.id ? 'trainer-row active' : 'trainer-row'}
                  onClick={() => setSelectedPartnerId(partner.id)}
                >
                  <div>
                    <strong>{partner.name}</strong>
                    <p className="muted">{partner.email}</p>
                  </div>
                  <div className="trainer-row__meta">
                    <span className="pill compact success">Approved</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">No approved edu partner accounts yet.</p>
          )}
        </section>

        <section className="schedule-box">
          {selectedPartner ? (
            <>
              <div className="section-heading">
                <h3>Partner Details</h3>
                <p className="muted">Login credentials for {selectedPartner.name}.</p>
              </div>
              <div className="student-detail">
                <div className="student-detail__meta">
                  <div className="detail-card">
                    <span className="muted">Name</span>
                    <strong>{selectedPartner.name}</strong>
                  </div>
                  <div className="detail-card">
                    <span className="muted">Email</span>
                    <strong>{selectedPartner.email}</strong>
                  </div>
                  <div className="detail-card">
                    <span className="muted">Password</span>
                    <strong>{selectedPartner.password}</strong>
                  </div>
                  <div className="detail-card">
                    <span className="muted">Status</span>
                    <span className="pill compact success">Approved</span>
                  </div>
                </div>
                <div className="cta-row trainer-actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      handleDeleteEduPartner(selectedPartner.id);
                      setSelectedPartnerId(null);
                    }}
                  >
                    Remove partner
                  </button>
                </div>
              </div>
              <div className="cta-row" style={{ marginTop: '1rem' }}>
                <button type="button" className="ghost" onClick={() => setSelectedPartnerId(null)}>
                  + Add new partner
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="section-heading">
                <h3>Add Edu Partner</h3>
                <p className="muted">Directly approve and create an edu partner login account.</p>
              </div>
              <form className="form" onSubmit={handleSubmit}>
                <div className="form__row">
                  <label>
                    Name
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Full name"
                      required
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="partner@email.com"
                      required
                    />
                  </label>
                </div>
                <div className="form__row">
                  <label>
                    Password
                    <input
                      type="text"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Login password"
                      required
                    />
                  </label>
                </div>
                <div className="cta-row trainer-actions">
                  <button type="submit" className="primary">Add edu partner</button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
