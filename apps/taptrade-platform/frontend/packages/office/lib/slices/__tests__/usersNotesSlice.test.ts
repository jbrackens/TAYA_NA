import reducer, { getUserNotesSucceeded } from "../usersDetailsSlice";
import { TalonPunterNotesTypeEnum } from "../../../types/punters";

describe("users notes normalization", () => {
  test("maps Go support-notes payloads into Talon note items and pagination", () => {
    const state = reducer(
      undefined,
      getUserNotesSucceeded({
        data: [
          {
            note_id: "note-1",
            created_at: "2026-03-14T13:00:00Z",
            author_id: "admin-1",
            author_name: "Jane Operator",
            note_type: "manual",
            text: "Customer requested manual review",
          },
        ],
        pagination: {
          page: 2,
          limit: 20,
          total: 41,
        },
      } as any),
    );

    expect(state.notes.data).toEqual([
      {
        noteId: "note-1",
        createdAt: "2026-03-14T13:00:00Z",
        authorId: "admin-1",
        authorName: {
          firstName: "Jane",
          lastName: "Operator",
        },
        noteType: TalonPunterNotesTypeEnum.MANUAL,
        text: "Customer requested manual review",
      },
    ]);
    expect(state.notes.paginationResponse).toEqual({
      current: 2,
      pageSize: 20,
      total: 41,
    });
  });

  test("accepts legacy note payloads", () => {
    const payload = {
      data: [
        {
          noteId: "legacy-note-1",
          createdAt: "2026-03-14T14:00:00Z",
          authorId: "admin-2",
          authorName: {
            firstName: "Legacy",
            lastName: "Admin",
          },
          noteType: TalonPunterNotesTypeEnum.SYSTEM,
          text: "Legacy payload still supported",
        },
      ],
      currentPage: 1,
      itemsPerPage: 10,
      totalCount: 1,
    };

    const state = reducer(undefined, getUserNotesSucceeded(payload as any));

    expect(state.notes.data).toEqual(payload.data);
    expect(state.notes.paginationResponse).toEqual({
      current: 1,
      pageSize: 10,
      total: 1,
    });
  });
});
