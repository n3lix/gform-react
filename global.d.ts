declare global {
    namespace globalThis {
        /** 
        * using this constant will be marked as `dead code` by the bundler.
        * 
        * available in `development` mode only.
        * @example
        * if (__DEBUG__) { 
        *   //dead block
        * }
        */
        const __DEBUG__: boolean;
        /**
         * react strict mode.
         * 
         * available in `development` mode only.
         */
        const __STRICT__: boolean;
        /**
         * this constant is used for warnings during development
         */
        const __DEV__: boolean;
    }
}

export {};