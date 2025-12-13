// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck
import React, {
    Children,
    useMemo,
    FC,
    ReactElement,
    PropsWithChildren,
    memo, cloneElement, isValidElement, Fragment, ReactNode
} from 'react';
import {TabStoreProvider, useTab, useTabStore} from "./context";


interface TabsRendererProps {
    headersContainer?: ReactElement;
    childrenArray: Array<Exclude<ReactNode, boolean | null | undefined>>
}

const TabsRenderer: FC<TabsRendererProps> = ({childrenArray, headersContainer}) => {
    const setState = useTabStore().setState;
    const activeIndex = useTab((state: any) => state.activeIndex);

    const activeContent = useMemo(() => {
        return childrenArray[activeIndex]?.props.children;
    }, [childrenArray, activeIndex]);

    const headers = useMemo(() => {
        return cloneElement(headersContainer || <Fragment />, {
            children: childrenArray.map((child, index) => {
                if (!isValidElement(child)) return null;

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                const header = child.props.header;
                if (!header) return null;

                const {onClick} = header.props;

                return (
                    cloneElement(header, {
                        key: index,
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error
                        index: child.props.index,
                        onClick: (e) => {
                            if (onClick) onClick(e);
                            setState(prev => ({
                                ...prev,
                                activeIndex: index,
                                [index]: { active: true },
                                [prev.activeIndex]: {
                                    active: false
                                }
                            }));
                        }
                    })
                );
            })
        });
    }, [childrenArray, headersContainer, setState]);

    return (
        <>
            {headers}
            {activeContent}
        </>
    );

};


interface TabsProps extends PropsWithChildren {
    headersContainer?: ReactElement;
}

const Tabs: FC<TabsProps> = ({children, headersContainer}) => {
    const childrenArray = useMemo(() => Children.toArray(children), [children]);

    const initialState = useMemo(() => {
        let activeIndex;
        const allChild = childrenArray.map((child, index) => {
            const active = child.props.active;
            if (typeof active !== 'undefined' && active !== null) {
                activeIndex = index;
            }
            
            return {
                active: index === activeIndex
            };
        });

        if (activeIndex === undefined) {
            allChild[0] = {
                active: true
            };
        }

        return {
            activeIndex: activeIndex || 0,
            ...allChild
        };
    }, [childrenArray]);

    return (
        <TabStoreProvider initialState={initialState}>
            <TabsRenderer childrenArray={childrenArray} headersContainer={headersContainer}/>
        </TabStoreProvider>
    );
};

export default memo(Tabs);