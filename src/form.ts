import type { ChangeEvent, FormEvent, InvalidEvent, FocusEvent, EventHandler, FocusEventHandler, ChangeEventHandler, FormEventHandler, SyntheticEvent } from "react";
import type { GInputState, GInputStateMutable } from "./fields";

export type PartialPick<T, P extends keyof T> = Omit<T, P> & Partial<Pick<T, P>>;

export type IForm<T=any> = {
    [key in keyof T]: PartialPick<GInputState<T[key]>, 'checkValidity'>;
};

export type PartialForm<T> = Partial<{ [key in keyof T]: Partial<GInputStateMutable<T[key]>> }>;

export type GDOMElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export type GFormEvent<T = GDOMElement> = FormEvent<T>;
export type GChangeEvent<T = GDOMElement> = ChangeEvent<T> & {value?: unknown};
export type GFocusEvent<T = GDOMElement> = FocusEvent<T>;
export type GInvalidEvent <T = GDOMElement> = InvalidEvent<T>;

export type GFormEventHandler<T = GDOMElement> = FormEventHandler<GFormEvent<T>>;
export type GChangeEventHandler<T = GDOMElement> = ChangeEventHandler<GChangeEvent<T>>;
export type GFocusEventHandler<T = GDOMElement> = FocusEventHandler<GFocusEvent<T>>;
export type GInvalidEventHandler<T = GDOMElement> = EventHandler<SyntheticEvent<T>>;