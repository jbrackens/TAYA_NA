import {
  TalonPunterNotes,
  TalonPunterNotesAuthor,
  TalonPunterNotesItem,
  TalonPunterNotesTypeEnum,
} from "../../types/punters.d";
import { TablePaginationResponse } from "../../types/filters.d";

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

const SYSTEM_AUTHOR: TalonPunterNotesAuthor = {
  firstName: "System",
  lastName: "",
};

const isLegacyNoteItem = (item: any): item is TalonPunterNotesItem =>
  typeof item?.noteId !== "undefined" &&
  typeof item?.createdAt === "string" &&
  typeof item?.noteType === "string" &&
  typeof item?.text === "string";

const splitAuthorName = (authorName?: string | null): TalonPunterNotesAuthor => {
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

const normalizeNoteType = (noteType?: string): TalonPunterNotesTypeEnum =>
  `${noteType || ""}`.trim().toUpperCase() === TalonPunterNotesTypeEnum.MANUAL
    ? TalonPunterNotesTypeEnum.MANUAL
    : TalonPunterNotesTypeEnum.SYSTEM;

const normalizeNoteItem = (item: GoSupportNote): TalonPunterNotesItem => ({
  noteId: item.note_id || "",
  createdAt: item.created_at || new Date(0).toISOString(),
  authorId: item.author_id || "",
  authorName: splitAuthorName(item.author_name),
  noteType: normalizeNoteType(item.note_type),
  text: item.text || "",
});

const extractNotes = (payload: GoSupportNotesResponse | TalonPunterNotes): TalonPunterNotes => {
  if (Array.isArray(payload)) {
    return payload.map((item) => (isLegacyNoteItem(item) ? item : normalizeNoteItem(item as any)));
  }

  const data = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
      ? payload.items
      : [];

  return data.map((item) => (isLegacyNoteItem(item) ? item : normalizeNoteItem(item)));
};

const normalizePagination = (
  payload: GoSupportNotesResponse | TalonPunterNotes,
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
  payload: GoSupportNotesResponse | TalonPunterNotes,
): { data: TalonPunterNotes; pagination: TablePaginationResponse } => {
  const data = extractNotes(payload);
  return {
    data,
    pagination: normalizePagination(payload, data.length),
  };
};
