export default function ApprovalsTab({ approvalEmail, pendingAccountRequests, handleApproveAccountRequest }) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Approvals</p>
          <h2>Pending account approvals</h2>
        </div>
      </div>
      <section className="schedule-box">
        <div className="section-heading">
          <h3>Approval Queue</h3>
          <p className="muted">New account requests are sent to {approvalEmail}. Approve them here to send the approval email and unlock login.</p>
        </div>
        {pendingAccountRequests.length > 0 ? (
          <div className="trainer-session-list">
            {pendingAccountRequests.map((request) => (
              <div key={request.id} className="trainer-session-card">
                <div>
                  <p className="eyebrow">{request.role}</p>
                  <h4>{request.name}</h4>
                  <p className="muted">{request.email}</p>
                </div>
                <div className="pill-row">
                  <span className="pill compact warning">Pending approval</span>
                  <button type="button" className="primary" onClick={() => handleApproveAccountRequest(request.id)}>
                    Approve request
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No pending account requests.</p>
        )}
      </section>
    </section>
  );
}
