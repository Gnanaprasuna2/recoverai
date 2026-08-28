import { useEffect, useState } from "react";
import "./index.css";

const payments = [
  {
    id: "PAY-10482",
    customer: "Arjun Mehta",
    amount: 2499,
    reason: "Insufficient funds",
    score: 86,
    action: "Retry in 6 hours",
    status: "Recoverable",
  },
  {
    id: "PAY-10479",
    customer: "Priya Sharma",
    amount: 4999,
    reason: "Card expired",
    score: 94,
    action: "Send payment update link",
    status: "High Priority",
  },
  {
    id: "PAY-10471",
    customer: "Rahul Verma",
    amount: 1299,
    reason: "Bank timeout",
    score: 71,
    action: "Retry immediately",
    status: "Recoverable",
  },
  {
    id: "PAY-10463",
    customer: "Sneha Rao",
    amount: 7999,
    reason: "Payment declined",
    score: 42,
    action: "Customer outreach",
    status: "At Risk",
  },
];

function App() {
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [recovered, setRecovered] = useState(184750);
  const [recoveryExecuted, setRecoveryExecuted] = useState(false);

  const [backendPayments, setBackendPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([
    {
      message: "RecoverAI monitoring started",
      detail: "Payment events are being monitored",
      amount: null,
    },
  ]);
  const [paymentsRecovered, setPaymentsRecovered] = useState(1284);
  const [notification, setNotification] = useState(null);
  const [activeNav, setActiveNav] = useState("Dashboard");

  const handleNavClick = (item) => {
    setActiveNav(item);

    const sectionMap = {
      Dashboard: "dashboard-top",
      "Recovery Queue": "recovery-queue",
      "AI Decisions": "ai-decisions",
      Analytics: "analytics",
    };

    const targetId = sectionMap[item];

    if (targetId) {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    if (item === "Customers") {
      setNotification({
        type: "info",
        message: "Customers view is ready for the next dashboard module.",
      });
    }

    if (item === "Settings") {
      setNotification({
        type: "info",
        message: "Settings view is ready for configuration options.",
      });
    }
  };

  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      setNotification(null);
    }, 4500);

    return () => clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/payments")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not connect to backend");
        }
        return response.json();
      })
      .then((data) => {
        setBackendPayments(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Backend connection failed:", error);
        setLoading(false);
      });
  }, []);

  const recoverPayment = async (payment) => {
    try {
      setNotification({
        type: "info",
        message: "RecoverAI is analyzing the payment...",
      });

      const response = await fetch("http://127.0.0.1:8000/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: payment.id,
          customer: payment.customer,
          amount: payment.amount,
          reason: payment.reason,
        }),
      });

      if (!response.ok) {
        throw new Error("AI analysis failed");
      }

      const data = await response.json();

      const analyzedPayment = {
        ...payment,
        aiDecision: data.decision,
      };

      setSelectedPayment(analyzedPayment);
      setRecoveryExecuted(false);

      setActivities((current) => [
        {
          message: "AI recovery decision generated",
          detail: `${payment.customer} • Score ${data.decision.recovery_score}%`,
          amount: payment.amount,
        },
        ...current,
      ]);

      setNotification({
        type: "success",
        message: `AI decision ready — ${data.decision.recovery_score}% recovery probability`,
      });
    } catch (error) {
      console.error("Recovery analysis failed:", error);
      setNotification({
        type: "error",
        message: "Could not connect to the RecoverAI backend.",
      });
    }
  };

  const executeRecovery = () => {
    if (!selectedPayment || recoveryExecuted) return;

    const action =
      selectedPayment.aiDecision?.recommended_action ||
      selectedPayment.recommended_action ||
      selectedPayment.action ||
      "Recovery action";

    setRecovered((value) => value + selectedPayment.amount);
    setPaymentsRecovered((value) => value + 1);
    setRecoveryExecuted(true);

    setActivities((current) => [
      {
        message: "Recovery executed",
        detail: `${selectedPayment.customer} • ${action}`,
        amount: selectedPayment.amount,
      },
      ...current,
    ]);

    setNotification({
      type: "success",
      message: `₹${selectedPayment.amount.toLocaleString("en-IN")} recovered successfully`,
    });
  };

  const simulatePaymentFailure = async () => {
    const payment = {
      id: `PAY-${Date.now()}`,
      customer: "Demo Customer",
      amount: 3499,
      reason: "Insufficient funds",
    };

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/payment-failed",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payment),
        }
      );

      if (!response.ok) {
        throw new Error("Payment failure event failed");
      }

      const paymentsResponse = await fetch(
        "http://127.0.0.1:8000/api/payments"
      );

      if (!paymentsResponse.ok) {
        throw new Error("Could not refresh payments");
      }

      const updatedPayments = await paymentsResponse.json();

      setBackendPayments(updatedPayments);

      setActivities((current) => [
        {
          message: "Payment failure detected",
          detail: `${payment.customer} • ${payment.reason}`,
          amount: payment.amount,
        },
        ...current,
      ]);

      setNotification({
        type: "success",
        message: "Payment failure detected and added to Recovery Queue",
      });
    } catch (error) {
      console.error(error);
      setNotification({
        type: "error",
        message: "Could not connect to the RecoverAI backend.",
      });
    }
  };

  const simulateRazorpayEvent = async () => {
    const event = {
      payment_id: `pay_${Date.now()}`,
      customer: "Razorpay Demo Customer",
      amount: 5999,
      failure_reason: "Card expired",
    };

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/webhook/razorpay",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        throw new Error("Razorpay webhook failed");
      }

      const data = await response.json();

      const paymentsResponse = await fetch(
        "http://127.0.0.1:8000/api/payments"
      );

      if (!paymentsResponse.ok) {
        throw new Error("Could not refresh payments");
      }

      const updatedPayments = await paymentsResponse.json();

      setBackendPayments(updatedPayments);

      setActivities((current) => [
        {
          message: "Razorpay payment.failed received",
          detail: `${event.customer} • ${event.failure_reason} • AI score ${data.recovery_decision.recovery_score}%`,
          amount: event.amount,
        },
        ...current,
      ]);

      setNotification({
        type: "success",
        message: `Razorpay event received — ${data.recovery_decision.recovery_score}% recovery probability`,
      });
    } catch (error) {
      console.error("Razorpay event failed:", error);
      setNotification({
        type: "error",
        message: "Could not connect to the RecoverAI backend.",
      });
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">R</div>
          <div>
            <h1>RecoverAI</h1>
            <span>Revenue Intelligence</span>
          </div>
        </div>

        <nav>
          {[
            ["⌂", "Dashboard"],
            ["↻", "Recovery Queue"],
            ["◉", "AI Decisions"],
            ["▣", "Customers"],
            ["◫", "Analytics"],
            ["⚙", "Settings"],
          ].map(([icon, label]) => (
            <div
              key={label}
              className={`nav-item ${activeNav === label ? "active" : ""}`}
              onClick={() => handleNavClick(label)}
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer" }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  handleNavClick(label);
                }
              }}
            >
              {icon} {label}
            </div>
          ))}
        </nav>

        <div className="agent-card">
          <div className="agent-status">
            <span></span>
            AI Agent Online
          </div>

          <p>
            RecoverAI is monitoring payment events and optimizing recovery
            actions automatically.
          </p>
        </div>
      </aside>

      <main className="main">
        <header id="dashboard-top" className="topbar">
  <div>
    <div className="eyebrow">AI REVENUE RECOVERY</div>
    <h2>Revenue Recovery Command Center</h2>
    <p className="subtitle">
      Recover failed payments before they become lost revenue.
    </p>
  </div>

  <div>
    <button
      className="recover-button"
      onClick={simulatePaymentFailure}
      style={{
        marginBottom: "10px",
        padding: "10px 14px",
        fontSize: "11px"
      }}
    >
      Simulate Payment Failure
    </button>
    <button
  className="recover-button"
  onClick={simulateRazorpayEvent}
  style={{
    marginBottom: "10px",
    padding: "10px 14px",
    fontSize: "11px",
    width: "100%",
  }}
>
  ⚡ Simulate Razorpay Event
</button>

    <div className="live">
      <span></span>
      Live
    </div>
  </div>
</header>

        {notification && (
          <div
            style={{
              marginBottom: "18px",
              padding: "12px 16px",
              borderRadius: "10px",
              background:
                notification.type === "error"
                  ? "#fef2f2"
                  : notification.type === "info"
                  ? "#eff6ff"
                  : "#ecfdf3",
              border:
                notification.type === "error"
                  ? "1px solid #fecaca"
                  : notification.type === "info"
                  ? "1px solid #bfdbfe"
                  : "1px solid #bbf7d0",
              color:
                notification.type === "error"
                  ? "#991b1b"
                  : notification.type === "info"
                  ? "#1d4ed8"
                  : "#166534",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            {notification.type === "success" ? "✓ " : ""}
            {notification.message}
          </div>
        )}

        <section className="stats">
          <div className="stat-card highlight">
            <div className="stat-label">Revenue Recovered</div>

            <div className="stat-value">
              ₹{recovered.toLocaleString()}
            </div>

            <div className="stat-change">
              ↑ 18.4% this month
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Recovery Rate</div>

            <div className="stat-value">73.8%</div>

            <div className="stat-change">
              ↑ 6.2% vs last month
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Payments Recovered</div>

            <div className="stat-value">
              {paymentsRecovered.toLocaleString("en-IN")}
            </div>

            <div className="stat-change">
              ↑ 14.7% this month
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">At-Risk Revenue</div>

            <div className="stat-value">₹72,430</div>

            <div className="stat-change warning">
              342 payments pending
            </div>
          </div>
        </section>

        <section className="content-grid">
          <div id="recovery-queue" className="panel recovery-panel">
            <div className="panel-header">
              <div>
                <h3>AI Recovery Queue</h3>

                <p>
                  Payments prioritized by recovery probability
                </p>
              </div>

              <button className="view-button">
                View all
              </button>
            </div>

            <div className="table">
              <div className="table-head">
                <span>Payment</span>
                <span>Customer</span>
                <span>Amount</span>
                <span>AI Score</span>
                <span>Action</span>
              </div>

              {(backendPayments.length > 0
                ? backendPayments
                : payments
              ).map((payment) => (
                <div className="table-row" key={payment.id}>
                  <div>
                    <strong>{payment.id}</strong>

                    <small>{payment.reason}</small>
                  </div>

                  <span>{payment.customer}</span>

                  <strong>
                    ₹{payment.amount.toLocaleString()}
                  </strong>

                  <div className="score">
                    <div className="score-bar">
                      <div
                        style={{
                          width: `${payment.score}%`,
                        }}
                      ></div>
                    </div>

                    <span>{payment.score}%</span>
                  </div>

                  <button
                    className="recover-button"
                    onClick={() => recoverPayment(payment)}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Analyze"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div id="ai-decisions" className="panel ai-panel">
            <div className="panel-header">
              <div>
                <h3>AI Decision Engine</h3>

                <p>Latest autonomous decision</p>
              </div>

              <div className="ai-badge">
                AI
              </div>
            </div>

            {selectedPayment ? (
              <div className="decision">
                <div className="decision-icon">
                  ✓
                </div>

                <h4>
                  Recovery strategy selected
                </h4>

                <p>
                  RecoverAI analyzed{" "}
                  <strong>
                    {selectedPayment.customer}
                  </strong>
                  's failed payment and selected the most appropriate
                  recovery strategy.
                </p>

                <div className="decision-box">
                  <span>Payment</span>

                  <strong>
                    {selectedPayment.id}
                  </strong>
                </div>

                <div className="decision-box">
                  <span>Recommended action</span>

                  <strong>
                    {selectedPayment.aiDecision
                      ?.recommended_action ||
                      selectedPayment.action}
                  </strong>
                </div>

                <div className="decision-box">
                  <span>Recovery probability</span>

                  <strong>
                    {selectedPayment.aiDecision
                      ?.recovery_score ||
                      selectedPayment.score}
                    %
                  </strong>
                </div>

                <div className="decision-box">
                  <span>Strategy</span>

                  <strong>
                    {selectedPayment.aiDecision
                      ?.strategy ||
                      "Recovery strategy"}
                  </strong>
                </div>

                <div className="decision-box">
                  <span>Priority</span>

                  <strong>
                    {selectedPayment.aiDecision
                      ?.priority ||
                      selectedPayment.status}
                  </strong>
                </div>

                <div className="decision-explanation">
                  <small>AI reasoning</small>

                  <p>
                    {selectedPayment.aiDecision
                      ?.explanation ||
                      "RecoverAI selected this action based on the payment failure context."}
                  </p>
                </div>

                {!recoveryExecuted ? (
  <button
    className="recover-button execute-button"
    onClick={executeRecovery}
  >
    Execute Recovery
  </button>
) : (
  <div className="recovery-success">
    <div className="success-icon">✓</div>

    <strong>Payment Recovery Simulated</strong>

    <p>
      ₹{selectedPayment.amount.toLocaleString()} has been
      successfully recovered.
    </p>
  </div>
)}

<button
  className="reset-button"
  onClick={() => {
    setSelectedPayment(null);
    setRecoveryExecuted(false);
  }}
>
  Analyze another payment
</button>
              </div>
            ) : (
              <div className="empty-decision">
                <div className="brain">
                  ✦
                </div>

                <h4>
                  AI is ready
                </h4>

                <p>
                  Select a payment from the recovery queue
                  to let RecoverAI analyze the failure and
                  recommend a recovery strategy.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="bottom-grid">
          <div id="analytics" className="panel">
            <div className="panel-header">
              <div>
                <h3>Recovery Performance</h3>

                <p>Last 7 days</p>
              </div>
            </div>

            <div className="chart">
              <div className="chart-bars">
                {[42, 58, 51, 76, 63, 88, 96].map(
                  (height, index) => (
                    <div
                      className="bar-container"
                      key={index}
                    >
                      <div
                        className="bar"
                        style={{
                          height: `${height}%`,
                        }}
                      ></div>

                      <small>
                        {
                          [
                            "Mon",
                            "Tue",
                            "Wed",
                            "Thu",
                            "Fri",
                            "Sat",
                            "Sun",
                          ][index]
                        }
                      </small>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="panel activity">
            <div className="panel-header">
              <div>
                <h3>AI Activity</h3>

                <p>
                  Real-time recovery actions
                </p>
              </div>
            </div>

            <div className="activity-list">
              {activities.slice(0, 5).map((activity, index) => (
                <div className="activity-item" key={index}>
                  <div className="activity-dot"></div>

                  <div>
                    <strong>{activity.message}</strong>

                    <small>{activity.detail}</small>
                  </div>

                  {activity.amount !== null && (
                    <b>
                      ₹{activity.amount.toLocaleString("en-IN")}
                    </b>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;