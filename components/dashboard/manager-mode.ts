"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "gv_manager_mode";
const EVENT_NAME = "gv_manager_mode_changed";

function getInitialValue(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setManagerMode(value: boolean) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: value }));
}

export function useManagerMode(): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(false);

  useEffect(() => {
    setValue(getInitialValue());

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>;
      setValue(Boolean(customEvent.detail));
    };
    window.addEventListener(EVENT_NAME, handler);

    return () => {
      window.removeEventListener(EVENT_NAME, handler);
    };
  }, []);

  const update = useCallback((nextValue: boolean) => {
    setValue(nextValue);
    setManagerMode(nextValue);
  }, []);

  return [value, update];
}
