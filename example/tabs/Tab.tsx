import React, {FC, PropsWithChildren, ReactElement} from "react";

interface TabProps extends PropsWithChildren {
    active?: boolean;
    header: ReactElement;
    index: number;
}

export const Tab: FC<TabProps> = ({header, children, index}) => {
    if (!header) throw new Error("Header is required");
    return children;
};

export default Tab;