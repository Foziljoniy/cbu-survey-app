import { appUsers, publicSession } from "../../data/users";

export async function POST(request: Request) {
  const payload = (await request.json()) as { username?: string; password?: string };
  const username = payload.username?.trim().toLowerCase() ?? "";
  const password = payload.password ?? "";

  const user = appUsers.find((candidate) => candidate.username === username && candidate.password === password);

  if (!user) {
    return Response.json({ error: "Invalid username or password." }, { status: 401 });
  }

  return Response.json({ session: publicSession(user) });
}
