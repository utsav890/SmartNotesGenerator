import { createContext, useContext, useState, useEffect, useCallback } from "react";

const RouterContext = createContext(null);

export function RouterProvider({ children }) {
  const [currentUrl, setCurrentUrl] = useState(() => {
    return window.location.pathname + window.location.search;
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentUrl(window.location.pathname + window.location.search);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((to, options = {}) => {
    if (typeof to !== "string") return;

    if (options.replace) {
      window.history.replaceState({}, "", to);
    } else {
      window.history.pushState({}, "", to);
    }
    setCurrentUrl(window.location.pathname + window.location.search);
    window.scrollTo(0, 0);
  }, []);

  const urlObj = new URL(currentUrl, window.location.origin);
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;

  // Match /lecture/:id pattern
  let routeParams = {};
  const lectureMatch = pathname.match(/^\/lecture\/([^/]+)/);
  if (lectureMatch) {
    routeParams.id = lectureMatch[1];
  }

  const value = {
    pathname,
    searchParams,
    params: routeParams,
    navigate,
    currentUrl
  };

  return (
    <RouterContext.Provider value={value}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within a RouterProvider");
  }
  return context;
}
