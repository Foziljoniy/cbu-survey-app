import { env } from "cloudflare:workers";
import { answerKey, surveyQuestions } from "../../data/survey";
import { userFromToken } from "../../data/users";

type SubmissionPayload = {
  token?: string;
  answers?: Record<string, string>;
  surveySource?: "ECB Core" | "Uzbekistan Module";
};

const tableSql = `
CREATE TABLE IF NOT EXISTS survey_part_submissions (
  id TEXT PRIMARY KEY,
  bank_id TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  survey_source TEXT NOT NULL,
  respondent_name TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  answered_items INTEGER NOT NULL,
  total_items INTEGER NOT NULL,
  completion INTEGER NOT NULL,
  submitted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`;

async function ensureTable() {
  if (!env.DB) {
    throw new Error("The local survey database is unavailable.");
  }

  await env.DB.prepare(tableSql).run();
}

function authorizationHeaderToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : undefined;
}

function countAnswered(answers: Record<string, string>) {
  return Object.values(answers).filter((value) => value.trim().length > 0).length;
}

function keysForSurvey(source: "ECB Core" | "Uzbekistan Module") {
  return surveyQuestions
    .filter((question) => question.source === source)
    .flatMap((question) => question.rows.flatMap((row) => question.columns.map((column) => answerKey(question.id, row, column))));
}

function normalizeSubmissionRow(row: Record<string, unknown>) {
  return {
    ...row,
    answers: JSON.parse(String(row.answers_json)),
    answers_json: undefined,
  };
}

export async function GET(request: Request) {
  try {
    const user = userFromToken(authorizationHeaderToken(request));

    if (!user) {
      return Response.json({ error: "Sign in is required." }, { status: 401 });
    }

    await ensureTable();

    if (user.role === "manager") {
      const result = await env.DB.prepare(
        `SELECT id, bank_id, bank_name, survey_source, respondent_name, answers_json, answered_items, total_items, completion, submitted_at, updated_at
         FROM survey_part_submissions
         ORDER BY updated_at DESC`
      ).all();

      return Response.json({
        submissions: result.results.map((row) => normalizeSubmissionRow(row)),
      });
    }

    const result = await env.DB.prepare(
      `SELECT id, bank_id, bank_name, survey_source, respondent_name, answers_json, answered_items, total_items, completion, submitted_at, updated_at
       FROM survey_part_submissions
       WHERE bank_id = ?`
    )
      .bind(user.bankId)
      .all();

    return Response.json({
      submissions: result.results.map((row) => normalizeSubmissionRow(row)),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unexpected error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SubmissionPayload;
    const user = userFromToken(payload.token);

    if (!user) {
      return Response.json({ error: "Sign in is required." }, { status: 401 });
    }

    if (user.role !== "bank") {
      return Response.json({ error: "Only bank respondents can submit surveys." }, { status: 403 });
    }

    const answers = payload.answers ?? {};
    const surveySource = payload.surveySource;

    if (surveySource !== "ECB Core" && surveySource !== "Uzbekistan Module") {
      return Response.json({ error: "Choose which survey you want to submit." }, { status: 400 });
    }

    const requiredKeys = keysForSurvey(surveySource);
    const partAnswers = Object.fromEntries(requiredKeys.map((key) => [key, answers[key] ?? ""]));
    const total = requiredKeys.length;
    const answered = countAnswered(partAnswers);
    const completion = Math.round((answered / total) * 100);
    const now = new Date().toISOString();

    if (answered < total) {
      return Response.json(
        { error: `Survey is incomplete. ${total - answered} response items still need answers.`, completion },
        { status: 400 }
      );
    }

    await ensureTable();

    await env.DB.prepare(
      `INSERT INTO survey_part_submissions
        (id, bank_id, bank_name, survey_source, respondent_name, answers_json, answered_items, total_items, completion, submitted_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        respondent_name = excluded.respondent_name,
        answers_json = excluded.answers_json,
        answered_items = excluded.answered_items,
        total_items = excluded.total_items,
        completion = excluded.completion,
        submitted_at = excluded.submitted_at,
        updated_at = excluded.updated_at`
    )
      .bind(
        `${user.bankId}:${surveySource}`,
        user.bankId,
        user.bankName,
        surveySource,
        user.name,
        JSON.stringify(partAnswers),
        answered,
        total,
        completion,
        now,
        now
      )
      .run();

    return Response.json({
      submission: {
        id: `${user.bankId}:${surveySource}`,
        bank_id: user.bankId,
        bank_name: user.bankName,
        survey_source: surveySource,
        respondent_name: user.name,
        answered_items: answered,
        total_items: total,
        completion,
        submitted_at: now,
        updated_at: now,
        answers: partAnswers,
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unexpected error." }, { status: 500 });
  }
}
