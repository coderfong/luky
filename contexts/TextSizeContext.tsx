import React, { createContext, useContext, useEffect, useState } from 'react';
import { getTextSize, saveTextSize, TextSizePreference } from '../lib/storage';

interface TextSizeContextValue {
  textSize: TextSizePreference;
  setTextSize: (size: TextSizePreference) => Promise<void>;
  scale: number;
}

const TextSizeContext = createContext<TextSizeContextValue>({
  textSize: 'standard',
  setTextSize: async () => {},
  scale: 1,
});

export const TEXT_SIZE_SCALES: Record<TextSizePreference, number> = {
  standard: 1,
  large: 1.2,
  xlarge: 1.4,
};

export function TextSizeProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSizeState] = useState<TextSizePreference>('standard');

  useEffect(() => {
    getTextSize().then(setTextSizeState);
  }, []);

  const setTextSize = async (size: TextSizePreference) => {
    await saveTextSize(size);
    setTextSizeState(size);
  };

  return (
    <TextSizeContext.Provider
      value={{ textSize, setTextSize, scale: TEXT_SIZE_SCALES[textSize] }}
    >
      {children}
    </TextSizeContext.Provider>
  );
}

export function useTextSize() {
  return useContext(TextSizeContext);
}
