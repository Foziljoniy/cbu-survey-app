"use client";

import { useEffect, useMemo, useState } from "react";
import { answerKey, responseScales, surveyQuestions, totalAnswerItems, type SurveyQuestion } from "./data/survey";
import { bankUsers, managerUser, type SessionUser } from "./data/users";

type Answers = Record<string, string>;

type Submission = {
  id: string;
  bank_id: string;
  bank_name: string;
  survey_source: "ECB Core" | "Uzbekistan Module";
  respondent_name: string;
  answered_items: number;
  total_items: number;
  completion: number;
  submitted_at: string;
  updated_at: string;
  answers: Answers;
};

const totalItems = totalAnswerItems();
const surveyParts = [
  { source: "ECB Core" as const, label: "ECB core survey", shortLabel: "ECB Core" },
  { source: "Uzbekistan Module" as const, label: "Uzbekistan module", shortLabel: "Uzbekistan Module" },
];

const numericScaleValues: Record<string, number> = {
  "-2": -2,
  "-1": -1,
  "0": 0,
  "+1": 1,
  "+2": 2,
  "1": -2,
  "2": -1,
  "3": 0,
  "4": 1,
  "5": 2,
};

function getQuestionKeys(question: SurveyQuestion) {
  return question.rows.flatMap((row) => question.columns.map((column) => answerKey(question.id, row, column)));
}

function answeredCount(answers: Answers) {
  return Object.values(answers).filter((value) => value.trim().length > 0).length;
}

function questionAnsweredCount(question: SurveyQuestion, answers: Answers) {
  return getQuestionKeys(question).filter((key) => answers[key]?.trim()).length;
}

function answerLabel(question: SurveyQuestion, value: string) {
  if (question.scale === "TEXT") return value;
  return responseScales[question.scale].find((option) => option.code === value)?.label ?? value;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildAnswersForSurvey(source: Submission["survey_source"], seed: number) {
  const answers: Answers = {};

  for (const question of surveyQuestions.filter((item) => item.source === source)) {
    const options = responseScales[question.scale];
    for (let rowIndex = 0; rowIndex < question.rows.length; rowIndex++) {
      for (let colIndex = 0; colIndex < question.columns.length; colIndex++) {
        const key = answerKey(question.id, question.rows[rowIndex], question.columns[colIndex]);
        if (question.scale === "TEXT") {
          answers[key] = seed % 2 === 0
            ? "Borrower demand remains resilient, but funding costs and collateral quality require close monitoring."
            : "No additional issues beyond the quantitative responses.";
          continue;
        }

        const usableOptions = options.filter((option) => option.code !== "9" && option.code !== "NA");
        const base = Math.abs(seed + rowIndex * 2 + colIndex * 3 + question.id.length) % usableOptions.length;
        const neutralBias = (seed + rowIndex + colIndex) % 5 === 0 ? usableOptions.findIndex((option) => option.code === "3" || option.code === "0") : -1;
        answers[key] = usableOptions[neutralBias >= 0 ? neutralBias : base].code;
      }
    }
  }

  return answers;
}

function countItemsForSurvey(source: Submission["survey_source"]) {
  return surveyQuestions
    .filter((question) => question.source === source)
    .reduce((sum, question) => sum + question.rows.length * question.columns.length, 0);
}

function createDemoSubmissions() {
  const demoBanks = bankUsers.slice(0, 7);
  const submittedPairs = [
    ["nbu", "ECB Core"],
    ["nbu", "Uzbekistan Module"],
    ["uzpsb", "ECB Core"],
    ["uzpsb", "Uzbekistan Module"],
    ["asaka", "ECB Core"],
    ["ipoteka", "ECB Core"],
    ["kapital", "Uzbekistan Module"],
    ["hamkor", "ECB Core"],
    ["agrobank", "ECB Core"],
    ["agrobank", "Uzbekistan Module"],
  ] as const;

  return submittedPairs.flatMap(([bankId, source], index) => {
    const bank = demoBanks.find((item) => item.bankId === bankId);
    if (!bank) return [];

    const answers = buildAnswersForSurvey(source, index + 3);
    const total = countItemsForSurvey(source);
    const completion = index % 4 === 0 ? 94 : 100;
    const answeredItems = Math.round((total * completion) / 100);
    const timestamp = new Date(Date.UTC(2026, 6, 30, 7 + index, (index * 11) % 60)).toISOString();

    return [{
      id: `${bank.bankId}:${source}`,
      bank_id: bank.bankId,
      bank_name: bank.bankName,
      survey_source: source,
      respondent_name: bank.name,
      answered_items: answeredItems,
      total_items: total,
      completion,
      submitted_at: timestamp,
      updated_at: timestamp,
      answers,
    } satisfies Submission];
  });
}

export default function Home() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [username, setUsername] = useState(bankUsers[0].username);
  const [password, setPassword] = useState(bankUsers[0].password);
  const [activePart, setActivePart] = useState<(typeof surveyParts)[number]["source"]>("ECB Core");
  const [surveyChosen, setSurveyChosen] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [notice, setNotice] = useState("Sign in to begin the survey.");
  const [busy, setBusy] = useState(false);

  const activePartQuestions = surveyQuestions.filter((question) => question.source === activePart);
  const currentQuestion = activePartQuestions[activeQuestion] ?? activePartQuestions[0];
  const completion = Math.round((answeredCount(answers) / totalItems) * 100);
  const activePartKeys = activePartQuestions.flatMap(getQuestionKeys);
  const activePartAnswered = activePartKeys.filter((key) => answers[key]?.trim()).length;
  const activePartCompletion = Math.round((activePartAnswered / activePartKeys.length) * 100);
  const questionProgress = questionAnsweredCount(currentQuestion, answers);
  const dashboardSubmissions = useMemo(() => {
    if (!demoMode) return submissions;
    const merged = new Map(createDemoSubmissions().map((submission) => [submission.id, submission]));
    for (const submission of submissions) {
      merged.set(submission.id, submission);
    }
    return Array.from(merged.values()).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [demoMode, submissions]);
  const selectedSubmission = dashboardSubmissions.find((submission) => submission.id === selectedBankId) ?? dashboardSubmissions[0];

  const managerStats = useMemo(() => {
    const expected = bankUsers.length * surveyParts.length;
    const complete = dashboardSubmissions.filter((submission) => submission.completion === 100).length;
    const averageCompletion = dashboardSubmissions.length
      ? Math.round(dashboardSubmissions.reduce((sum, submission) => sum + submission.completion, 0) / dashboardSubmissions.length)
      : 0;

    const scoredValues = dashboardSubmissions.flatMap((submission) =>
      Object.values(submission.answers)
        .map((value) => numericScaleValues[value])
        .filter((value): value is number => typeof value === "number")
    );
    const signal = scoredValues.length
      ? Number((scoredValues.reduce((sum, value) => sum + value, 0) / scoredValues.length).toFixed(2))
      : 0;

    const ecbSubmitted = dashboardSubmissions.filter((submission) => submission.survey_source === "ECB Core").length;
    const uzSubmitted = dashboardSubmissions.filter((submission) => submission.survey_source === "Uzbekistan Module").length;

    const bankProgress = bankUsers.map((bank) => {
      const bankSubmissions = dashboardSubmissions.filter((submission) => submission.bank_id === bank.bankId);
      const completionAverage = bankSubmissions.length
        ? Math.round(bankSubmissions.reduce((sum, submission) => sum + submission.completion, 0) / surveyParts.length)
        : 0;
      return { bankName: bank.bankName, submitted: bankSubmissions.length, completionAverage };
    });

    const responseMix = ["Tightened/lower", "Neutral", "Eased/higher"].map((label) => ({ label, count: 0 }));
    for (const value of scoredValues) {
      if (value < 0) responseMix[0].count += 1;
      else if (value === 0) responseMix[1].count += 1;
      else responseMix[2].count += 1;
    }

    return {
      expected,
      complete,
      averageCompletion,
      signal,
      ecbSubmitted,
      uzSubmitted,
      bankProgress,
      responseMix,
      scoredTotal: scoredValues.length,
    };
  }, [dashboardSubmissions]);

  const sourceStats = useMemo(() => {
    return surveyParts.map(({ source, label }) => {
      const questions = surveyQuestions.filter((question) => question.source === source);
      return { source, label, questionCount: questions.length };
    });
  }, []);

  useEffect(() => {
    const rawSession = window.localStorage.getItem("cbu-session");
    if (rawSession) {
      const parsed = JSON.parse(rawSession) as SessionUser;
      setSession(parsed);
      void loadSubmissions(parsed);
    }
  }, []);

  useEffect(() => {
    if (!session || session.role !== "bank") return;
    window.localStorage.setItem(`cbu-draft-${session.bankId}`, JSON.stringify(answers));
  }, [answers, session]);

  async function loadSubmissions(activeSession: SessionUser) {
    const response = await fetch("/api/submissions", {
      headers: { authorization: `Bearer ${activeSession.token}` },
    });
    const payload = await response.json();

    if (!response.ok) {
      setNotice(payload.error ?? "Unable to load survey data.");
      return;
    }

    if (activeSession.role === "manager") {
      const managerSubmissions = (payload.submissions ?? []) as Submission[];
      setSubmissions(managerSubmissions);
      setSelectedBankId(managerSubmissions[0]?.id ?? "");
      setNotice(managerSubmissions.length ? "Manager results loaded." : "No bank has submitted a survey yet.");
      return;
    }

    const savedSubmissions = (payload.submissions ?? []) as Submission[];
    const draft = window.localStorage.getItem(`cbu-draft-${activeSession.bankId}`);
    const savedAnswers = savedSubmissions.reduce<Answers>((merged, submission) => ({ ...merged, ...submission.answers }), {});
    setAnswers({ ...savedAnswers, ...(draft ? (JSON.parse(draft) as Answers) : {}) });
    setSurveyChosen(false);
    setNotice(savedSubmissions.length ? "Choose which survey you want to continue." : "Choose which survey you want to fill.");
  }

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("Signing in...");

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const payload = await response.json();
    setBusy(false);

    if (!response.ok) {
      setNotice(payload.error ?? "Sign-in failed.");
      return;
    }

    const nextSession = payload.session as SessionUser;
    window.localStorage.setItem("cbu-session", JSON.stringify(nextSession));
    setSession(nextSession);
    setAnswers({});
    setSurveyChosen(false);
    await loadSubmissions(nextSession);
  }

  function signOut() {
    window.localStorage.removeItem("cbu-session");
    setSession(null);
    setAnswers({});
    setSurveyChosen(false);
    setSubmissions([]);
    setSelectedBankId("");
    setNotice("Signed out.");
  }

  function generateDemoData() {
    const demo = createDemoSubmissions();
    setDemoMode(true);
    setSelectedBankId((current) => current || demo[0]?.id || "");
    setNotice("Demo data generated for multiple banks and both survey types.");
  }

  function updateAnswer(key: string, value: string) {
    setAnswers((current) => ({ ...current, [key]: value }));
    setNotice("Draft saved on this computer.");
  }

  function markCurrentQuestionNoInformation() {
    const next = { ...answers };
    const noInformationValue = currentQuestion.scale === "TEXT"
      ? "I don't have information about this topic."
      : responseScales[currentQuestion.scale].find((option) => option.code === "9" || option.code === "NA")?.code;

    if (!noInformationValue) return;

    let marked = 0;
    for (const key of getQuestionKeys(currentQuestion)) {
      if (!next[key]?.trim()) {
        next[key] = noInformationValue;
        marked += 1;
      }
    }

    setAnswers(next);
    setNotice(marked
      ? `${marked} unanswered response item${marked === 1 ? " was" : "s were"} marked as no information available.`
      : "This question already has a response for every item.");
  }

  function validateCurrent() {
    const missing = getQuestionKeys(currentQuestion).filter((key) => !answers[key]?.trim()).length;
    setNotice(missing ? `${missing} response item${missing === 1 ? "" : "s"} still missing in this question.` : "This question is complete.");
  }

  function choosePart(source: (typeof surveyParts)[number]["source"]) {
    setActivePart(source);
    setSurveyChosen(true);
    setActiveQuestion(0);
    setNotice(`${surveyParts.find((part) => part.source === source)?.label} opened.`);
  }

  function continueOrSubmit() {
    if (activeQuestion < activePartQuestions.length - 1) {
      setActiveQuestion((value) => value + 1);
      return;
    }

    void submitSurvey();
  }

  function goPrevious() {
    if (activeQuestion > 0) {
      setActiveQuestion((value) => value - 1);
    }
  }

  async function submitSurvey() {
    if (!session || session.role !== "bank") return;
    setBusy(true);
    setNotice("Submitting survey...");

    const response = await fetch("/api/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: session.token, answers, surveySource: activePart }),
    });
    const payload = await response.json();
    setBusy(false);

    if (!response.ok) {
      setNotice(payload.error ?? "Survey submission failed.");
      return;
    }

    setNotice(`${surveyParts.find((part) => part.source === activePart)?.label} submitted. Results are now available to the CBU survey manager.`);
    window.localStorage.removeItem(`cbu-draft-${session.bankId}`);
  }

  if (!session) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div className="brand-block">
            <img className="brand-logo" src="/cbu-logo.png" alt="Central Bank of Uzbekistan" />
            <div>
              <div className="brand-header-row">
                <span>Central Bank of Uzbekistan</span>
                <span className="credit-pill">Developed &amp; Designed by Foziljon Alisherov &amp; Anvar Jamolov · Research Dept.</span>
              </div>
              <h1>Bank Lending Survey Portal</h1>
              <p>Bank respondents complete the full ECB core and Uzbekistan survey. CBU managers review submitted results separately.</p>
            </div>
          </div>

          <form className="login-form" onSubmit={signIn}>
            <label>
              Username
              <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
            </label>
            <label>
              Password
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
            </label>
            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="credential-grid">
            <button type="button" onClick={() => { setUsername(bankUsers[0].username); setPassword(bankUsers[0].password); }}>
              <strong>Bank respondent</strong>
              <span>{bankUsers[0].username}</span>
              <small>{bankUsers[0].password}</small>
            </button>
            <button type="button" onClick={() => { setUsername(managerUser.username); setPassword(managerUser.password); }}>
              <strong>CBU manager</strong>
              <span>{managerUser.username}</span>
              <small>{managerUser.password}</small>
            </button>
          </div>

          <div className="status-line" role="status">{notice}</div>
        </section>

        <footer className="corner-attribution">
          <span>Designed &amp; Developed by</span> <strong>Foziljon Alisherov &amp; Anvar Jamolov</strong> <span>· Research Department</span>
        </footer>
      </main>
    );
  }

  if (session.role === "bank" && !surveyChosen) {
    return (
      <main className="app-shell">
        <header className="topbar">
          <div className="brand">
            <img className="brand-logo" src="/cbu-logo.png" alt="Central Bank of Uzbekistan" />
            <div>
              <strong>Bank Lending Survey</strong>
              <span>2026 Q2 collection</span>
            </div>
          </div>
          <div className="user">
            <span className="avatar">BR</span>
            <span>
              <strong>{session.name}</strong>
              <small>{session.bankName}</small>
            </span>
            <button className="secondary" onClick={signOut}>Sign out</button>
          </div>
        </header>

        <section className="survey-choice">
          <div>
            <span className="eyebrow">Choose a survey</span>
            <h1>Which survey do you want to fill?</h1>
            <p>Select one questionnaire. You can submit each survey separately and return later for the other one.</p>
          </div>

          <div className="choice-grid">
            {sourceStats.map((stat) => (
              <button key={stat.source} type="button" onClick={() => choosePart(stat.source)}>
                <span>{stat.label}</span>
                <strong>{stat.questionCount}</strong>
                <small>questions in this survey</small>
              </button>
            ))}
          </div>

          <div className="status-line" role="status">{notice}</div>
        </section>

        <footer className="corner-attribution">
          <span>Designed &amp; Developed by</span> <strong>Foziljon Alisherov &amp; Anvar Jamolov</strong> <span>· Research Department</span>
        </footer>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img className="brand-logo" src="/cbu-logo.png" alt="Central Bank of Uzbekistan" />
          <div>
            <strong>Bank Lending Survey</strong>
            <span>2026 Q2 collection</span>
          </div>
        </div>
        <div className="user">
          <span className="avatar">{session.role === "manager" ? "CM" : "BR"}</span>
          <span>
            <strong>{session.name}</strong>
            <small>{session.role === "manager" ? "Survey manager" : session.bankName}</small>
          </span>
          <button className="secondary" onClick={signOut}>Sign out</button>
        </div>
      </header>

      {session.role === "manager" ? (
        <section className="dashboard">
          <div className="dashboard-head">
            <div>
              <span className="eyebrow">Manager-only results</span>
              <h1>CBU survey manager dashboard</h1>
              <p>Submitted survey records are only returned for the manager account. Bank respondents can submit and reload their own survey only.</p>
            </div>
            <div className="dashboard-actions">
              <button className="secondary" onClick={() => loadSubmissions(session)}>Refresh</button>
              <button className="primary" onClick={generateDemoData}>Generate demo data</button>
              {demoMode ? <button className="ghost" onClick={() => setDemoMode(false)}>Hide demo data</button> : null}
            </div>
          </div>

          <div className="metrics">
            <article><span>Invited banks</span><strong>{bankUsers.length}</strong><small>Bank accounts configured</small></article>
            <article><span>Survey submissions</span><strong>{dashboardSubmissions.length}</strong><small>{Math.round((dashboardSubmissions.length / managerStats.expected) * 100)}% of bank-survey records</small></article>
            <article><span>Average completion</span><strong>{managerStats.averageCompletion}%</strong><small>{managerStats.complete} complete submissions</small></article>
            <article><span>Credit signal</span><strong>{managerStats.signal > 0 ? "+" : ""}{managerStats.signal}</strong><small>-2 tighter/lower to +2 easier/higher</small></article>
          </div>

          <div className="statistics-grid">
            <article className="panel stat-panel">
              <div className="panel-head">
                <div>
                  <h2>Submission coverage</h2>
                  <p>ECB Core and Uzbekistan Module records received</p>
                </div>
              </div>
              <div className="bar-list">
                <div>
                  <span>ECB Core</span>
                  <strong>{managerStats.ecbSubmitted}/{bankUsers.length}</strong>
                  <div><i style={{ width: `${(managerStats.ecbSubmitted / bankUsers.length) * 100}%` }} /></div>
                </div>
                <div>
                  <span>Uzbekistan Module</span>
                  <strong>{managerStats.uzSubmitted}/{bankUsers.length}</strong>
                  <div><i style={{ width: `${(managerStats.uzSubmitted / bankUsers.length) * 100}%` }} /></div>
                </div>
              </div>
            </article>

            <article className="panel stat-panel">
              <div className="panel-head">
                <div>
                  <h2>Response mix</h2>
                  <p>Numeric response distribution across submitted answers</p>
                </div>
              </div>
              <div className="bar-list">
                {managerStats.responseMix.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                    <div><i style={{ width: `${managerStats.scoredTotal ? (item.count / managerStats.scoredTotal) * 100 : 0}%` }} /></div>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel stat-panel wide">
              <div className="panel-head">
                <div>
                  <h2>Bank completion comparison</h2>
                  <p>Average completion across the two survey types</p>
                </div>
              </div>
              <div className="bank-bars">
                {managerStats.bankProgress.map((bank) => (
                  <div key={bank.bankName}>
                    <span>{bank.bankName}</span>
                    <div><i style={{ width: `${bank.completionAverage}%` }} /></div>
                    <strong>{bank.completionAverage}%</strong>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="manager-grid">
            <article className="panel">
              <div className="panel-head">
                <div>
                  <h2>Participating institutions</h2>
                  <p>Status by bank respondent account</p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Institution</th><th>Status</th><th>Completion</th><th>Updated</th></tr>
                  </thead>
                  <tbody>
                    {bankUsers.flatMap((bank) => surveyParts.map((part) => {
                      const submission = dashboardSubmissions.find((item) => item.bank_id === bank.bankId && item.survey_source === part.source);
                      return (
                        <tr key={`${bank.bankId}:${part.source}`} className={selectedSubmission?.id === submission?.id ? "selected-row" : ""} onClick={() => submission && setSelectedBankId(submission.id)}>
                          <td><strong>{bank.bankName}</strong><small>{part.label}</small></td>
                          <td><span className={`status ${submission ? "submitted" : "not-started"}`}>{submission ? "Submitted" : "Not started"}</span></td>
                          <td>{submission?.completion ?? 0}%</td>
                          <td>{formatDate(submission?.updated_at)}</td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel result-panel">
              <div className="panel-head">
                <div>
                  <h2>{selectedSubmission ? selectedSubmission.bank_name : "No submission selected"}</h2>
                  <p>{selectedSubmission ? `${selectedSubmission.survey_source}: ${selectedSubmission.answered_items}/${selectedSubmission.total_items} items submitted by ${selectedSubmission.respondent_name}` : "Submitted bank surveys will appear here."}</p>
                </div>
              </div>

              {selectedSubmission ? (
                <div className="answer-review">
                  {surveyQuestions.filter((question) => question.source === selectedSubmission.survey_source).map((question) => (
                    <details key={question.id}>
                      <summary>{question.id} - {question.title}</summary>
                      <div className="review-grid">
                        {question.rows.flatMap((row) => question.columns.map((column) => {
                          const key = answerKey(question.id, row, column);
                          return (
                            <div key={key}>
                              <span>{row}{question.columns.length > 1 ? ` / ${column}` : ""}</span>
                              <strong>{answerLabel(question, selectedSubmission.answers[key] ?? "") || "-"}</strong>
                            </div>
                          );
                        }))}
                      </div>
                    </details>
                  ))}
                  <p className="review-note">Click any question to view submitted responses. The stored submission contains all {selectedSubmission.total_items} response items for this survey.</p>
                </div>
              ) : (
                <div className="empty-state">No bank submissions yet.</div>
              )}
            </article>
          </div>

          <div className="status-line" role="status">{notice}</div>

          <footer className="corner-attribution">
            <span>Designed &amp; Developed by</span> <strong>Foziljon Alisherov &amp; Anvar Jamolov</strong> <span>· Research Department</span>
          </footer>
        </section>
      ) : (
        <div className="workspace">
          <aside className="sidebar">
            <div className="round-label">ACTIVE SURVEY</div>
            <h2>2026 Q2</h2>
            <p>{session.bankName}</p>
            <div className="progress-copy"><span>Selected survey completion</span><strong>{activePartCompletion}%</strong></div>
            <div className="progress-track"><span style={{ width: `${activePartCompletion}%` }} /></div>

            <div className="source-stats">
              {sourceStats.map((stat) => (
                <button
                  key={stat.source}
                  type="button"
                  className={activePart === stat.source ? "active" : ""}
                  onClick={() => choosePart(stat.source)}
                >
                  <span>{stat.label}</span>
                  <strong>{stat.questionCount} questions</strong>
                </button>
              ))}
            </div>

            <div className="part-heading">
              <span>{surveyParts.find((part) => part.source === activePart)?.shortLabel}</span>
              <strong>{activePartQuestions.length} questions</strong>
            </div>

            <nav aria-label={`${activePart} questions`}>
              {activePartQuestions.map((question, index) => {
                const complete = questionAnsweredCount(question, answers) === getQuestionKeys(question).length;
                return (
                  <button key={question.id} className={activeQuestion === index ? "selected" : ""} onClick={() => setActiveQuestion(index)}>
                    <span className={complete ? "step complete" : "step"}>{complete ? "OK" : index + 1}</span>
                    <span>
                      <strong>{question.id}</strong>
                      <small>{question.title}</small>
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="sidebar-credit">
              <span>Designed &amp; Developed by</span>
              <strong>Foziljon Alisherov &amp; Anvar Jamolov</strong>
              <small>Research Department</small>
            </div>
          </aside>

          <section className="content">
            <div className="content-head">
              <div>
                <span className="eyebrow">{currentQuestion.source} / {currentQuestion.section} / {currentQuestion.id}</span>
                <h1>{currentQuestion.prompt}</h1>
                <p className="question-topic"><strong>Topic:</strong> {currentQuestion.title}</p>
              </div>
              <div className="question-meter">
                <strong>{questionProgress}/{getQuestionKeys(currentQuestion).length}</strong>
                <span>items answered</span>
              </div>
            </div>

            <div className="question-card">
              <div className="question-note">
                <strong>{currentQuestion.id}</strong>
                <span>{currentQuestion.scale === "TEXT" ? "Provide the open response." : "Select one visible code for each row and column."}</span>
                <span className="required">Required</span>
              </div>

              {currentQuestion.scale === "TEXT" ? (
                <textarea
                  className="large-response"
                  rows={8}
                  value={answers[answerKey(currentQuestion.id, currentQuestion.rows[0], currentQuestion.columns[0])] ?? ""}
                  onChange={(event) => updateAnswer(answerKey(currentQuestion.id, currentQuestion.rows[0], currentQuestion.columns[0]), event.target.value)}
                  placeholder="Enter the bank's response..."
                />
              ) : currentQuestion.columns.length === 1 ? (
                <div className="simple-matrix">
                  <div
                    className="simple-matrix-header"
                    style={{ gridTemplateColumns: `minmax(210px, 1fr) repeat(${currentQuestion.rows.length}, minmax(130px, 1fr))` }}
                  >
                    <span>Answer</span>
                    {currentQuestion.rows.map((row) => <span key={row}>{row}</span>)}
                  </div>
                  {responseScales[currentQuestion.scale].map((option) => (
                    <div
                      className="simple-matrix-row"
                      key={option.code}
                      style={{ gridTemplateColumns: `minmax(210px, 1fr) repeat(${currentQuestion.rows.length}, minmax(130px, 1fr))` }}
                    >
                      <strong>{option.label}</strong>
                      {currentQuestion.rows.map((row) => {
                        const key = answerKey(currentQuestion.id, row, currentQuestion.columns[0]);
                        return (
                          <label key={row} title={`${row}: ${option.label}`}>
                            <input
                              type="radio"
                              name={key}
                              checked={answers[key] === option.code}
                              onChange={() => updateAnswer(key, option.code)}
                            />
                            <span>{option.code}</span>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="response-table">
                  <div className="scale-strip">
                    {responseScales[currentQuestion.scale].map((option) => (
                      <span key={option.code}><strong>{option.code}</strong>{option.label}</span>
                    ))}
                  </div>
                  <div className="response-header" style={{ gridTemplateColumns: `minmax(240px, 1.4fr) repeat(${currentQuestion.columns.length}, minmax(180px, 1fr))` }}>
                    <span>Category / factor / term</span>
                    {currentQuestion.columns.map((column) => <span key={column}>{column}</span>)}
                  </div>
                  {currentQuestion.rows.map((row) => (
                    <div className="response-row" key={row} style={{ gridTemplateColumns: `minmax(240px, 1.4fr) repeat(${currentQuestion.columns.length}, minmax(180px, 1fr))` }}>
                      <strong>{row}</strong>
                      {currentQuestion.columns.map((column) => {
                        const key = answerKey(currentQuestion.id, row, column);
                        return (
                          <div className="answer-cell" key={key}>
                            <span className="answer-column">{column}</span>
                            <div className="option-row" role="radiogroup" aria-label={`${row}: ${column}`}>
                              {responseScales[currentQuestion.scale].map((option) => (
                                <label className="option-chip" key={option.code} title={option.label}>
                                  <input
                                    type="radio"
                                    name={key}
                                    checked={answers[key] === option.code}
                                    onChange={() => updateAnswer(key, option.code)}
                                  />
                                  <span>{option.code}</span>
                                  <small>{option.label}</small>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`status-line ${notice.includes("missing") || notice.includes("incomplete") ? "warning" : ""}`} role="status">{notice}</div>

            <div className="actions">
              <button className="secondary" onClick={validateCurrent}>Validate question</button>
              <button className="secondary" onClick={markCurrentQuestionNoInformation}>I don&apos;t have information on this topic</button>
              <button className="secondary" onClick={() => setSurveyChosen(false)}>Choose survey</button>
              <div>
                <button className="ghost" disabled={activeQuestion === 0} onClick={goPrevious}>Previous</button>
                <button className="primary" onClick={continueOrSubmit} disabled={busy}>
                  {activeQuestion < activePartQuestions.length - 1
                    ? "Save and continue"
                    : busy ? "Submitting..." : "Submit this survey"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
