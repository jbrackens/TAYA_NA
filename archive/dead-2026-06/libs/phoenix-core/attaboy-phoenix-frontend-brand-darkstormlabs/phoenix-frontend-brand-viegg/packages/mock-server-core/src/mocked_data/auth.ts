export const AuthToken = {
  token:
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxLUZPZmoxMHlpaTRaZWhkSE43R3YzSXNPUVVhR09NWkZETEF4M295YUJLZUdRclNWWmJtMTU4aGkyS0FHTmRUbEtiajZ4czJuQjVJWDJxcTBCVE1HQTF0MGNJdmFGMEF0TzgxZkRZcGlSeVk4bGxzZz0iLCJpc3MiOiJwbGF5LWFuZ3VsYXI0LXNpbGhvdWV0dGUiLCJleHAiOjE2MDIzNDA3NTAsImlhdCI6MTU5OTc0ODc1MCwianRpIjoiNzhlZDE1Yjc0N2VlNWNjOTc3ZDdmNzRlY2NiOTUzYzEzZDczMDA2NWZjNTQ1OGU2NjE3ZTdmNWVjNmY2NGMzOTc3ZmU1OTg4YTgzMzY4NmMyMGVkYTVhODM4NDJlMjNjNjZiNTVlMzY1NTRiZDM1MTUzNzkzNjNlMDcwOTdkNjU1MmRkZjlhYjBkNTJlNWQxZTJmYmFjNjlkNGFlYjkwYTM0ODc5YzExY2NiOGI2ZTA5M2U2YTQzYTc2NzgwZDZkYzE0ODNiOWQyNmM4NDA2YzIwNzIzOTJmODczN2VhODQzMWE4ZGI0YTg0MzgwNzRjYzZiMTJiZmRmNjgwZWZmNSJ9.OCnBqKwgKn76NRpbA6izT1KVIAnbrxJxYPXe8oVpWCw",
  refresToken:
    "mRUbEtiajZ4czJuQjVJWDJxcTBCVE1HQTF0MGNJdmFGMEF0TzgxZkRZcGlSeVk4bGxzZz0iLCJpc3MiOiJwbGF5LWFuZ3VsYXI0LXNpbGhvdWV0dGUiLCJleHAiOjE2MDIzNDA3NTAsImlhdCI6MTU5OTc0ODceyJ0eXAiOiJKV1QiLTBCV",
};

type LoginResponse = {
  hasToAcceptTerms: boolean;
  lastSignIn: string;
  sessionId: string;
  token: {
    expiresIn: number;
    refreshExpiresIn: number;
    refreshToken: string;
    token: string;
    tokenType: string;
    userId: string;
  };
  type: string;
};

export const loginResponse: LoginResponse = {
  hasToAcceptTerms: false,
  lastSignIn: "2021-09-26T10:01:21.541Z",
  sessionId: "c10db612-6232-4f39-95ea-1fb1278b24f7",
  token: {
    expiresIn: 300,
    refreshExpiresIn: 900,
    refreshToken:
      "eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIzOGQ3M2I0OC1iZWE1LTQ2MTktYWIzYi1mZTQ5YTZhZDBiY2YifQ.eyJleHAiOjE2MzI2NTI0NzYsImlhdCI6MTYzMjY1MTU3NiwianRpIjoiMThjMTBjOWUtZjRhMC00OTM1LTg4MDktYzBjNjdiZmVhMjg2IiwiaXNzIjoiaHR0cHM6Ly9rZXljbG9hay5rZXljbG9hazo4NDQzL2F1dGgvcmVhbG1zL3Bob2VuaXhfZGV2IiwiYXVkIjoiaHR0cHM6Ly9rZXljbG9hay5rZXljbG9hazo4NDQzL2F1dGgvcmVhbG1zL3Bob2VuaXhfZGV2Iiwic3ViIjoiZWU4ZTVkOWQtMmQ0MC00NDVmLThmYWQtYzI3OGFiYTU1MWUyIiwidHlwIjoiUmVmcmVzaCIsImF6cCI6InBob2VuaXgtYmFja2VuZCIsInNlc3Npb25fc3RhdGUiOiIyYWEyZDA0OC1jYmM5LTRlOGEtOTgyNS0zYWNlZWYyNGE1Y2EiLCJhdXRob3JpemF0aW9uIjp7InBlcm1pc3Npb25zIjpbeyJyc2lkIjoiYzk2NTRmNzUtZDBlNC00NTY5LWJmMmYtYjc3NjYwNjZjOTIyIiwicnNuYW1lIjoiRGVmYXVsdCBSZXNvdXJjZSJ9XX0sInNjb3BlIjoiZW1haWwgcHJvZmlsZSIsInNpZCI6IjJhYTJkMDQ4LWNiYzktNGU4YS05ODI1LTNhY2VlZjI0YTVjYSJ9.VjN6o4S-1hYshzGjFYBRrYbCjsaL6bxhHKkq2kz2zg4",
    token:
      "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJhbjl3VlBkUS1jeVZyekxzcVNJVVY4WFcwc0lFdTJRR2drM0NLbVZ0V1hBIn0.eyJleHAiOjE2MzI2NTE4NzYsImlhdCI6MTYzMjY1MTU3NiwianRpIjoiZjM5ZmYxNjAtYWFjMS00ZDcxLWEyMDQtNzg4MmVkNDYyODBiIiwiaXNzIjoiaHR0cHM6Ly9rZXljbG9hay5rZXljbG9hazo4NDQzL2F1dGgvcmVhbG1zL3Bob2VuaXhfZGV2IiwiYXVkIjpbInBob2VuaXgtYmFja2VuZCIsImFjY291bnQiXSwic3ViIjoiZWU4ZTVkOWQtMmQ0MC00NDVmLThmYWQtYzI3OGFiYTU1MWUyIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoicGhvZW5peC1iYWNrZW5kIiwic2Vzc2lvbl9zdGF0ZSI6IjJhYTJkMDQ4LWNiYzktNGU4YS05ODI1LTNhY2VlZjI0YTVjYSIsImFjciI6IjEiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJkZWZhdWx0LXJvbGVzLXBob2VuaXgiXX0sInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19LCJhdXRob3JpemF0aW9uIjp7InBlcm1pc3Npb25zIjpbeyJyc2lkIjoiYzk2NTRmNzUtZDBlNC00NTY5LWJmMmYtYjc3NjYwNjZjOTIyIiwicnNuYW1lIjoiRGVmYXVsdCBSZXNvdXJjZSJ9XX0sInNjb3BlIjoiZW1haWwgcHJvZmlsZSIsInNpZCI6IjJhYTJkMDQ4LWNiYzktNGU4YS05ODI1LTNhY2VlZjI0YTVjYSIsInRlcm1zX2FjY2VwdGVkX3ZlcnNpb24iOjAsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwidGVybXNfYWNjZXB0ZWRfYXQiOjE2MzI2NDk2MTM3NzIsImdlbmRlciI6Ik1hbGUiLCJuYW1lIjoiRmlsaXAgTHVrYXNpayIsInByZWZlcnJlZF91c2VybmFtZSI6ImZpbGlwdGVzdDAyMCIsImdpdmVuX25hbWUiOiJGaWxpcCIsImZhbWlseV9uYW1lIjoiTHVrYXNpayIsImVtYWlsIjoidGVzdDAyMUB0ZXN0cy5jb20ifQ.AuQu7fhS3qkrFdHIGbaPDT5Zt8RXPqunBSzaF7vQSwCiIyswA_nfqf2mF8Jglybp8krIQ0EhqS4O7wlKT4hBMe26J_Aartf6ucfW8Ed_KlAdZNrz45jnIjdjeEkTEaVFyTBusvmcA0PmyimKOFdIiqpeSbAbEaKMAgvwxNxTJoXQBVUeYJK6e2hXeHV0sJJ7YMAU_JI3e-PSX1zZ-8Z-p4-vmpVUb-mooc9M0mtUzjAlsAfZV-xJsdi4zk-jpxgGFtYdYmMYTxD-WqT1E3d-9W6m48wA1lezcYg_0YUrpkhmAqjyuJj0Rzzs6IUpaK_UxX4FJxkAnp4CdRCh4JI3Xw",
    tokenType: "Bearer",
    userId: "ee8e5d9d-2d40-445f-8fad-c278aba551e2",
  },
  type: "LOGGED_IN",
};

export const unverifiedUserloginResponse: LoginResponse = {
  hasToAcceptTerms: false,
  lastSignIn: "2021-09-26T10:01:21.541Z",
  sessionId: "c10db612-6232-4f39-95ea-1fb1278b24f7",
  token: {
    expiresIn: 300,
    refreshExpiresIn: 900,
    refreshToken:
      "eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIzOGQ3M2I0OC1iZWE1LTQ2MTktYWIzYi1mZTQ5YTZhZDBiY2YifQ.eyJleHAiOjE2MzI2NTI0NzYsImlhdCI6MTYzMjY1MTU3NiwianRpIjoiMThjMTBjOWUtZjRhMC00OTM1LTg4MDktYzBjNjdiZmVhMjg2IiwiaXNzIjoiaHR0cHM6Ly9rZXljbG9hay5rZXljbG9hazo4NDQzL2F1dGgvcmVhbG1zL3Bob2VuaXhfZGV2IiwiYXVkIjoiaHR0cHM6Ly9rZXljbG9hay5rZXljbG9hazo4NDQzL2F1dGgvcmVhbG1zL3Bob2VuaXhfZGV2Iiwic3ViIjoiZWU4ZTVkOWQtMmQ0MC00NDVmLThmYWQtYzI3OGFiYTU1MWUyIiwidHlwIjoiUmVmcmVzaCIsImF6cCI6InBob2VuaXgtYmFja2VuZCIsInNlc3Npb25fc3RhdGUiOiIyYWEyZDA0OC1jYmM5LTRlOGEtOTgyNS0zYWNlZWYyNGE1Y2EiLCJhdXRob3JpemF0aW9uIjp7InBlcm1pc3Npb25zIjpbeyJyc2lkIjoiYzk2NTRmNzUtZDBlNC00NTY5LWJmMmYtYjc3NjYwNjZjOTIyIiwicnNuYW1lIjoiRGVmYXVsdCBSZXNvdXJjZSJ9XX0sInNjb3BlIjoiZW1haWwgcHJvZmlsZSIsInNpZCI6IjJhYTJkMDQ4LWNiYzktNGU4YS05ODI1LTNhY2VlZjI0YTVjYSJ9.VjN6o4S-1hYshzGjFYBRrYbCjsaL6bxhHKkq2kz2zg4",
    token: "unverifinedUserToken",
    tokenType: "Bearer",
    userId: "ee8e5d9d-2d40-445f-8fad-c278aba551e2",
  },
  type: "LOGGED_IN",
};

export const adminLoginResponse: LoginResponse = {
  hasToAcceptTerms: false,
  sessionId: "11b4f2fb-d9a4-440e-9ae6-7010272677c5",
  lastSignIn: "2021-09-26T10:01:21.541Z",
  token: {
    expiresIn: 300,
    refreshExpiresIn: 1800,
    refreshToken:
      "eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIzOGQ3M2I0OC1iZWE1LTQ2MTktYWIzYi1mZTQ5YTZhZDBiY2YifQ.eyJleHAiOjE2MTg5MTMxNDEsImlhdCI6MTYxODkxMTM0MSwianRpIjoiNGI3MWQ4MWQtZTY3OC00NDE3LWI4ZDItMTRjNTkwOTYwYmY5IiwiaXNzIjoiaHR0cHM6Ly9rZXljbG9hay5rZXljbG9hay10ZXN0Ojg0NDMvYXV0aC9yZWFsbXMvcGhvZW5peF9kZXYiLCJhdWQiOiJodHRwczovL2tleWNsb2FrLmtleWNsb2FrLXRlc3Q6ODQ0My9hdXRoL3JlYWxtcy9waG9lbml4X2RldiIsInN1YiI6ImVlNDQ0ZTgzLTNhYWMtNGE2Zi1hNmE1LWU4NDE2NTE0NTE3ZSIsInR5cCI6IlJlZnJlc2giLCJhenAiOiJwaG9lbml4LWJhY2tlbmQiLCJzZXNzaW9uX3N0YXRlIjoiZDM5YzJiYzUtNTNmYS00MzRjLWIyZjctOTAzY2E3NzdlYmI3IiwiYXV0aG9yaXphdGlvbiI6eyJwZXJtaXNzaW9ucyI6W3sicnNpZCI6ImM5NjU0Zjc1LWQwZTQtNDU2OS1iZjJmLWI3NzY2MDY2YzkyMiIsInJzbmFtZSI6IkRlZmF1bHQgUmVzb3VyY2UifV19LCJzY29wZSI6ImVtYWlsIHByb2ZpbGUifQ.8Pk6MOA9MeKJR5K585B8Zcxn3nN8Nv97hcuy5-TLi24",
    token:
      "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJhbjl3VlBkUS1jeVZyekxzcVNJVVY4WFcwc0lFdTJRR2drM0NLbVZ0V1hBIn0.eyJleHAiOjE2MTg5MTE2NDEsImlhdCI6MTYxODkxMTM0MSwianRpIjoiMzY5NDIxM2ItZGZkZi00YzE4LWI5OWMtMGM0OWZkZGQzNjgzIiwiaXNzIjoiaHR0cHM6Ly9rZXljbG9hay5rZXljbG9hay10ZXN0Ojg0NDMvYXV0aC9yZWFsbXMvcGhvZW5peF9kZXYiLCJhdWQiOlsicGhvZW5peC1iYWNrZW5kIiwiYWNjb3VudCJdLCJzdWIiOiJlZTQ0NGU4My0zYWFjLTRhNmYtYTZhNS1lODQxNjUxNDUxN2UiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJwaG9lbml4LWJhY2tlbmQiLCJzZXNzaW9uX3N0YXRlIjoiZDM5YzJiYzUtNTNmYS00MzRjLWIyZjctOTAzY2E3NzdlYmI3IiwiYWNyIjoiMSIsInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJvZmZsaW5lX2FjY2VzcyIsImFkbWluIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwiYXV0aG9yaXphdGlvbiI6eyJwZXJtaXNzaW9ucyI6W3sicnNpZCI6ImM5NjU0Zjc1LWQwZTQtNDU2OS1iZjJmLWI3NzY2MDY2YzkyMiIsInJzbmFtZSI6IkRlZmF1bHQgUmVzb3VyY2UifV19LCJzY29wZSI6ImVtYWlsIHByb2ZpbGUiLCJ0ZXJtc19hY2NlcHRlZF92ZXJzaW9uIjowLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsInRlcm1zX2FjY2VwdGVkX2F0IjoxNjE4NzM1OTk5MDAwLCJuYW1lIjoiRmlsaXAgxYF1a2FzaWsiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJmaWxpcHRlc3QxMTEiLCJnaXZlbl9uYW1lIjoiRmlsaXAiLCJmYW1pbHlfbmFtZSI6IsWBdWthc2lrIiwiZW1haWwiOiJ0ZXN0MTExQHRlc3QuY29tIn0.E1FeQ53HlIVffwVpmNDJsBI6Gtwr2tkac2Jfoq0qPtomfWoorJdnGTADNy1YQ0kem2SKnZTPYAsohOilWGAr7d2-6JsUxoyiUII6rRuPZkqX1K6vBGMoQk6wkuJUPS5CWQlSbh1-8Ont852EdcU5CudqmIJZDIp1UCDPcudLYGU2igusjQ9O5rc83-5uVxgv0IFvXClMXPemVl9ZmXCF-6xUJvoImfN1oBdDLQ_0oGV4BhBaGXsR5yJOgoSxZCkGa1r6_JlCZxp6NmnqKBxp29Bj75zqqCPj1g0bZEc0zY2lVWL4YWCLdg7MvYO8qfnGZeZrvJq0GafTtHHKyyh4Eg",
    tokenType: "Bearer",
    userId: "ee444e83-3aac-4a6f-a6a5-e8416514517e",
  },
  type: "LOGGED_IN",
};

export const users = [
  {
    email: "google@chucknorris.com",
    username: "google@chucknorris.com",
    password: "spinning-roundhouse-to-the-throat",
    rememberMe: true,
    isVerified: true,
    changePasswordHash:
      "LCJhbGciOiJIUzI1NiJ9eyJzdWIiOiIxLUZPZmoxMHlpaTRaZWhkSE43R3YzSXNPUVVhR09NWkZETEF4M295YUJLZUdRclNWWmJtMTU4aGkyS0FHTmRUbEtiajZ4czJuQjVJWDJxcTBCVE1HQTF0MGNJdmFGMEF0TzgxZkRZcGlSeVk4bG",
  },
  {
    email: "test@test.com",
    username: "test@test.com",
    password: "test",
    rememberMe: true,
    isVerified: true,
    changePasswordHash:
      "mRUbEtiajZ4czJuQjVJWDJxcTBCVE1HQTF0MGNJdmFGMEF0TzgxZkRZcGlSeVk4bGxzZz0iLCJpc3MiOiJwbGF5LWFuZ3VsYXI0LXNpbGhvdWV0dGUiLCJleHAiOjE2MDIzNDA3NTAsImlhdCI6MTU5OTc0ODceyJ0eXAiOiJKV1QiLTBCV",
  },
  {
    email: "admin@chucknorris.com",
    username: "admin@chucknorris.com",
    password: "test",
    rememberMe: true,
    isAdmin: true,
    isVerified: true,
    changePasswordHash:
      "mRUbEtiajZ4czJuQjVJWDJxcTBCVE1HQTF0MGNJdmFGMEF0TzgxZkRZcGlSeVk4bGxzZz0iLCJpc3MiOiJwbGF5LWFuZ3VsYXI0LXNpbGhvdWV0dGUiLCJleHAiOjE2MDIzNDA3NTAsImlhdCI6MTU5OTc0ODceyJ0eXAiOiJKV1QiLTBCV",
  },
  {
    email: "unverified-user@test.com",
    username: "unverified-user@test.com",
    password: "test",
    rememberMe: true,
    isVerified: false,
    changePasswordHash:
      "mRUbEtiajZ4czJuQjVJWDJxcTBCVE1HQTF0MGNJdmFGMEF0TzgxZkRZcGlSeVk4bGxzZz0iLCJpc3MiOiJwbGF5LWFuZ3VsYXI0LXNpbGhvdWV0dGUiLCJleHAiOjE2MDIzNDA3NTAsImlhdCI6MTU5OTc0ODceyJ0eXAiOiJKV1QiLTBCV",
  },
];

export const profile = {
  address: {
    addressLine: "addressLine",
    city: "city",
    state: "state",
    zipcode: "zipcode",
    country: "US",
  },
  bettingPreferences: {
    autoAcceptBetterOdds: false,
  },
  communicationPreferences: {
    announcements: false,
    promotions: false,
    subscriptionUpdates: false,
  },
  dateOfBirth: {
    day: 1,
    month: 1,
    year: 1,
  },
  userId: "randomId123456",
  email: "fakeMail@mail.com",
  phoneNumber: "2137",
  name: {
    firstName: "first name",
    lastName: "last name",
    title: "Mrs",
  },
  username: "fakeAccount",
  depositLimits: {
    daily: {
      current: {
        limit: 100,
        since: "1970-01-01T00:00:00Z",
      },
    },
    weekly: {
      current: {
        limit: 1000,
        since: "1970-01-01T00:00:00Z",
      },
    },
    monthly: {
      current: {
        limit: 2000,
        since: "1970-01-01T00:00:00Z",
      },
    },
  },
  lossLimits: {
    daily: {
      current: {
        limit: 100,
        since: "1970-01-01T00:00:00Z",
      },
    },
    weekly: {
      current: {
        limit: 1000,
        since: "1970-01-01T00:00:00Z",
      },
    },
    monthly: {
      current: {
        limit: 2000,
        since: "1970-01-01T00:00:00Z",
      },
    },
  },
  sessionLimits: {
    daily: {
      current: {
        limit: 100,
        since: "1970-01-01T00:00:00Z",
      },
    },
    weekly: {
      current: {
        limit: 1000,
        since: "1970-01-01T00:00:00Z",
      },
    },
    monthly: {
      current: {
        limit: 2000,
        since: "1970-01-01T00:00:00Z",
      },
    },
  },
  hasToAcceptTerms: false,
  signUpDate: "2021-04-14T09:58:26.564Z",
  status: "ACTIVE",
  terms: {
    acceptedAt: "2021-04-14T09:58:26.564Z",
    version: 0,
  },
};

export const unverifiedProfile: any = {
  address: {
    addressLine: "asdasd",
    city: "asdasa",
    country: "US",
    state: "AS",
    zipcode: "123123",
  },
  bettingPreferences: {
    autoAcceptBetterOdds: false,
  },
  communicationPreferences: {
    announcements: false,
    promotions: false,
    signInNotifications: true,
    subscriptionUpdates: false,
  },
  dateOfBirth: {
    day: 9,
    month: 6,
    year: 1996,
  },
  depositLimits: {
    daily: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
    monthly: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
    weekly: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
  },
  email: "test001@tests.com",
  gender: "Male",
  hasToAcceptResponsibilityCheck: false,
  hasToAcceptTerms: false,
  lastSignIn: "2021-10-21T10:50:35.155Z",
  name: {
    firstName: "Filip",
    lastName: "Lukasik",
    title: "Mr",
  },
  phoneNumber: "+48511690388",
  richStatus: {
    status: "UNVERIFIED",
  },
  sessionLimits: {
    daily: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
    monthly: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
    weekly: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
  },
  signUpDate: "2021-10-21T10:50:18.902Z",
  ssn: "6789",
  stakeLimits: {
    daily: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
    monthly: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
    weekly: {
      current: {
        limit: null,
        since: "1970-01-01T00:00:00Z",
      },
    },
  },
  status: "UNVERIFIED",
  terms: {
    acceptedAt: "2021-10-21T10:50:18.902Z",
    version: 0,
  },
  twoFactorAuthEnabled: false,
  userId: "e836991d-da41-4892-8db2-3589da0d1d58",
  username: "filiptest001",
};

export const registerResponse = {
  type: "KBA_QUESTIONS",
  questions: [
    {
      questionId: "question1Id",
      text: "Question1 question",
      choices: [
        "question1choiceFirst",
        "question1choiceSecond",
        "question1choiceThird",
        "question1choiceFourth",
      ],
    },
    {
      questionId: "question2Id",
      text: "Question2 question",
      choices: [
        "question2choiceFirst",
        "question2choiceSecond",
        "question2choiceThird",
        "question2choiceFourth",
      ],
    },
    {
      questionId: "question3Id",
      text: "Question3 question",
      choices: [
        "question3choiceFirst",
        "question3choiceSecond",
        "question3choiceThird",
        "question3choiceFourth",
      ],
    },
    {
      questionId: "question4Id",
      text: "Question4 question",
      choices: [
        "question4choiceFirst",
        "question4choiceSecond",
        "question4choiceThird",
        "question4choiceFourth",
      ],
    },
  ],
};

export const kbaQuestionsResponse = {
  punterId: "fdeab546-215a-42a7-81ff-7dac692a959f",
  questions: [
    {
      choices: ["36101", "33971", "35425", "None of the above"],
      questionId: "0",
      text: "In which zip code have you previously lived?",
    },
    {
      choices: [
        "NEWPORT NEWS CITY",
        "GOSPER",
        "RIO GRANDE",
        "None of the above",
      ],
      questionId: "1",
      text: "In which county do you live?",
    },
    {
      choices: [
        "GLADSTONE",
        "BIRMINGHAM",
        "PEACHTREE CITY",
        "None of the above",
      ],
      questionId: "2",
      text: "In which city have you previously lived?",
    },
  ],
  type: "KBA_QUESTIONS",
};
