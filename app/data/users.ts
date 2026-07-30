export type BankUser = {
  role: "bank";
  username: string;
  password: string;
  name: string;
  bankId: string;
  bankName: string;
};

export type ManagerUser = {
  role: "manager";
  username: string;
  password: string;
  name: string;
};

export type AppUser = BankUser | ManagerUser;

export const bankUsers: BankUser[] = [
  {
    role: "bank",
    username: "nbu.respondent",
    password: "NBU-2026!",
    name: "NBU Survey Respondent",
    bankId: "nbu",
    bankName: "National Bank of Uzbekistan",
  },
  {
    role: "bank",
    username: "uzpsb.respondent",
    password: "UZPSB-2026!",
    name: "Uzpromstroybank Survey Respondent",
    bankId: "uzpsb",
    bankName: "Uzpromstroybank",
  },
  {
    role: "bank",
    username: "asaka.respondent",
    password: "ASAKA-2026!",
    name: "Asakabank Survey Respondent",
    bankId: "asaka",
    bankName: "Asakabank",
  },
  {
    role: "bank",
    username: "ipoteka.respondent",
    password: "IPOTEKA-2026!",
    name: "Ipoteka Bank Survey Respondent",
    bankId: "ipoteka",
    bankName: "Ipoteka Bank",
  },
  {
    role: "bank",
    username: "kapital.respondent",
    password: "KAPITAL-2026!",
    name: "Kapitalbank Survey Respondent",
    bankId: "kapital",
    bankName: "Kapitalbank",
  },
  {
    role: "bank",
    username: "hamkor.respondent",
    password: "HAMKOR-2026!",
    name: "Hamkorbank Survey Respondent",
    bankId: "hamkor",
    bankName: "Hamkorbank",
  },
  {
    role: "bank",
    username: "agrobank.respondent",
    password: "AGROBANK-2026!",
    name: "Agrobank Survey Respondent",
    bankId: "agrobank",
    bankName: "Agrobank",
  },
  {
    role: "bank",
    username: "microcredit.respondent",
    password: "MICRO-2026!",
    name: "Microcreditbank Survey Respondent",
    bankId: "microcredit",
    bankName: "Microcreditbank",
  },
];

export const managerUser: ManagerUser = {
  role: "manager",
  username: "cbu.manager",
  password: "CBU-Manager-2026!",
  name: "CBU Survey Manager",
};

export const appUsers: AppUser[] = [...bankUsers, managerUser];

export type SessionUser = Omit<AppUser, "password"> & { token: string };

export function createToken(user: AppUser) {
  return `${user.role}:${user.username}:${"bankId" in user ? user.bankId : "cbu"}`;
}

export function userFromToken(token: string | undefined): AppUser | null {
  if (!token) return null;
  const [role, username, bankId] = token.split(":");

  if (role === "manager" && username === managerUser.username) {
    return managerUser;
  }

  if (role === "bank") {
    return bankUsers.find((user) => user.username === username && user.bankId === bankId) ?? null;
  }

  return null;
}

export function publicSession(user: AppUser): SessionUser {
  const { password: _password, ...safeUser } = user;
  return { ...safeUser, token: createToken(user) };
}
