import reducer, { getUsersListSucceeded, normalizeGoUser } from "../usersSlice";

describe("normalizeGoUser DOB normalization", () => {
  test("converts Go ISO datetime date_of_birth to { year, month, day }", () => {
    const result: any = normalizeGoUser({
      user_id: "u1",
      email: "test@x.com",
      username: "testuser",
      first_name: "John",
      last_name: "Doe",
      date_of_birth: "1990-03-15T00:00:00Z",
      status: "verified",
      created_at: "2026-03-01T10:00:00Z",
    });
    expect(result.dateOfBirth).toEqual({ year: 1990, month: 3, day: 15 });
  });

  test("converts Go date-only date_of_birth string", () => {
    const result: any = normalizeGoUser({
      user_id: "u2",
      date_of_birth: "1985-12-25",
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(result.dateOfBirth).toEqual({ year: 1985, month: 12, day: 25 });
  });

  test("preserves existing camelCase dateOfBirth object", () => {
    const existing = { day: 1, month: 6, year: 2000 };
    const result: any = normalizeGoUser({
      user_id: "u3",
      dateOfBirth: existing,
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(result.dateOfBirth).toEqual(existing);
  });

  test("prefers Go date_of_birth over legacy dateOfBirth when both present", () => {
    const result: any = normalizeGoUser({
      user_id: "u4",
      date_of_birth: "1992-07-04T00:00:00Z",
      dateOfBirth: { day: 1, month: 1, year: 1970 },
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(result.dateOfBirth).toEqual({ year: 1992, month: 7, day: 4 });
  });

  test("returns undefined dateOfBirth when date_of_birth is null", () => {
    const result: any = normalizeGoUser({
      user_id: "u5",
      date_of_birth: null,
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(result.dateOfBirth).toBeUndefined();
  });

  test("returns undefined dateOfBirth when date_of_birth is missing", () => {
    const result: any = normalizeGoUser({
      user_id: "u6",
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(result.dateOfBirth).toBeUndefined();
  });

  test("returns undefined dateOfBirth for unparseable string", () => {
    const result: any = normalizeGoUser({
      user_id: "u7",
      date_of_birth: "not-a-date",
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(result.dateOfBirth).toBeUndefined();
  });

  test("preserves firstName and lastName normalization", () => {
    const result = normalizeGoUser({
      user_id: "u8",
      first_name: "Alice",
      last_name: "Smith",
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(result.firstName).toBe("Alice");
    expect(result.lastName).toBe("Smith");
  });

  test("passes through non-Go payload unchanged", () => {
    const legacy = {
      id: "p1",
      username: "legacy_user",
      firstName: "Bob",
      lastName: "Jones",
      dateOfBirth: { day: 10, month: 5, year: 1988 },
    };
    const result = normalizeGoUser(legacy);
    expect(result).toEqual(legacy);
  });
});

describe("usersSlice reducer with Go payload", () => {
  test("getUsersListSucceeded normalizes Go users with DOB", () => {
    const state = reducer(
      undefined,
      getUsersListSucceeded({
        data: [
          {
            user_id: "u1",
            email: "a@x.com",
            username: "alice",
            first_name: "Alice",
            last_name: "Anderson",
            date_of_birth: "1990-01-15T00:00:00Z",
            status: "verified",
            created_at: "2026-03-01T10:00:00Z",
          } as any,
        ],
        pagination: { page: 1, limit: 20, total: 1 },
      } as any),
    );

    expect(state.data).toHaveLength(1);
    expect(state.data[0].firstName).toBe("Alice");
    expect(state.data[0].lastName).toBe("Anderson");
    expect((state.data[0] as any).dateOfBirth).toEqual({
      year: 1990,
      month: 1,
      day: 15,
    });
  });
});
