import {
  OfficePunterNotes,
  OfficePunterNotesAuthor,
  OfficePunterNotesItem,
  OfficePunterNotesTypeEnum,
} from "../../types/punters";
import { TablePaginationResponse } from "../../types/filters";

type GoSupportNote = {
  note_id?: string;
  created_at?: string;
  author_id?: string;
  author_name?: string | null;
  note_type?: string;
  text?: string;
};

type GoSupportNotesResponse = {
  data?: GoSupportNote[];
  items?: GoSupportNote[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
  };
  currentPage?: number;
  itemsPerPage?: number;
  totalCount?: number;
};

type SupportNotesPayload =
  | GoSupportNotesResponse
  | GoSupportNote[]
  | OfficePunterNotes;

const SYSTEM_AUTHOR: OfficePunterNotesAuthor = {
  firstName: "System",
  lastName: "",
};

const isLegacyNoteItem = (item: any): item is OfficePunterNotesItem =>
  typeof item?.noteId !== "undefined" &&
  typeof item?.createdAt === "string" &&
  typeof item?.noteType === "string" &&
  typeof item?.text === "string";

const splitAuthorName = (
  authorName?: string | null,
): OfficePunterNotesAuthor => {
  const trimmedAuthorName = `${authorName || ""}`.trim();
  if (!trimmedAuthorName) {
    return SYSTEM_AUTHOR;
  }

  const [firstName, ...rest] = trimmedAuthorName.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" "),
  };
};

const normalizeNoteType = (noteType?: string): OfficePunterNotesTypeEnum =>
  `${noteType || ""}`.trim().toUpperCase() === OfficePunterNotesTypeEnum.MANUAL
    ? OfficePunterNotesTypeEnum.MANUAL
    : OfficePunterNotesTypeEnum.SYSTEM;

const normalizeNoteItem = (item: GoSupportNote): OfficePunterNotesItem => ({
  noteId: item.note_id || "",
  createdAt: item.created_at || new Date(0).toISOString(),
  authorId: item.author_id || "",
  authorName: splitAuthorName(item.author_name),
  noteType: normalizeNoteType(item.note_type),
  text: item.text || "",
});

const extractNotes = (payload: SupportNotesPayload): OfficePunterNotes => {
  if (Array.isArray(payload)) {
    return payload.map((item) =>
      isLegacyNoteItem(item) ? item : normalizeNoteItem(item),
    );
  }

  const data = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
      ? payload.items
      : [];

  return data.map((item) =>
    isLegacyNoteItem(item) ? item : normalizeNoteItem(item),
  );
};

const normalizePagination = (
  payload: SupportNotesPayload,
  totalCount: number,
): TablePaginationResponse => {
  if (!Array.isArray(payload) && payload?.pagination) {
    return {
      currentPage: payload.pagination.page || 1,
      itemsPerPage: payload.pagination.limit || 10,
      totalCount: payload.pagination.total || totalCount,
    };
  }

  return {
    currentPage: (payload as GoSupportNotesResponse)?.currentPage || 1,
    itemsPerPage: (payload as GoSupportNotesResponse)?.itemsPerPage || 10,
    totalCount: (payload as GoSupportNotesResponse)?.totalCount || totalCount,
  };
};

export const normalizeSupportNotesResponse = (
  payload: SupportNotesPayload,
): { data: OfficePunterNotes; pagination: TablePaginationResponse } => {
  const data = extractNotes(payload);
  return {
    data,
    pagination: normalizePagination(payload, data.length),
  };
};
