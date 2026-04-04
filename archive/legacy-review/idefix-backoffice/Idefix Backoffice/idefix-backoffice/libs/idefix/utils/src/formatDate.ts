import format from "date-fns/format";

export const formatDate = (value: string) => value && format(new Date(value), "dd.MM.yyyy HH:mm:ss");
