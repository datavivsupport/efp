import { redirect } from "react-router";
import { store } from "../store/store";
import { fetchUser } from "../store/authSlice";

export const authLoader = async () => {
  const state = store.getState();

  // If already authenticated in Redux
  if (state.auth.isAuthenticated) {
    return null;
  }

  try {
    // Try to fetch user using cookie
    await store.dispatch(fetchUser()).unwrap();
    return null;
  } catch {
    throw redirect("/login");
  }
};