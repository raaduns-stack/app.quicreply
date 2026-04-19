import { useEffect, useState, useCallback } from "react";

type SetValue<T> = T | ((val: T) => T);

function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: SetValue<T>) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.log(error);
    }
    setHasMounted(true);
  }, [key]);

  useEffect(() => {
    if (!hasMounted) return;
    try {
      const valueToStore =
        typeof storedValue === "function"
          ? (storedValue as Function)(storedValue)
          : storedValue;

      const currentVal = window.localStorage.getItem(key);
      const newVal = JSON.stringify(valueToStore);

      if (currentVal !== newVal) {
        window.localStorage.setItem(key, newVal);
        window.dispatchEvent(new CustomEvent('local-storage-update', { detail: { key, value: valueToStore } }));
      }
    } catch (error) {
      console.log(error);
    }
  }, [key, storedValue, hasMounted]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed !== storedValue) {
            setStoredValue(parsed);
          }
        } catch (error) {
          console.error("Error parsing storage change:", error);
        }
      }
    };

    const handleCustomEvent = (e: any) => {
      if (e.detail.key === key && e.detail.value !== storedValue) {
        setStoredValue(e.detail.value);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("local-storage-update", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage-update", handleCustomEvent);
    };
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

export default useLocalStorage;
