import { useEffect, useState } from "react";

type SetValue<T> = T | ((val: T) => T);

function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: SetValue<T>) => void] {
  // State to store our value
  // Pass  initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });

  // useEffect to update local storage when the state changes
  useEffect(() => {
    try {
      const valueToStore =
        typeof storedValue === "function"
          ? (storedValue as Function)(storedValue)
          : storedValue;
      
      const currentVal = window.localStorage.getItem(key);
      const newVal = JSON.stringify(valueToStore);
      
      if (currentVal !== newVal) {
        window.localStorage.setItem(key, newVal);
        // Notify other instances in the same tab
        window.dispatchEvent(new CustomEvent('local-storage-update', { detail: { key, value: valueToStore } }));
      }
    } catch (error) {
      console.log(error);
    }
  }, [key, storedValue]);

  // Sync state between components
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
