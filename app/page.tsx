"use client";

import { useMemo, useState } from "react";

type Answer = "Tightened considerably" | "Tightened somewhat" | "Unchanged" | "Eased somewhat" | "Eased considerably";

const scale: Answer[] = [
  "Tightened considerably",
  "Tightened somewhat",
  "Unchanged",
  "Eased somewhat",
  "Eased considerably",
];

const questions = [
  {
    id: "E1",
    section: "Credit standards",
    title: "Enterprise credit standards",
    prompt:
      "Over the past three months, how have your bank’s credit standards for approving loans or credit lines to enterprises changed?",
    rows: ["Overall", "Microenterprises", "Small and medium-sized enterprises", "Large enterprises"],
  },
  {
    id: "E2",
    section: "Terms & conditions",
    title: "Foreign-currency lending",
    prompt:
      "How have your bank’s standards for foreign-currency loans to enterprises changed during the past three months?",
    rows: ["FX loans to naturally hedged borrowers", "FX loans to other borrowers"],
  },
  {
    id: "E3",
    section: "Loan demand",
    title: "Enterprise loan demand",
    prompt:
      "How has demand for loans from enterprises changed, apart from normal seasonal fluctuations?",
    rows: ["Working capital", "Fixed investment", "Export finance", "Debt refinancing"],
  },
];

const bankRows = [
  { name: "National Bank of Uzbekistan", status: "Accepted", progress: 100, coverage: "18.6%", submitted: "08 Jul, 14:32" },
  { name: "Uzpromstroybank", status: "Submitted", progress: 100, coverage: "13.2%", submitted: "09 Jul, 10:18" },
  { name: "Asakabank", status: "Clarification", progress: 100, coverage: "10.9%", submitted: "08 Jul, 16:44" },
  { name: "Ipoteka Bank", status: "In review", progress: 86, coverage: "8.7%", submitted: "—" },
  { name: "Kapitalbank", status: "In progress", progress: 64, coverage: "6.1%", submitted: "—" },
  { name: "Hamkorbank", status: "Not started", progress: 0, coverage: "4.8%", submitted: "—" },
];

export default function Home() {
  const [view, setView] = useState<"bank" | "cbu">("bank");
  const [active, setActive] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({
    "E1-Overall": "Unchanged",
    "E1-Microenterprises": "Tightened somewhat",
    "E1-Small and medium-sized enterprises": "Unchanged",
  });
  const [notice, setNotice] = useState("Draft saved automatically at 10:42");
  const [filter, setFilter] = useState("All banks");

  const answered = Object.keys(answers).length;
  const total = questions.reduce((sum, item) => sum + item.rows.length, 0);
  const progress = Math.round((answered / total) * 100);
  const current = questions[active];

  const filteredBanks = useMemo(() => {
    if (filter === "All banks") return bankRows;
    if (filter === "Needs attention") return bankRows.filter((bank) => ["Clarification", "Not started"].includes(bank.status));
    return bankRows.filter((bank) => ["Accepted", "Submitted"].includes(bank.status));
  }, [filter]);

  function choose(questionId: string, row: string, value: Answer) {
    setAnswers((previous) => ({ ...previous, [`${questionId}-${row}`]: value }));
    setNotice("Changes saved");
  }

  function validate() {
    const missing = current.rows.filter((row) => !answers[`${current.id}-${row}`]).length;
    setNotice(missing ? `${missing} response${missing > 1 ? "s are" : " is"} required in this section` : "Section passed all validation checks");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">CBU</div>
          <div>
            <strong>Bank Lending Survey</strong>
            <span>Central Bank of Uzbekistan</span>
          </div>
        </div>
        <div className="view-switch" aria-label="Demo role">
          <button className={view === "bank" ? "active" : ""} onClick={() => setView("bank")}>Bank respondent</button>
          <button className={view === "cbu" ? "active" : ""} onClick={() => setView("cbu")}>CBU monitoring</button>
        </div>
        <div className="user">
          <span className="avatar">AT</span>
          <span><strong>Aziza T.</strong><small>{view === "bank" ? "Authorised approver" : "Survey manager"}</small></span>
        </div>
      </header>

      {view === "bank" ? (
        <div className="workspace">
          <aside className="sidebar">
            <div className="round-label">ACTIVE SURVEY</div>
            <h2>2026 Q2</h2>
            <p>Reference period: April–June 2026</p>
            <div className="progress-copy"><span>Overall completion</span><strong>{progress}%</strong></div>
            <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>

            <nav aria-label="Survey sections">
              {questions.map((question, index) => {
                const complete = question.rows.every((row) => answers[`${question.id}-${row}`]);
                return (
                  <button key={question.id} className={active === index ? "selected" : ""} onClick={() => setActive(index)}>
                    <span className={complete ? "step complete" : "step"}>{complete ? "✓" : index + 1}</span>
                    <span><strong>{question.section}</strong><small>{complete ? "Complete" : `${question.rows.filter((row) => answers[`${question.id}-${row}`]).length}/${question.rows.length} answered`}</small></span>
                  </button>
                );
              })}
              <button>
                <span className="step">4</span>
                <span><strong>Review & submit</strong><small>Pending</small></span>
              </button>
            </nav>

            <div className="deadline">
              <span>Submission deadline</span>
              <strong>12 July 2026 · 18:00</strong>
              <small>3 business days remaining</small>
            </div>
          </aside>

          <section className="content">
            <div className="content-head">
              <div>
                <span className="eyebrow">SECTION {active + 1} OF 4</span>
                <h1>{current.title}</h1>
                <p>{current.prompt}</p>
              </div>
              <button className="help-button" onClick={() => setNotice("Guidance opened: report marginal changes, not the level of standards.")}>? Guidance</button>
            </div>

            <div className="question-card">
              <div className="question-note">
                <strong>{current.id}</strong>
                <span>Select one response for each applicable lending segment.</span>
                <span className="required">Required</span>
              </div>
              <div className="matrix" role="group" aria-label={current.title}>
                <div className="matrix-header">
                  <span>Lending segment</span>
                  {scale.map((option) => <span key={option}>{option.replace(" considerably", " considerably").replace(" somewhat", " somewhat")}</span>)}
                </div>
                {current.rows.map((row) => (
                  <div className="matrix-row" key={row}>
                    <strong>{row}</strong>
                    {scale.map((option) => (
                      <label key={option} aria-label={`${row}: ${option}`}>
                        <input
                          type="radio"
                          name={`${current.id}-${row}`}
                          checked={answers[`${current.id}-${row}`] === option}
                          onChange={() => choose(current.id, row, option)}
                        />
                        <span />
                      </label>
                    ))}
                  </div>
                ))}
              </div>
              <label className="comment-label" htmlFor="comment">Optional explanation for significant changes</label>
              <textarea id="comment" rows={3} placeholder="Add context for the CBU analyst…" onChange={() => setNotice("Comment saved")} />
            </div>

            <div className={`status-line ${notice.includes("required") ? "warning" : ""}`} role="status">
              <span>{notice.includes("required") ? "!" : "✓"}</span>{notice}
            </div>
            <div className="actions">
              <button className="secondary" onClick={validate}>Validate section</button>
              <div>
                <button className="ghost" disabled={active === 0} onClick={() => setActive((value) => Math.max(0, value - 1))}>Previous</button>
                <button className="primary" onClick={() => active < questions.length - 1 ? setActive(active + 1) : setNotice("Review opened. Complete missing answers before submission.")}>
                  {active < questions.length - 1 ? "Save & continue" : "Review submission"} <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <section className="dashboard">
          <div className="dashboard-head">
            <div>
              <span className="eyebrow">2026 Q2 · COLLECTION WINDOW</span>
              <h1>Survey operations</h1>
              <p>Monitor responses, market coverage and validation activity.</p>
            </div>
            <button className="primary" onClick={() => setNotice("Reminder queued for 2 institutions")}>Send reminders</button>
          </div>

          <div className="metrics">
            <article><span>Responses submitted</span><strong>18 / 24</strong><small>75% of invited banks</small></article>
            <article><span>Loan-market coverage</span><strong>88.4%</strong><small>Target: at least 90%</small></article>
            <article><span>Needs attention</span><strong>3</strong><small>1 clarification · 2 not started</small></article>
            <article><span>Time remaining</span><strong>3 days</strong><small>Closes 12 July at 18:00</small></article>
          </div>

          <div className="dashboard-grid">
            <article className="panel coverage-panel">
              <div className="panel-head"><div><h2>Collection progress</h2><p>Share of participating institutions</p></div><span className="live-dot">Live</span></div>
              <div className="funnel">
                <div><span style={{ width: "100%" }} /><strong>24</strong><small>Invited</small></div>
                <div><span style={{ width: "83%" }} /><strong>20</strong><small>Started</small></div>
                <div><span style={{ width: "75%" }} /><strong>18</strong><small>Submitted</small></div>
                <div><span style={{ width: "54%" }} /><strong>13</strong><small>Accepted</small></div>
              </div>
            </article>
            <article className="panel activity-panel">
              <div className="panel-head"><div><h2>Recent activity</h2><p>Latest workflow events</p></div></div>
              <ul>
                <li><span className="activity-icon accepted">✓</span><div><strong>National Bank response accepted</strong><small>Today · 11:26</small></div></li>
                <li><span className="activity-icon submitted">↑</span><div><strong>Uzpromstroybank submitted</strong><small>Today · 10:18</small></div></li>
                <li><span className="activity-icon clarification">?</span><div><strong>Clarification sent to Asakabank</strong><small>Yesterday · 16:52</small></div></li>
              </ul>
            </article>
          </div>

          <article className="panel bank-table-panel">
            <div className="panel-head">
              <div><h2>Participating institutions</h2><p>Current response and validation status</p></div>
              <div className="filter-buttons">
                {["All banks", "Needs attention", "Submitted"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Institution</th><th>Status</th><th>Completion</th><th>Market coverage</th><th>Submitted</th><th /></tr></thead>
                <tbody>
                  {filteredBanks.map((bank) => (
                    <tr key={bank.name}>
                      <td><strong>{bank.name}</strong></td>
                      <td><span className={`status ${bank.status.toLowerCase().replace(" ", "-")}`}>{bank.status}</span></td>
                      <td><div className="mini-progress"><span style={{ width: `${bank.progress}%` }} /></div><small>{bank.progress}%</small></td>
                      <td>{bank.coverage}</td>
                      <td>{bank.submitted}</td>
                      <td><button className="row-action" aria-label={`Open ${bank.name}`} onClick={() => setNotice(`${bank.name} record opened`)}>•••</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}
    </main>
  );
}
