import { createContext, useContext } from "react";
import { useForm } from "./useForm";

export type GContext<T = any> = ReturnType<typeof useForm<T>>;

const gFormContext = createContext<GContext>({
    state: {
        fields: {},
        loading: false
    },
    _updateInputHandler: () => null,
    _validateInputHandler: () => null,
    _dispatchChanges: () => null,
    _createInputChecker: () => false,
    optimized: false,
    key: ''
});

export const useGenericFormContext = () => useContext<GContext>(gFormContext);

export const GFormContextProvider = gFormContext.Provider;