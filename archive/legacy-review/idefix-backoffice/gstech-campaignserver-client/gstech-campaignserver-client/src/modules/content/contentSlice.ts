import { createAsyncThunk, createEntityAdapter, createSelector, createSlice, EntityState } from "@reduxjs/toolkit";
import { ApiServerError, Content, ContentDraft, ContentRequest, ContentType } from "app/types";
import { toast } from "react-toastify";
import { AxiosError } from "axios";
import omit from "lodash/omit";
import transform from "lodash/transform";
import values from "lodash/values";

import api from "../../api";
import { RootState } from "../../redux";
import { selectLanguageOptions } from "../app";
import { getLanguagesFilled } from "./utils";

interface IState extends EntityState<Content> {
  isLoading: boolean;
}

const contentAdapter = createEntityAdapter<Content>({
  selectId: (content: Content) => content.id
});

const initialState: IState = contentAdapter.getInitialState({
  isLoading: true
});

export const fetchContent = createAsyncThunk<Content[], ContentRequest>(
  "content/fetchContent",
  async ({ brandId, contentType, status, location, excludeInactive }: ContentRequest, { rejectWithValue }) => {
    try {
      const response = await api.content.getContent({
        brandId,
        contentType,
        status,
        location,
        excludeInactive
      });
      const content = response.data.data;

      return content;
    } catch (err) {
      const error: AxiosError<ApiServerError> = err;

      if (!error.response) {
        toast.error(`Fetch content failed: ${error.message}`);
        throw err;
      }

      toast.error(`Fetch content failed: ${error.response.data.error.message}`);
      return rejectWithValue(error.response.data);
    }
  }
);

export const fetchContentById = createAsyncThunk<Content, number>(
  "content/fetchContentById",
  async (contentId: number, thunkApi) => {
    try {
      const response = await api.content.getContentById(contentId);

      const content = response.data.data;

      return content;
    } catch (err) {
      const error: AxiosError<ApiServerError> = err;

      if (!error.response) {
        toast.error(`Fetch content failed: ${error.message}`);
        throw err;
      }

      toast.error(`Fetch content failed: ${error.response.data.error.message}`);
      return thunkApi.rejectWithValue(error.response.data);
    }
  }
);

export const createContent = createAsyncThunk<
  void,
  { type: ContentType; brandId: string; values: Content },
  {
    rejectValue: ApiServerError;
  }
>("content/createContent", async ({ values, type, brandId }, { rejectWithValue }) => {
  try {
    const contentDraft = { ...values, type, brandId };
    await api.content.createContent(contentDraft);
    toast.success(`Content created!`);
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Create content failed: ${error.message}`);
      throw err;
    }

    toast.error(`Create content failed: ${error.response.data.error.message}`);
    return rejectWithValue(error.response.data);
  }
});

export const duplicateContent = createAsyncThunk<
  Content,
  { contentId: number; type: ContentType; brandId: string },
  {
    rejectValue: ApiServerError;
  }
>("content/duplicateContent", async ({ contentId, type, brandId }, { rejectWithValue, getState }) => {
  try {
    const state = getState() as RootState;
    const duplicatedContent = selectContentById(state, contentId);
    const { id: _id, ...contentDraft } = {
      ...duplicatedContent,
      name: `${duplicatedContent?.name} copy`,
      status: "draft",
      type,
      brandId
    };

    const omittedContentDraft = omit(contentDraft, "content.enabled");

    const response = await api.content.createContent(omittedContentDraft as ContentDraft);
    toast.success(`Content duplicated!`);
    return response.data.data;
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Duplicate content failed: ${error.message}`);
      throw err;
    }

    toast.error(`Duplicate content failed: ${error.response.data.error.message}`);
    return rejectWithValue(error.response.data);
  }
});

export const updateContent = createAsyncThunk<
  Content,
  {
    id: number;
    values: Content;
  },
  {
    rejectValue: ApiServerError;
  }
>("content/updateContent", async ({ id, values }, { rejectWithValue }) => {
  try {
    const omittedContentDraft = omit(values, "content.enabled");

    const response = await api.content.updateContent(id, omittedContentDraft);
    toast.success(`Content updated!`);
    return response.data.data;
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Update content failed: ${error.message}`);
      throw err;
    }

    toast.error(`Update content failed: ${error.response.data.error.message}`);
    return rejectWithValue(error.response.data);
  }
});

export const removeContent = createAsyncThunk<
  number,
  number,
  {
    rejectValue: ApiServerError;
  }
>("content/removeContent", async (contentId, { rejectWithValue }) => {
  try {
    await api.content.removeContent(contentId);
    toast.success(`Content removed!`);
    return contentId;
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Remove content failed: ${error.message}`);
      throw err;
    }

    toast.error(`Remove content failed: ${error.response.data.error.message}`);
    return rejectWithValue(error.response.data);
  }
});

const contentSlice = createSlice({
  name: "content",
  initialState,
  reducers: {
    resetContentState: () => initialState
  },
  extraReducers: builder => {
    builder.addCase(fetchContent.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(fetchContent.fulfilled, (state, action) => {
      contentAdapter.setAll(state, action.payload);
      state.isLoading = false;
    });
    builder.addCase(fetchContent.rejected, (state, action) => {
      const { meta } = action;
      if (meta.aborted) {
        return;
      }
      state.isLoading = false;
    });
    builder.addCase(fetchContentById.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(fetchContentById.fulfilled, (state, action) => {
      contentAdapter.addOne(state, action.payload);
      state.isLoading = false;
    });
    builder.addCase(fetchContentById.rejected, state => {
      state.isLoading = false;
    });
    builder.addCase(duplicateContent.fulfilled, (state, action) => {
      contentAdapter.addOne(state, action.payload);
    });
    builder.addCase(updateContent.fulfilled, (state, action) => {
      const { id, ...changes } = action.payload;
      contentAdapter.updateOne(state, { id, changes });
    });
    builder.addCase(removeContent.fulfilled, (state, action) => {
      const contentId = action.payload;
      contentAdapter.removeOne(state, contentId);
    });
  }
});

export const {
  reducer,
  actions: { resetContentState }
} = contentSlice;

export const getContentState = (state: RootState) => state.content;

export const { selectAll: selectAllContent, selectById: selectContentById } =
  contentAdapter.getSelectors(getContentState);

export const selectIsLoading = createSelector(getContentState, state => state.isLoading);

export const selectContentOptions = createSelector(selectAllContent, content =>
  content.map(({ name }) => ({ value: name, label: name }))
);

export const selectContentTableData = createSelector(
  selectAllContent,
  selectLanguageOptions,
  (content, languageOptions) =>
    content.map(({ id, name, content, status, updatedAt, active }) => {
      const languages = getLanguagesFilled(languageOptions, content);
      const title = content.en.title || content.en.subject || content.en.text;
      const transformedContent = transform(
        content,
        (result, obj, key) => {
          const stringToSearch = values(obj).join(" ");
          // @ts-ignore
          result[key] = stringToSearch;
        },
        {}
      );

      const contentForSearch = values(transformedContent).join(" ") as string;

      return {
        id,
        name,
        active,
        title,
        languages,
        status,
        updatedAt,
        contentForSearch
      };
    })
);

export const selectLandingsTableData = createSelector(
  selectAllContent,
  selectLanguageOptions,
  (content, languageOptions) =>
    content.map(({ id, externalId, subtype, content, updatedAt, active }) => {
      const languages = getLanguagesFilled(languageOptions, content);
      return {
        id,
        active,
        externalId,
        subtype,
        location: content.location,
        tags: content.tags,
        updatedAt,
        languages
      };
    })
);

export const selectBannersTableData = createSelector(
  selectAllContent,
  selectLanguageOptions,
  (content, languageOptions) =>
    content.map(({ id, externalId, subtype, content, updatedAt, active }) => {
      const languages = getLanguagesFilled(languageOptions, content);
      return {
        id,
        active,
        externalId,
        subtype,
        tags: content.tags,
        languages,
        updatedAt
      };
    })
);

export const selectTournamentsTableData = createSelector(selectAllContent, content =>
  content.map(({ id, active, name, subtype, content, updatedAt }) => {
    return {
      id,
      active,
      name,
      subtype,
      promotion: content.promotion,
      startDate: content.startDate,
      endDate: content.endDate,
      brands: content.brands,
      updatedAt
    };
  })
);

export const selectLocalizationsTableData = createSelector(
  selectAllContent,
  selectLanguageOptions,
  (content, languageOptions) =>
    content.map(({ id, active, name, content, updatedAt }) => {
      const languages = getLanguagesFilled(languageOptions, content);
      return {
        id,
        active,
        name,
        brands: content.brands,
        text: content?.en?.text,
        updatedAt,
        languages
      };
    })
);
