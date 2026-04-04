export type AddDocumentsFormValues = {
  type: string;
  content?: string;
  photos?: { id: string; originalName: string; isLoading?: boolean }[];
};
