import "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    email: string;
    username: string;
    fullname: string;
    role: string;
  }

  interface Session {
    user: {
      id?: string;
      email: string;
      username: string;
      fullname: string;
      role: string;
    } & DefaultSession["user"];
  }

}

declare module "next-auth/jwt" {
  interface jwt {
    id?: string;
    email: string;
    username: string;
    fullname: string;
    role: string;
  }
}