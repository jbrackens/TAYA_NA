import { useLocation } from "react-router-dom";

const useQueryParameter = () => {
  const { search } = useLocation();
  return new URLSearchParams(search);
};
export { useQueryParameter };
