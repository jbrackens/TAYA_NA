import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Category } from '@phoenix-ui/api-client/src/prediction-types';

interface CategoryState {
  categories: Category[];
  activeCategory: string | null; // slug
  loading: boolean;
}

const initialState: CategoryState = {
  categories: [],
  activeCategory: null,
  loading: false,
};

const categorySlice = createSlice({
  name: 'category',
  initialState,
  reducers: {
    setCategories(state, action: PayloadAction<Category[]>) {
      state.categories = action.payload;
    },
    setActiveCategory(state, action: PayloadAction<string | null>) {
      state.activeCategory = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const { setCategories, setActiveCategory, setLoading: setCategoryLoading } = categorySlice.actions;
export default categorySlice.reducer;
