import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";

export const useNavigation = (onEnter: any, onExit: any) => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(onEnter());
    return () => {
      dispatch(onExit());
    };
  }, []);
};
