import React from "react";
import i18n from "../i18n";

const Context = React.createContext({});

interface Props {
  children: React.ReactNode;
}

export function I18nProvider({ children }: Props) {
  return (
    <Context.Provider value={{ i18n }}>
      {children}
    </Context.Provider>
  );
}

export const useI18n = () => React.useContext(Context);
export default i18n;
