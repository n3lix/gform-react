import React from 'react';
// import MUIExample from './mui/MUIExample';
// import NativeExample from './native-html/NativeExample';
// import PrimeReactExample from './prime-react/PrimeReactExample';
import { SCSS_Box, SCSS_Container } from './styled';
import BaseExample from "./base-example";

const App = () => {
    return (
        <SCSS_Container>
            <SCSS_Box>
                <BaseExample />
            </SCSS_Box>

            {/* <SCSS_Box>
                <MUIExample />
            </SCSS_Box>

            <SCSS_Box>
                <PrimeReactExample />
            </SCSS_Box> */}
        </SCSS_Container>
    );
};

export default App;